import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000" : "https://api.nanoprofiles.com")).replace(/\/health\/?$/, "").replace(/\/+$/, "");

export function buildUpiLinks({ payeeUpiId, payeeName, amount }) {
  const upid = String(payeeUpiId || "").trim();
  const cleanAmount = Number(amount || 0);
  const name = encodeURIComponent(String(payeeName || "Merchant").trim());
  const baseQuery = `pa=${upid}&pn=${name}&am=${cleanAmount}&cu=INR`;

  return {
    upiIntentUrl: `upi://pay?${baseQuery}`
  };
}

export default function NfcPaymentPanel({ tagCode, previewData, isInlinePreview = false }) {
  const [data, setData] = useState(previewData || null);
  const [loading, setLoading] = useState(!previewData && Boolean(tagCode));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (previewData) {
      setData({
        ...previewData,
        links: buildUpiLinks(previewData)
      });
      setLoading(false);
      return;
    }

    if (!tagCode) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/pay/${encodeURIComponent(tagCode)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`TAG NOT FOUND (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (mounted) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            throw new Error(json.message || "FAILED TO LOAD PAYMENT");
          }
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [tagCode, previewData]);

  const activeData = previewData
    ? { ...previewData, links: buildUpiLinks(previewData) }
    : data;

  const handlePay = (url) => {
    const target = url || activeData?.links?.upiIntentUrl;
    if (target) {
      window.location.href = target;
    }
  };

  const amt = Number(activeData?.amount || 0);
  const formattedAmt = amt.toLocaleString("en-IN");
  const links = activeData?.links || (activeData ? buildUpiLinks(activeData) : {});

  if (loading) {
    return (
      <div style={isInlinePreview ? styles.inlineWrap : styles.pageWrap}>
        <div style={styles.card}>
          <div style={styles.pixelSpinner} />
          <p style={{ color: "#ffffff", fontSize: "10px", marginTop: "12px", fontFamily: '"Press Start 2P", monospace' }}>
            CONNECTING...
          </p>
        </div>
      </div>
    );
  }

  if (error && !isInlinePreview) {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>[ ! ]</div>
          <h2 style={{ color: "#ffffff", fontSize: "12px", margin: "8px 0" }}>TAG INACTIVE</h2>
          <p style={{ color: "#a3a3a3", fontSize: "9px" }}>{error}</p>
          <div style={styles.tagBadge}>TAG: {tagCode}</div>
          <button style={styles.retryBtn} onClick={() => window.location.reload()}>
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={isInlinePreview ? styles.inlineWrap : styles.pageWrap}>
      <div style={{ ...styles.card, ...(isInlinePreview ? styles.cardInline : {}) }}>
        {/* Top Header Pill */}
        {activeData?.tagCode && (
          <div style={styles.headerRow}>
            <div style={styles.tagPill}>
              <span>[{activeData.tagCode}]</span>
            </div>
          </div>
        )}

        {/* Payee Info */}
        <div style={styles.payeeSection}>
          <h2 style={styles.payeeName}>{activeData?.payeeName || "MERCHANT"}</h2>
          {activeData?.title && <p style={styles.tagTitle}>{activeData.title}</p>}
        </div>

        {/* Amount Box */}
        <div style={styles.amountBox}>
          <span style={styles.amountBoxLabel}>TOTAL PAYABLE AMOUNT</span>
          <div style={styles.amountBoxRow}>
            <span style={styles.amountRupee}>₹</span>
            <span style={styles.amountNumber}>{formattedAmt || "0"}</span>
          </div>
          {activeData?.note && <div style={styles.amountNote}>"{activeData.note}"</div>}
        </div>

        {/* Primary Pay with Nano Button */}
        <button
          type="button"
          style={styles.payNowBtn}
          onClick={() => handlePay(links.upiIntentUrl)}
        >
          <span>PAY ₹{formattedAmt} WITH NANO</span>
          <span style={{ fontSize: "14px", marginLeft: "6px" }}>►</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  pageWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000000",
    padding: "16px",
    fontFamily: '"Press Start 2P", monospace',
    boxSizing: "border-box"
  },
  inlineWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "12px 0",
    fontFamily: '"Press Start 2P", monospace',
    boxSizing: "border-box"
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    background: "#000000",
    border: "2px solid #ffffff",
    borderRadius: "0px",
    padding: "24px 20px",
    boxShadow: "6px 6px 0px #ffffff",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box"
  },
  cardInline: {
    maxWidth: "360px",
    boxShadow: "4px 4px 0px #ffffff"
  },
  headerRow: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "16px"
  },
  tagPill: {
    display: "inline-block",
    border: "1px solid #ffffff",
    borderRadius: "0px",
    padding: "4px 10px",
    fontSize: "10px",
    color: "#ffffff",
    letterSpacing: "1px",
    background: "#000000"
  },
  payeeSection: {
    width: "100%",
    textAlign: "center",
    marginBottom: "18px"
  },
  payeeName: {
    fontSize: "clamp(13px, 3.5vw, 15px)",
    lineHeight: "1.5",
    margin: "0 0 6px 0",
    color: "#ffffff",
    letterSpacing: "0px"
  },
  tagTitle: {
    fontSize: "9px",
    lineHeight: "1.6",
    color: "#a3a3a3",
    margin: "0",
    textTransform: "uppercase"
  },
  amountBox: {
    width: "100%",
    background: "#000000",
    border: "2px solid #ffffff",
    borderRadius: "0px",
    padding: "16px 12px",
    textAlign: "center",
    marginBottom: "18px",
    boxShadow: "4px 4px 0px #ffffff",
    boxSizing: "border-box"
  },
  amountBoxLabel: {
    fontSize: "8px",
    letterSpacing: "1px",
    color: "#a3a3a3",
    display: "block",
    marginBottom: "8px"
  },
  amountBoxRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px"
  },
  amountRupee: {
    fontSize: "clamp(18px, 4.5vw, 22px)",
    color: "#ffffff"
  },
  amountNumber: {
    fontSize: "clamp(20px, 5.5vw, 26px)",
    color: "#ffffff",
    letterSpacing: "0px"
  },
  amountNote: {
    fontSize: "8px",
    lineHeight: "1.5",
    color: "#a3a3a3",
    marginTop: "8px",
    textTransform: "uppercase"
  },
  payNowBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    color: "#000000",
    border: "2px solid #ffffff",
    borderRadius: "0px",
    padding: "14px 16px",
    fontSize: "clamp(10px, 2.8vw, 12px)",
    fontFamily: '"Press Start 2P", monospace',
    cursor: "pointer",
    boxShadow: "4px 4px 0px #ffffff",
    transition: "transform 0.1s, box-shadow 0.1s",
    boxSizing: "border-box",
    lineHeight: "1.4"
  },
  pixelSpinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #ffffff",
    borderTopColor: "#000000",
    animation: "spin 0.8s linear infinite"
  },
  errorIcon: {
    fontSize: "18px",
    color: "#ffffff",
    marginBottom: "6px"
  },
  tagBadge: {
    border: "1px solid #ffffff",
    padding: "4px 8px",
    fontSize: "9px",
    color: "#ffffff",
    margin: "8px 0 12px"
  },
  retryBtn: {
    background: "#ffffff",
    border: "2px solid #ffffff",
    color: "#000000",
    padding: "8px 16px",
    fontSize: "9px",
    fontFamily: '"Press Start 2P", monospace',
    cursor: "pointer"
  }
};
