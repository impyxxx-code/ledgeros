import React, { useState, useEffect } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase.js";
import { isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { LOGO } from "../lib/constants.js";
import LOGO_NEW from "../assets/logo-ar-new.png";

// ── AUTH ──────────────────────────────────────────────────────────────────────
// Modernist redesign. All auth logic (Supabase sign-in/up, MFA enrol/verify,
// password recovery, approval checks) is unchanged from the original; only the
// presentation has been restyled. Logo intentionally omitted for now.

// Modernist palette — self-contained (the login is a full-screen takeover, so it
// doesn't rely on the app's global tokens).
const INK = "#201e1d", FG = "#f8f7f5", CREAM = "#f3f2f2";
const ACCENT = "#dd2b0f", ACCENT_TEXT = "#ae1800", RED_HI = "#ff6a4d";
const N400 = "#bab6b6", N500 = "#9b9797", N600 = "#7d7979", N700 = "#605d5d";
const DIVIDER = "#c9c6c4";
const SUCCESS = "#1a7f37", SUCCESS_BG = "#e6f4ea", SUCCESS_TX = "#0f5c28";
const DANGER_BG = "#ffe0d9", DANGER_TX = "#7c1405";
const HEAD = "'Archivo', system-ui, sans-serif";

const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap');
@keyframes mAuthUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
.m-anim { opacity:0; animation: mAuthUp .6s cubic-bezier(.16,1,.3,1) both; }
.m-a1{animation-delay:.05s}.m-a2{animation-delay:.13s}.m-a3{animation-delay:.21s}.m-a4{animation-delay:.30s}
.m-brand-grid::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(248,247,245,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(248,247,245,.035) 1px,transparent 1px);background-size:48px 48px;}
.m-input{width:100%;padding:12px 14px 12px 40px;box-sizing:border-box;background:#fff;border:2px solid ${DIVIDER};border-radius:0;font-size:14px;color:${INK};font-family:${HEAD};outline:none;transition:border-color .15s, box-shadow .15s;}
.m-input:focus{border-color:${ACCENT};box-shadow:0 0 0 3px rgba(221,43,15,.12);}
.m-cta{transition:transform .15s, box-shadow .15s, background .15s;}
.m-cta:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(221,43,15,.28);}
.m-cta:active{transform:translateY(0);box-shadow:none;}
.m-cta svg{transition:transform .18s ease-out;}
.m-cta:hover svg{transform:translateX(3px);}
.m-link{transition:color .12s;cursor:pointer;background:none;border:none;padding:0;font-family:${HEAD};}
.m-link:hover{text-decoration:underline;text-underline-offset:3px;}
.m-code{width:100%;padding:14px;border:2px solid ${DIVIDER};border-radius:0;font-size:28px;font-weight:800;letter-spacing:8px;text-align:center;outline:none;color:${INK};font-family:${HEAD};font-variant-numeric:tabular-nums;box-sizing:border-box;}
.m-code:focus{border-color:${ACCENT};}
@media (prefers-reduced-motion: reduce){ .m-anim{opacity:1;animation:none;} .m-cta:hover{transform:none;box-shadow:none;} .m-cta:hover svg{transform:none;} }
`;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const MailIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 6 9 7 9-7" /></svg>);
const LockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
const UserIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
const EyeIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
const EyeOffIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.1-.9" /><path d="m3 3 18 18" /></svg>);
const ArrowIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
const smI = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
const LockSm = () => (<svg width="13" height="13" viewBox="0 0 24 24" {...smI}><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
const ShieldSm = () => (<svg width="13" height="13" viewBox="0 0 24 24" {...smI}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="m9 12 2 2 4-4" /></svg>);
const ServerSm = () => (<svg width="13" height="13" viewBox="0 0 24 24" {...smI}><rect x="3" y="4" width="18" height="7" rx="1" /><rect x="3" y="13" width="18" height="7" rx="1" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>);
const TRUST = [{ label: "256-bit SSL", Icon: LockSm }, { label: "Supabase auth", Icon: ShieldSm }, { label: "UK servers", Icon: ServerSm }];

// ┌────────────────────────────────────────────────────────────┐
// │ Auth                                                       │
// │ Login / Signup page                                        │
// └────────────────────────────────────────────────────────────┘
export function Auth({ onAuth, sessionExpired }) {
  const [mode, setMode] = useState("signin");
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(sessionExpired ? "Your session has expired — please sign in again." : "");
  const [showPw, setShowPw] = useState(false);
  const [mfaStep, setMfaStep] = useState("none"); // "none" | "enroll" | "verify"
  const [mfaCode, setMfaCode] = useState("");
  const [mfaErr, setMfaErr] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaSession, setMfaSession] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const hash = window.location.hash;
    return hash.includes("type=recovery");
  });
  const [recoveryToken] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#","?"));
      const token = params.get("access_token");
      if (token) window.history.replaceState(null,"",window.location.pathname);
      return token || "";
    }
    return "";
  });
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const submitNewPassword = async () => {
    if (newPw.length < 12) { setErr("Password must be at least 12 characters."); return; }
    if (!/[0-9]/.test(newPw)) { setErr("Password must contain at least one number."); return; }
    if (!/[^A-Za-z0-9]/.test(newPw)) { setErr("Password must contain at least one special character."); return; }
    if (newPw !== confirmPw) { setErr("Passwords do not match."); return; }
    setLoading(true);
    const res = await sb.updatePassword(recoveryToken, newPw);
    if (res.id || res.email) { setErr("✓ Password updated — you can now sign in."); setRecoveryMode(false); setNewPw(""); setConfirmPw(""); }
    else { setErr("Failed — the reset link may have expired. Request a new one."); }
    setLoading(false);
  };

  const go = async () => {
    setLoading(true); setErr("");
    try {
      const d = mode === "signin"
        ? await sb.signIn(f.email, f.password)
        : await sb.signUp(f.email, f.password, f.full_name, f.role);
      if (d.access_token) {
        if (mode === "signup") {
          setMode("signin");
          setErr("✓ Account created! Please wait for admin approval before signing in.");
          setLoading(false);
          return;
        }
        try {
          const profileRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${d.user.id}&select=approved,role`,
            { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${d.access_token}` } }
          );
          const profiles = await profileRes.json();
          const profile = profiles?.[0];
          if (!profile) { setErr("Account profile not found. Please contact the administrator."); setLoading(false); return; }
          if (profile.role !== "admin" && profile.approved !== true) {
            setErr(profile.approved === false
              ? "Your account access has been revoked. Please contact the administrator."
              : "Your account is pending admin approval. You will be notified once approved.");
            setLoading(false); return;
          }
        } catch (approvalErr) { console.warn("Approval check failed:", approvalErr); }
        // ── MFA check ──
        let factors = [];
        try { const ur = await sb.mfaGetUser(d.access_token); factors = Array.isArray(ur.factors) ? ur.factors : []; } catch {}
        const verifiedTotp = factors.find(f => f.factor_type === "totp" && f.status === "verified");
        if (verifiedTotp) {
          // User has verified MFA → challenge them
          const ch = await sb.mfaChallenge(d.access_token, verifiedTotp.id);
          if (!ch.id) { setErr("MFA challenge failed. Please try again."); setLoading(false); return; }
          setMfaSession(d);
          setMfaFactorId(verifiedTotp.id);
          setMfaChallengeId(ch.id);
          setMfaStep("verify");
          setLoading(false);
          return;
        } else {
          // No verified MFA → delete any pending unverified factors then force fresh enrollment
          const unverified = factors.filter(f => f.factor_type === "totp" && f.status === "unverified");
          await Promise.all(unverified.map(f => sb.mfaUnenroll(d.access_token, f.id)));
          const enroll = await sb.mfaEnroll(d.access_token);
          if (!enroll.id) { setErr("MFA setup failed. Please try again."); setLoading(false); return; }
          setMfaSession(d);
          setMfaFactorId(enroll.id);
          setMfaQr(enroll.totp?.qr_code || "");
          setMfaSecret(enroll.totp?.secret || "");
          setMfaStep("enroll");
          setLoading(false);
          return;
        }
        // (unreachable — kept for structure)
        logAudit(d.access_token, d.user.id, "user_login", "user", d.user.id, `${d.user.email} signed in`);
        if (d.refresh_token) localStorage.setItem('ledgeros_rt', d.refresh_token);
        onAuth({ token: d.access_token, user: d.user });
      } else {
        setErr(d.msg || d.error_description || "Authentication failed.");
      }
    } catch { setErr("Network error. Please try again."); }
    setLoading(false);
  };

  const sendReset = async () => {
    if (!f.email) { setErr("Enter your email address first."); return; }
    setLoading(true);
    await sb.resetPassword(f.email);
    setErr("✓ Reset email sent — check your inbox.");
    setLoading(false);
  };

  const verifyMfa = async () => {
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !/^\d+$/.test(code)) { setMfaErr("Enter the 6-digit code from your authenticator app."); return; }
    setMfaLoading(true); setMfaErr("");
    const res = await sb.mfaVerify(mfaSession.access_token, mfaFactorId, mfaChallengeId, code);
    if (res.access_token) {
      const d = res;
      logAudit(d.access_token, mfaSession.user.id, "user_login", "user", mfaSession.user.id, `${mfaSession.user.email} signed in (MFA)`);
      if (d.refresh_token) localStorage.setItem('ledgeros_rt', d.refresh_token);
      onAuth({ token: d.access_token, user: mfaSession.user });
    } else {
      setMfaErr("Incorrect code — please try again.");
      // Create a new challenge for the next attempt
      try {
        const ch = await sb.mfaChallenge(mfaSession.access_token, mfaFactorId);
        if (ch.id) setMfaChallengeId(ch.id);
      } catch {}
    }
    setMfaCode("");
    setMfaLoading(false);
  };

  const confirmEnrollment = async () => {
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !/^\d+$/.test(code)) { setMfaErr("Enter the 6-digit code shown in your authenticator app."); return; }
    setMfaLoading(true); setMfaErr("");
    // Create challenge for the unverified factor
    const ch = await sb.mfaChallenge(mfaSession.access_token, mfaFactorId);
    if (!ch.id) { setMfaErr("Challenge failed. Please reload and try again."); setMfaLoading(false); return; }
    const res = await sb.mfaVerify(mfaSession.access_token, mfaFactorId, ch.id, code);
    if (res.access_token) {
      const d = res;
      logAudit(d.access_token, mfaSession.user.id, "user_login", "user", mfaSession.user.id, `${mfaSession.user.email} signed in (MFA enrolled)`);
      if (d.refresh_token) localStorage.setItem('ledgeros_rt', d.refresh_token);
      onAuth({ token: d.access_token, user: mfaSession.user });
    } else {
      setMfaErr("Incorrect code — scan the QR code again and enter the 6-digit number.");
    }
    setMfaCode("");
    setMfaLoading(false);
  };

  // Auto-submit the instant a valid 6-digit code is typed — no button press needed
  useEffect(() => {
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !/^\d+$/.test(code) || mfaLoading) return;
    if (mfaStep === "verify") verifyMfa();
    else if (mfaStep === "enroll") confirmEnrollment();
  }, [mfaCode, mfaStep]);

  const mob = isMobile();
  const isSuccess = err.startsWith("✓");

  // Shared ink-ground card wrapper for the 2FA / recovery screens.
  const Card = ({ icon, title, subtitle, children }) => (
    <div style={{ minHeight: "100vh", background: INK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: HEAD }}>
      <div style={{ width: "100%", maxWidth: 400, background: CREAM, border: `2px solid ${INK}`, padding: "34px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, background: INK, color: CREAM, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 18, lineHeight: 1.15, color: INK }}>{title}</div>
            <div style={{ fontSize: 12.5, color: N700, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  const errBox = err && (
    <div role="alert" style={{ fontSize: 13, padding: "10px 14px", marginBottom: 14, background: isSuccess ? SUCCESS_BG : DANGER_BG, color: isSuccess ? SUCCESS_TX : DANGER_TX, border: `1px solid ${isSuccess ? SUCCESS : "#e15b47"}` }}>
      {isSuccess ? err.slice(2) : err}
    </div>
  );

  // ── Set new password (recovery via emailed link) ──
  if (recoveryMode) return (
    <>
      <style>{AUTH_CSS}</style>
      <Card icon={<LockIcon />} title="Set new password" subtitle="Choose a new password for your account.">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)} className="m-input" style={{ paddingLeft: 14 }} />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="m-input" style={{ paddingLeft: 14 }} onKeyDown={e => e.key === "Enter" && submitNewPassword()} />
          {errBox}
          <div style={{ fontSize: 11.5, color: N600 }}>Min 12 characters, with a number and a special character.</div>
          <button className="m-cta" onClick={submitNewPassword} disabled={loading} style={{ width: "100%", background: ACCENT, color: "#fff", border: "none", borderRadius: 0, padding: "13px", fontSize: 14, fontWeight: 800, fontFamily: HEAD, cursor: loading ? "not-allowed" : "pointer" }}>{loading ? "Updating…" : "Set new password"}</button>
        </div>
      </Card>
    </>
  );

  // ── 2FA verify ──
  if (mfaStep === "verify") return (
    <>
      <style>{AUTH_CSS}</style>
      <Card icon={<LockIcon />} title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input autoFocus type="text" inputMode="numeric" maxLength={7} placeholder="000 000" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/[^\d\s]/g, ""))} onKeyDown={e => e.key === "Enter" && verifyMfa()} className="m-code" />
          {mfaErr && <div role="alert" style={{ fontSize: 13, color: DANGER_TX, background: DANGER_BG, padding: "8px 12px", textAlign: "center" }}>{mfaErr}</div>}
          <button className="m-cta" onClick={verifyMfa} disabled={mfaLoading} style={{ width: "100%", background: ACCENT, color: "#fff", border: "none", borderRadius: 0, padding: "13px", fontSize: 14, fontWeight: 800, fontFamily: HEAD, cursor: "pointer", opacity: mfaLoading ? 0.7 : 1 }}>{mfaLoading ? "Verifying…" : "Verify & sign in"}</button>
          <button onClick={() => { setMfaStep("none"); setMfaCode(""); setMfaErr(""); }} className="m-link" style={{ color: N700, fontSize: 13, fontWeight: 700, textAlign: "left" }}>← Back to sign in</button>
        </div>
      </Card>
    </>
  );

  // ── 2FA enrol ──
  if (mfaStep === "enroll") return (
    <>
      <style>{AUTH_CSS}</style>
      <Card icon={<LockIcon />} title="Set up two-factor auth" subtitle="Scan the code with Google Authenticator, Authy, or any TOTP app.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mfaQr ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 16, border: `1px solid ${DIVIDER}`, background: "#fff" }}>
              <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mfaQr)}`} alt="MFA QR Code" width={180} height={180} style={{ display: "block" }} />
              {mfaSecret && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: N600, marginBottom: 4 }}>Or enter manually:</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: 2, fontFamily: "monospace", background: "#eae9e9", padding: "4px 10px" }}>{mfaSecret}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 20, color: N600 }}>Loading QR code…</div>
          )}
          <div style={{ fontSize: 12.5, color: N700, padding: "10px 14px", background: "#f8f4f4" }}>Once scanned, enter the 6-digit code below to confirm setup.</div>
          <input autoFocus type="text" inputMode="numeric" maxLength={7} placeholder="000 000" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/[^\d\s]/g, ""))} onKeyDown={e => e.key === "Enter" && confirmEnrollment()} className="m-code" />
          {mfaErr && <div role="alert" style={{ fontSize: 13, color: DANGER_TX, background: DANGER_BG, padding: "8px 12px", textAlign: "center" }}>{mfaErr}</div>}
          <button className="m-cta" onClick={confirmEnrollment} disabled={mfaLoading} style={{ width: "100%", background: ACCENT, color: "#fff", border: "none", borderRadius: 0, padding: "13px", fontSize: 14, fontWeight: 800, fontFamily: HEAD, cursor: "pointer", opacity: mfaLoading ? 0.7 : 1 }}>{mfaLoading ? "Confirming…" : "Confirm & activate 2FA"}</button>
          <button onClick={() => { setMfaStep("none"); setMfaCode(""); setMfaErr(""); }} className="m-link" style={{ color: N700, fontSize: 13, fontWeight: 700, textAlign: "left" }}>← Back to sign in</button>
        </div>
      </Card>
    </>
  );

  const iconWrap = { position: "relative", display: "flex", alignItems: "center" };
  const iconLeft = { position: "absolute", left: 14, color: N600, display: "flex", pointerEvents: "none" };
  const fieldLabel = { display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: N700, marginBottom: 7, fontFamily: HEAD };

  // ── Sign in / request access (split) ──
  return (
    <>
      <style>{AUTH_CSS}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: mob ? "column" : "row", fontFamily: HEAD, background: CREAM }}>

        {/* ── LEFT / TOP BRAND PANEL (ink) ── */}
        <div className="m-brand-grid" style={mob
          ? { background: INK, color: FG, padding: "28px 24px 32px", position: "relative", overflow: "hidden", flexShrink: 0 }
          : { width: 460, minWidth: 460, background: INK, color: FG, padding: "44px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>

          {/* wordmark + (mobile) live badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 19, letterSpacing: "-.01em" }}>LedgerOS</div>
            {mob && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(127,211,155,.16)", color: "#7fd39b", fontSize: 10, fontWeight: 700, padding: "3px 9px", textTransform: "uppercase", letterSpacing: ".5px" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7fd39b" }} /> Live
              </span>
            )}
          </div>

          {/* hero */}
          <div style={{ position: "relative", zIndex: 1, padding: mob ? "22px 0 0" : "40px 0" }}>
            {/* Logo intentionally omitted for now — to revisit. */}
            <div className="m-anim m-a1" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: N400, marginBottom: mob ? 14 : 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
              Business Finance Platform
            </div>
            <h1 className="m-anim m-a2" style={{ fontFamily: HEAD, fontWeight: 800, fontSize: mob ? 28 : "clamp(34px, 4.4vw, 50px)", lineHeight: 1.03, letterSpacing: "-.02em", margin: 0 }}>
              Run every invoice.<br />
              Know every <span style={{ color: RED_HI }}>number.</span>
            </h1>
            {!mob && (
              <p className="m-anim m-a3" style={{ fontSize: 14, color: "rgba(248,247,245,.6)", lineHeight: 1.7, maxWidth: 340, marginTop: 20 }}>
                Everything your retail business needs. Invoicing, inventory, deliveries and real-time insights, connected in one platform.
              </p>
            )}
          </div>

          {!mob && <div style={{ fontSize: 11, color: "rgba(248,247,245,.3)", position: "relative", zIndex: 1 }}>© 2026 Arkham Retail Ltd</div>}
        </div>

        {/* ── FORM PANEL ── */}
        <div style={{ flex: 1, display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "center", padding: mob ? "28px 24px 40px" : "48px 40px", background: CREAM }}>
          <div className="m-anim m-a3" style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: N600, marginBottom: 10 }}>Arkham Retail Ltd</div>
            <h2 style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, letterSpacing: "-.02em", margin: "0 0 8px", color: INK }}>{mode === "signin" ? "Welcome back" : "Request access"}</h2>
            <p style={{ fontSize: 13.5, color: N700, margin: "0 0 26px" }}>{mode === "signin" ? "Sign in to your Arkham Retail dashboard" : "Join your team on LedgerOS"}</p>

            {errBox}

            {mode === "signup" && (
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabel}>Full name</label>
                <div style={iconWrap}>
                  <span style={iconLeft}><UserIcon /></span>
                  <input className="m-input" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Email address</label>
              <div style={iconWrap}>
                <span style={iconLeft}><MailIcon /></span>
                <input className="m-input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@arkhamretail.com" />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <label style={{ ...fieldLabel, marginBottom: 0 }}>Password</label>
                {mode === "signin" && <button onClick={sendReset} className="m-link" style={{ fontSize: 12, fontWeight: 600, color: ACCENT_TEXT }}>Forgot password?</button>}
              </div>
              <div style={iconWrap}>
                <span style={iconLeft}><LockIcon /></span>
                <input className="m-input" type={showPw ? "text" : "password"} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Enter your password" style={{ paddingRight: 42 }} onKeyDown={e => e.key === "Enter" && go()} />
                <button onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: N600, display: "flex", padding: 2 }}>
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button onClick={go} disabled={loading} className="m-cta" style={{ width: "100%", padding: "13px", background: loading ? "#e07a63" : ACCENT, color: "#fff", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 0, cursor: loading ? "not-allowed" : "pointer", fontFamily: HEAD, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading
                ? <><span className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} />Please wait…</>
                : <>{mode === "signin" ? "Sign in to dashboard" : "Request access"} <ArrowIcon /></>}
            </button>

            <div style={{ textAlign: "center", fontSize: 13, color: N700, marginTop: 22 }}>
              {mode === "signin"
                ? <>Don't have an account? <button onClick={() => { setMode("signup"); setErr(""); }} className="m-link" style={{ color: ACCENT_TEXT, fontWeight: 700, fontSize: 13 }}>Request access</button></>
                : <>Have an account? <button onClick={() => { setMode("signin"); setErr(""); }} className="m-link" style={{ color: ACCENT_TEXT, fontWeight: 700, fontSize: 13 }}>Sign in</button></>}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 22, flexWrap: "wrap", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${DIVIDER}` }}>
              {TRUST.map(({ label, Icon }) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: N600 }}><Icon />{label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
