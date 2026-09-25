import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000" : "https://api.nanoprofiles.com")).replace(/\/health\/?$/, "").replace(/\/+$/, "");

export function buildUpiLinks({ payeeUpiId, amount }) {
  const upid = String(payeeUpiId || "").trim();
  const cleanAmount = Number(amount || 0);
  const baseQuery = `pa=${upid}&am=${cleanAmount}&cu=INR`;

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
        if (!res.ok) throw new Error(`Tag not found or inactive (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (mounted) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            throw new Error(json.message || "Failed to load payment details");
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

  if (loading) {
    return (
      <div style={isInlinePreview ? styles.inlineWrap : styles.pageWrap}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "12px" }}>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !isInlinePreview) {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={{ color: "#ffffff", margin: "8px 0 4px" }}>Payment Tag Inactive</h2>
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>{error}</p>
          <div style={styles.tagBadge}>Tag: {tagCode}</div>
          <button style={styles.retryBtn} onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const amt = Number(activeData?.amount || 0);
  const formattedAmt = amt.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const links = activeData?.links || (activeData ? buildUpiLinks(activeData) : {});

  return (
    <div style={isInlinePreview ? styles.inlineWrap : styles.pageWrap}>
      <div style={{ ...styles.card, ...(isInlinePreview ? styles.cardInline : {}) }}>
        {/* Top Header Pill */}
        {activeData?.tagCode && (
          <div style={styles.headerRow}>
            <div style={styles.tagPill}>
              <span style={{ fontSize: "11px" }}>📶</span>
              <span>{activeData.tagCode}</span>
            </div>
          </div>
        )}

        {/* Payee Info */}
        <div style={styles.payeeSection}>
          <h2 style={styles.payeeName}>{activeData?.payeeName || "Merchant Name"}</h2>
          {activeData?.title && <p style={styles.tagTitle}>{activeData.title}</p>}
        </div>

        {/* Amount Display */}
        <div style={styles.amountBox}>
          <span style={styles.amountBoxLabel}>Total Payable Amount</span>
          <div style={styles.amountBoxRow}>
            <span style={styles.amountRupee}>₹</span>
            <span style={styles.amountNumber}>{formattedAmt || "0"}</span>
          </div>
          {activeData?.note && <div style={styles.amountNote}>"{activeData.note}"</div>}
        </div>

        {/* Primary Pay Button */}
        <button
          type="button"
          style={styles.payNowBtn}
          onClick={() => handlePay(links.upiIntentUrl)}
        >
          <span>Pay ₹{formattedAmt} with UPI</span>
          <span style={{ fontSize: "18px" }}>↗</span>
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
    background: "linear-gradient(135deg, #090d16 0%, #0f172a 100%)",
    padding: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  inlineWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "12px 0",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    background: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "22px",
    padding: "24px 20px",
    boxShadow: "0 20px 45px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.15)",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box"
  },
  cardInline: {
    maxWidth: "360px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
    border: "2px solid #6366f1"
  },
  headerRow: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "16px"
  },
  tagPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.35)",
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#a5b4fc"
  },
  payeeSection: {
    width: "100%",
    textAlign: "center",
    marginBottom: "18px"
  },
  payeeName: {
    fontSize: "1.45rem",
    fontWeight: 700,
    margin: "0 0 2px 0",
    color: "#ffffff",
    letterSpacing: "-0.2px"
  },
  tagTitle: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "0"
  },
  amountBox: {
    width: "100%",
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    borderRadius: "16px",
    padding: "18px 12px",
    textAlign: "center",
    marginBottom: "18px",
    boxSizing: "border-box"
  },
  amountBoxLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#94a3b8",
    fontWeight: 600,
    display: "block",
    marginBottom: "4px"
  },
  amountBoxRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px"
  },
  amountRupee: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#818cf8"
  },
  amountNumber: {
    fontSize: "2.5rem",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-1px"
  },
  amountNote: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "6px",
    fontStyle: "italic"
  },
  payNowBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "14px",
    padding: "15px 18px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
    boxSizing: "border-box"
  },
  spinner: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "3px solid rgba(99, 102, 241, 0.2)",
    borderTopColor: "#6366f1",
    animation: "spin 1s linear infinite"
  },
  errorIcon: {
    fontSize: "36px"
  },
  tagBadge: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "12px",
    color: "#f87171",
    margin: "8px 0 12px"
  },
  retryBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "6px 14px",
    fontSize: "12px",
    cursor: "pointer"
  }
};
