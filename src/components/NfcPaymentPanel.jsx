import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000" : "https://api.nanoprofiles.com")).replace(/\/health\/?$/, "").replace(/\/+$/, "");

export function buildUpiLinks({ payeeUpiId, payeeName, amount, note, tagCode }) {
  const cleanAmount = Number(amount || 0).toFixed(2);
  const cleanNote = (note || `Payment for ${tagCode || "NFC"}`).slice(0, 50);
  const txnRef = `${(tagCode || "PAY").replace(/[^A-Za-z0-9]/g, "")}-${Date.now().toString().slice(-6)}`;

  const params = new URLSearchParams({
    pa: payeeUpiId || "",
    pn: payeeName || "Merchant",
    am: cleanAmount,
    cu: "INR",
    tn: cleanNote,
    tr: txnRef
  });

  const qs = params.toString();
  return {
    upiIntentUrl: `upi://pay?${qs}`,
    gpayUrl: `tez://upi/pay?${qs}`,
    phonepeUrl: `phonepe://pay?${qs}`,
    paytmUrl: `paytmmp://pay?${qs}`,
    bhimUrl: `upi://pay?${qs}`,
    qrPayload: `upi://pay?${qs}`
  };
}

export default function NfcPaymentPanel({ tagCode, previewData, isInlinePreview = false }) {
  const [data, setData] = useState(previewData || null);
  const [loading, setLoading] = useState(!previewData && Boolean(tagCode));
  const [error, setError] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showQr, setShowQr] = useState(false);

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

  const handleCopyUpi = () => {
    if (!activeData?.payeeUpiId) return;
    navigator.clipboard.writeText(activeData.payeeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

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
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(links.qrPayload || "")}`;

  return (
    <div style={isInlinePreview ? styles.inlineWrap : styles.pageWrap}>
      <div style={{ ...styles.card, ...(isInlinePreview ? styles.cardInline : {}) }}>
        {/* Top Header Pill */}
        <div style={styles.headerRow}>
          <div style={styles.verifiedPill}>
            <span style={{ fontSize: "12px" }}>🛡️</span>
            <span>Verified Payee</span>
          </div>
          <div style={styles.tagPill}>
            <span style={{ fontSize: "11px" }}>📶</span>
            <span>{activeData?.tagCode || "TAP-TAG"}</span>
          </div>
        </div>

        {/* Payee Info */}
        <div style={styles.payeeSection}>
          <h2 style={styles.payeeName}>{activeData?.payeeName || "Merchant Name"}</h2>
          {activeData?.title && <p style={styles.tagTitle}>{activeData.title}</p>}

          <div style={styles.upiRow} onClick={handleCopyUpi} title="Click to copy UPI ID">
            <span style={styles.upiLabel}>UPI:</span>
            <span style={styles.upiId}>{activeData?.payeeUpiId || "payee@bank"}</span>
            <button style={styles.copyBtn} type="button" aria-label="Copy UPI ID">
              {copiedUpi ? "✓" : "📋"}
            </button>
          </div>
          {copiedUpi && <div style={styles.copiedText}>Copied to clipboard!</div>}
        </div>

        {/* Small Panel Amount Display */}
        <div style={styles.amountBox}>
          <span style={styles.amountBoxLabel}>Amount to Pay</span>
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

        {/* 1-Tap App Selectors */}
        <div style={styles.appsSection}>
          <span style={styles.appsSectionTitle}>Or pay directly via app:</span>
          <div style={styles.appsGrid}>
            <button
              type="button"
              style={{ ...styles.appButton, borderColor: "#5f259f", color: "#a855f7" }}
              onClick={() => handlePay(links.phonepeUrl)}
            >
              PhonePe
            </button>
            <button
              type="button"
              style={{ ...styles.appButton, borderColor: "#4285F4", color: "#60a5fa" }}
              onClick={() => handlePay(links.gpayUrl)}
            >
              Google Pay
            </button>
            <button
              type="button"
              style={{ ...styles.appButton, borderColor: "#00BAF2", color: "#38bdf8" }}
              onClick={() => handlePay(links.paytmUrl)}
            >
              Paytm
            </button>
            <button
              type="button"
              style={{ ...styles.appButton, borderColor: "#22c55e", color: "#4ade80" }}
              onClick={() => handlePay(links.bhimUrl)}
            >
              BHIM / Any
            </button>
          </div>
        </div>

        {/* QR Code fallback */}
        <div style={styles.qrSection}>
          <button
            type="button"
            style={styles.qrToggleBtn}
            onClick={() => setShowQr(!showQr)}
          >
            {showQr ? "Hide QR Code" : "Show UPI QR Code"}
          </button>
          {showQr && (
            <div style={styles.qrCard}>
              <img src={qrUrl} alt="UPI QR Code" style={styles.qrImg} />
              <p style={styles.qrText}>Scan using any UPI app to pay</p>
            </div>
          )}
        </div>

        {/* Security badge */}
        <div style={styles.securityRow}>
          <span>🔒 NPCI Secure UPI Payment • Instant Confirmation</span>
        </div>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  verifiedPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.35)",
    borderRadius: "20px",
    padding: "3px 9px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#34d399"
  },
  tagPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.35)",
    borderRadius: "20px",
    padding: "3px 9px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#a5b4fc"
  },
  payeeSection: {
    width: "100%",
    textAlign: "center",
    marginBottom: "18px"
  },
  payeeName: {
    fontSize: "1.35rem",
    fontWeight: 700,
    margin: "0 0 2px 0",
    color: "#ffffff",
    letterSpacing: "-0.2px"
  },
  tagTitle: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: "0 0 6px 0"
  },
  upiRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "12px"
  },
  upiLabel: {
    color: "#64748b",
    fontWeight: 600
  },
  upiId: {
    color: "#e2e8f0",
    fontWeight: 600
  },
  copyBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: 0,
    fontSize: "12px"
  },
  copiedText: {
    fontSize: "11px",
    color: "#10b981",
    marginTop: "4px"
  },
  amountBox: {
    width: "100%",
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    borderRadius: "16px",
    padding: "16px 12px",
    textAlign: "center",
    marginBottom: "16px",
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
    fontSize: "2.4rem",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-1px"
  },
  amountNote: {
    fontSize: "11px",
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
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
    marginBottom: "16px",
    boxSizing: "border-box"
  },
  appsSection: {
    width: "100%",
    marginBottom: "14px"
  },
  appsSectionTitle: {
    display: "block",
    textAlign: "center",
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  appsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px"
  },
  appButton: {
    background: "rgba(30, 41, 59, 0.7)",
    border: "1px solid",
    borderRadius: "10px",
    padding: "9px 8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center"
  },
  qrSection: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "12px"
  },
  qrToggleBtn: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    color: "#94a3b8",
    padding: "6px 12px",
    fontSize: "11px",
    cursor: "pointer"
  },
  qrCard: {
    marginTop: "10px",
    background: "#ffffff",
    padding: "10px",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  qrImg: {
    width: "160px",
    height: "160px",
    display: "block"
  },
  qrText: {
    fontSize: "10px",
    color: "#475569",
    marginTop: "6px",
    margin: "6px 0 0"
  },
  securityRow: {
    fontSize: "10px",
    color: "#64748b",
    textAlign: "center",
    marginTop: "4px"
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
