import React from "react";
import { sb } from "../../lib/supabase.js";

export function ChangePasswordForm({ token }) {
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const update = async () => {
    if (newPw.length < 6) { setMsg("Minimum 6 characters."); return; }
    if (newPw !== confirmPw) { setMsg("Passwords do not match."); return; }
    setLoading(true);
    const res = await sb.updatePassword(token, newPw);
    if (res.id || res.email) { setMsg("✓ Password updated."); setNewPw(""); setConfirmPw(""); }
    else { setMsg("Failed — please try again."); }
    setLoading(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 300 }}>
      <input type="password" placeholder="New password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, outline: "none", background: "var(--white)", color: "var(--text)" }} />
      <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 13, outline: "none", background: "var(--white)", color: "var(--text)" }} />
      {msg && <div style={{ fontSize: 12, color: msg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>{msg}</div>}
      <button className="btn bp bsm" onClick={update} disabled={loading} style={{ alignSelf: "flex-start" }}>{loading ? "Updating..." : "Update Password"}</button>
    </div>
  );
}
