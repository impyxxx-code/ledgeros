import React, { useState } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase.js";
import { isMobile } from "../lib/utils.js";
import { logAudit } from "../lib/audit.js";
import { LOGO } from "../lib/constants.js";
import LOGO_NEW from "../assets/logo-ar-new.png";

// ── AUTH ──────────────────────────────────────────────────────────────────────

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

  const mob = isMobile();
  const isSuccess = err.startsWith("✓");

  if (recoveryMode) return (
    <div style={{ minHeight:"100vh",background:"#f4f6f9",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:32,maxWidth:400,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ width:44,height:44,background:"linear-gradient(145deg,#4338ca,#6d28d9)",border:"1px solid rgba(165,180,252,.4)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,boxShadow:"0 4px 24px rgba(129,140,248,.55),inset 0 1px 0 rgba(255,255,255,.18)" }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none"><rect x="10" y="13" width="28" height="3" rx="1.5" fill="#fff"/><rect x="10" y="20" width="20" height="3" rx="1.5" fill="#fff" fillOpacity=".75"/><rect x="30" y="21" width="2.5" height="12" rx="1.25" fill="#c4b5fd"/><polygon points="36,26 30,21 30,33" fill="#c4b5fd" fillOpacity=".7"/></svg>
        </div>
        <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4 }}>Set New Password</div>
        <div style={{ fontSize:13,color:"#64748b",marginBottom:24 }}>Choose a new password for your account.</div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <input type="password" placeholder="New password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{ padding:"10px 14px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",color:"#0f172a" }} />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} style={{ padding:"10px 14px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",color:"#0f172a" }} onKeyDown={e=>e.key==="Enter"&&submitNewPassword()} />
          {err && <div style={{ fontSize:13,color:err.startsWith("✓")?"#16a34a":"#dc2626",padding:"8px 12px",background:err.startsWith("✓")?"#f0fdf4":"#fef2f2",borderRadius:6 }}>{err}</div>}
          <button onClick={submitNewPassword} disabled={loading} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer" }}>{loading?"Updating...":"Set New Password"}</button>
        </div>
      </div>
    </div>
  );

  // ── MFA screens ──
  const MfaCard = ({ title, subtitle, children }) => (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#fff",borderRadius:20,padding:"40px 36px",maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:28 }}>
          <div style={{ width:44,height:44,background:"linear-gradient(135deg,#1e1b4b,#2d1f6e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="#818cf8"/></svg>
          </div>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>{title}</div>
            <div style={{ fontSize:13,color:"#64748b",marginTop:2 }}>{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (mfaStep === "verify") return (
    <MfaCard title="Two-Factor Authentication" subtitle="Enter the 6-digit code from your authenticator app.">
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          maxLength={7}
          placeholder="000 000"
          value={mfaCode}
          onChange={e=>setMfaCode(e.target.value.replace(/[^\d\s]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&verifyMfa()}
          style={{ padding:"14px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:28,fontWeight:700,letterSpacing:8,textAlign:"center",outline:"none",color:"#0f172a",fontVariantNumeric:"tabular-nums" }}
        />
        {mfaErr && <div style={{ fontSize:13,color:"#dc2626",padding:"8px 12px",background:"#fef2f2",borderRadius:6,textAlign:"center" }}>{mfaErr}</div>}
        <button onClick={verifyMfa} disabled={mfaLoading} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",transition:"opacity .15s",opacity:mfaLoading?.7:1 }}>
          {mfaLoading ? "Verifying…" : "Verify & Sign In"}
        </button>
        <button onClick={()=>{setMfaStep("none");setMfaCode("");setMfaErr("");}} className="blink" style={{ color:"#64748b",fontSize:13 }}>
          ← Back to sign in
        </button>
      </div>
    </MfaCard>
  );

  if (mfaStep === "enroll") return (
    <MfaCard title="Set Up Two-Factor Auth" subtitle="Scan the QR code with Google Authenticator, Authy, or any TOTP app.">
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {mfaQr ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"16px",background:"#f8fafc",borderRadius:12,border:"1px solid #e2e8f0" }}>
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mfaQr)}`} alt="MFA QR Code" width={180} height={180} style={{ borderRadius:8,display:"block" }} />
            {mfaSecret && (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11,color:"#94a3b8",marginBottom:4 }}>Or enter manually:</div>
                <div style={{ fontSize:13,fontWeight:700,color:"#0f172a",letterSpacing:2,fontFamily:"monospace",background:"#e2e8f0",padding:"4px 10px",borderRadius:6 }}>{mfaSecret}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign:"center",padding:20,color:"#64748b" }}>Loading QR code…</div>
        )}
        <div style={{ fontSize:13,color:"#475569",padding:"10px 14px",background:"#f1f5f9",borderRadius:8 }}>
          Once scanned, enter the 6-digit code below to confirm setup.
        </div>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          maxLength={7}
          placeholder="000 000"
          value={mfaCode}
          onChange={e=>setMfaCode(e.target.value.replace(/[^\d\s]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&confirmEnrollment()}
          style={{ padding:"14px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:28,fontWeight:700,letterSpacing:8,textAlign:"center",outline:"none",color:"#0f172a",fontVariantNumeric:"tabular-nums" }}
        />
        {mfaErr && <div style={{ fontSize:13,color:"#dc2626",padding:"8px 12px",background:"#fef2f2",borderRadius:6,textAlign:"center" }}>{mfaErr}</div>}
        <button onClick={confirmEnrollment} disabled={mfaLoading} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",opacity:mfaLoading?.7:1 }}>
          {mfaLoading ? "Confirming…" : "Confirm & Activate MFA"}
        </button>
        <button onClick={()=>{setMfaStep("none");setMfaCode("");setMfaErr("");}} className="blink" style={{ color:"#64748b",fontSize:13 }}>
          ← Back to sign in
        </button>
      </div>
    </MfaCard>
  );

  // ── Concept B SVG logo mark ──
  const LogoMark = () => (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
      <rect width="48" height="48" rx="11" fill="#1e1b4b"/>
      <rect x="10" y="13" width="28" height="3" rx="1.5" fill="#818cf8"/>
      <rect x="10" y="20" width="20" height="3" rx="1.5" fill="#818cf8" fillOpacity=".6"/>
      <rect x="10" y="27" width="24" height="3" rx="1.5" fill="#818cf8" fillOpacity=".35"/>
      <rect x="10" y="34" width="14" height="3" rx="1.5" fill="#818cf8" fillOpacity=".18"/>
      <rect x="30" y="21" width="2.5" height="14" rx="1.25" fill="#60a5fa"/>
      <polygon points="36,27 30,21 30,35" fill="#60a5fa" fillOpacity=".4"/>
    </svg>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: mob ? "column" : "row", fontFamily: "var(--sans)" }}>

      {/* ── LEFT PANEL ── */}
      {!mob && (
        <div style={{ width: 500, minWidth: 500, background: "linear-gradient(150deg,#0f172a 0%,#1e1b4b 45%,#2d1f6e 100%)", display: "flex", flexDirection: "column", padding: "52px 56px", position: "relative", overflow: "hidden", justifyContent: "space-between" }}>
          {/* Grid overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          {/* Orb top-left */}
          <div style={{ position: "absolute", top: -120, left: -120, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.28) 0%,transparent 65%)", pointerEvents: "none" }} />
          {/* Orb bottom-right */}
          <div style={{ position: "absolute", bottom: -80, right: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.2) 0%,transparent 65%)", pointerEvents: "none" }} />


          {/* Logo */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 1, position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.6px", lineHeight: 1 }}>Ledger</span>
            <span style={{ fontSize: 20, fontWeight: 300, color: "rgba(255,255,255,.38)", letterSpacing: "-.3px", lineHeight: 1 }}>OS</span>
          </div>

          {/* Hero */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0 32px", position: "relative", zIndex: 1 }}>
            <div style={{ alignSelf: "flex-start", marginBottom: 28, animation: "logoFadeIn .7s ease-out both, logoTilt 4s ease-in-out 1s infinite" }}>
              <img src={LOGO_NEW} alt="Arkham Retail" style={{ width: 220, display: "block" }} />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(167,139,250,.85)", marginBottom: 20 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 2.4s ease-in-out infinite" }} />
              Business Finance Platform
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1.04, marginBottom: 20 }}>
              <span style={{ display: "inline-block", animation: "headlineUp .6s ease-out both" }}>Run every</span><br />
              <span style={{ display: "inline-block", animation: "headlineUp .6s ease-out .1s both" }}>invoice.</span><br />
              <span style={{ display: "inline-block", animation: "headlineUp .6s ease-out .2s both" }}>Know every</span><br />
              <span style={{ display: "inline-block", animation: "headlineUp .6s ease-out .3s both, gradientMove 6s ease-in-out infinite", background: "linear-gradient(135deg,#a78bfa,#60a5fa,#a78bfa)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>number.</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.38)", lineHeight: 1.75, maxWidth: 320 }}>
              Everything your retail business needs. Invoicing, inventory, deliveries, and real-time insights — beautifully connected in one platform.
            </div>
            {/* Feature pills */}
            <div style={{ marginTop: 32, maxWidth: 420 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "VAT Invoices", svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                  { label: "Inventory", svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
                  { label: "Analytics", svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
                  { label: "Delivery Notes", svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
                ].map(p => (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(99,102,241,.08)", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "#fff", boxShadow: "0 0 16px rgba(99,102,241,.12)" }}>
                    <span style={{ color: "#a5b4fc", display: "flex" }}>{p.svg}</span>
                    {p.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.18)", lineHeight: 1.7, position: "relative", zIndex: 1 }}>
            © 2026 Arkham Retail Ltd
          </div>
        </div>
      )}

      {/* ── MOBILE TOP PANEL ── */}
      {mob && (
        <div style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#2d1f6e 100%)", padding: "28px 24px 36px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: -80, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 65%)", pointerEvents: "none" }} />
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <img src={LOGO_NEW} alt="Arkham Retail" style={{ height: 40, display: "block" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.5px", lineHeight: 1 }}>Ledger</span>
                <span style={{ fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,.35)", letterSpacing: "-.3px", lineHeight: 1 }}>OS</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".5px" }}>Live</span>
            </div>
          </div>
          {/* Headline */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 8 }}>
              Run every invoice.<br /><span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Know every number.</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>Purpose-built for Arkham Retail.</div>
          </div>
        </div>
      )}

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "center", padding: mob ? "28px 24px 40px" : "48px 52px", background: "#fff", minHeight: mob ? "auto" : "auto" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* Mobile logo — hidden, rendered in mobile top panel instead */}

          {/* Form header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>Secure access</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0d1117", letterSpacing: "-.7px", marginBottom: 7, lineHeight: 1.15 }}>
              {mode === "signin" ? "Welcome back" : "Request access"}
            </div>
            <div style={{ fontSize: 13, color: "#5c677d", lineHeight: 1.55 }}>
              {mode === "signin" ? "Sign in to your Arkham Retail dashboard" : "Join your team on LedgerOS"}
            </div>
          </div>

          {/* Error / success message */}
          {err && (
            <div style={{ background: isSuccess ? "#ecfdf5" : "#fff1f1", border: "1px solid " + (isSuccess ? "#6ee7b7" : "#fca5a5"), borderRadius: 9, padding: "10px 14px", fontSize: 12.5, color: isSuccess ? "#065f46" : "#991b1b", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <i className={"ti " + (isSuccess ? "ti-circle-check" : "ti-alert-circle")} style={{ fontSize: 15, flexShrink: 0 }} />
              {isSuccess ? err.slice(2) : err}
            </div>
          )}

          {/* Full name (signup only) */}
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Full name</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", pointerEvents: "none", display: "flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Jane Smith" onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
              </div>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Email address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", pointerEvents: "none", display: "flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
              <input type="email" style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@arkhamretail.com" onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Password</label>
              {mode === "signin" && <button onClick={sendReset} className="blink" style={{ fontSize: 12, color: "#2563eb", fontWeight: 500, fontFamily: "var(--sans)" }}>Forgot password?</button>}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9aa5b4", pointerEvents: "none", display: "flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
              <input type={showPw ? "text" : "password"} style={{ width: "100%", padding: "11px 40px 11px 38px", background: "#f8fafd", border: "1.5px solid #e5e9f0", borderRadius: 10, fontSize: 14, color: "#0d1117", fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box", transition: "border .15s,box-shadow .15s" }} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Enter your password" onKeyDown={e => e.key === "Enter" && go()} onFocus={e => { e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; e.target.style.background="#fff"; }} onBlur={e => { e.target.style.borderColor="#e5e9f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafd"; }} />
              <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9aa5b4", padding: 2, display: "flex", alignItems: "center" }}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          {/* CTA button */}
          <button onClick={go} disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(37,99,235,.35)", transition: "transform .15s,box-shadow .15s", marginTop: 24, marginBottom: 20 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,.4)"; }}}
            onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 14px rgba(37,99,235,.35)"; }}>
            {loading
              ? <><div className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} />Please wait...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>{mode === "signin" ? "Sign in to dashboard" : "Request access"}</>}
          </button>

          {/* Forgot password */}
          {mode === "signin" && (
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <span style={{ color: "#2563eb", cursor: "pointer", fontSize: 13 }} onClick={sendReset}>Forgot password?</span>
            </div>
          )}

          {/* Switch mode */}
          <div style={{ textAlign: "center", fontSize: 13, color: "#5c677d" }}>
            {mode === "signin"
              ? <>Don't have an account? <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("signup"); setErr(""); }}>Request access</span></>
              : <>Have an account? <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("signin"); setErr(""); }}>Sign in</span></>}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f0f3f8" }}>
            {[
              { label: "256-bit SSL", svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
              { label: "Supabase auth", svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> },
              { label: "UK servers", svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9aa5b4" }}>
                {b.svg}<span>{b.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
