import React, { useState, useEffect } from "react";
import { sb, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase.js";
import { isMobile } from "../../lib/utils.js";
import { toast } from "../../lib/constants.js";
import { logAudit } from "../../lib/audit.js";
import { SkeletonTable } from "../ui.jsx";

export function UserApproval({ token, profile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  if (profile?.role !== "admin") return (
    <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text3)" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <div style={{ fontWeight: 600, fontSize: 13 }}>Admin access required</div>
    </div>
  );
  useEffect(() => {
    sb.get(token, "profiles", "order=created_at.desc").then(d => {
      if (Array.isArray(d)) setUsers(d);
      setLoading(false);
    });
  }, [token]);
  const approve = async (id) => {
    const user = users.find(u => u.id === id);
    const res = await sb.patch(token, "profiles", id, { approved: true });
    if (res && !res.error && !res.message?.includes("error")) {
      setUsers(prev => prev.map(u => u.id===id ? {...u, approved:true} : u));
      toast.success("User approved successfully");
      logAudit(token, profile?.id, "user_approved", "user", id, `${user?.full_name || user?.email || id} approved by ${profile?.full_name || "Admin"}`);
    } else {
      toast.error("Failed to approve user. Check Supabase RLS policies on profiles table.");
      console.error("Approve error:", res);
    }
  };
  const resetMfa = async (user) => {
    if (!confirm(`Reset MFA for ${user.full_name || user.email}?\n\nThey'll be asked to set up a new authenticator app on their next login. Only do this if they've confirmed losing access to their device.`)) return;
    try {
      const r = await fetch("/api/reset-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        toast.success(data.removed > 0 ? `MFA reset for ${user.full_name || user.email}` : "This user had no MFA set up");
        logAudit(token, profile?.id, "mfa_reset", "user", user.id, `MFA reset for ${user.full_name || user.email} by ${profile?.full_name || "Admin"}`);
      } else {
        toast.error(data.error || "Failed to reset MFA");
      }
    } catch {
      toast.error("Failed to reset MFA");
    }
  };

  const revoke = async (id) => {
    const user = users.find(u => u.id === id);
    const isPending = user && (user.approved === false || user.approved === null);
    if (isPending) {
      // Delete profile row entirely so they can't reappear via re-fetch
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, { method: "DELETE", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
      if (res.ok || res.status === 204) {
        setUsers(prev => prev.filter(u => u.id !== id));
        toast.warn("User rejected");
        logAudit(token, profile?.id, "user_rejected", "user", id, `${user?.full_name || user?.email || id} rejected by ${profile?.full_name || "Admin"}`);
      } else {
        toast.error("Failed to reject user. Check Supabase RLS policies.");
      }
    } else {
      const res = await sb.patch(token, "profiles", id, { approved: false });
      if (res && !res.error && !res.message?.includes("error")) {
        setUsers(prev => prev.map(u => u.id===id ? {...u, approved:false} : u));
        toast.warn("User access revoked");
        logAudit(token, profile?.id, "user_revoked", "user", id, `${user?.full_name || user?.email || id} access revoked by ${profile?.full_name || "Admin"}`);
      } else {
        toast.error("Failed to revoke user. Check Supabase RLS policies on profiles table.");
        console.error("Revoke error:", res);
      }
    }
  };
  const pending = users.filter(u => u.approved===false||u.approved===null);
  const approved = users.filter(u => u.approved===true);
  return (
    <div>
      {loading ? <div className="card" style={{padding:20}}><SkeletonTable rows={5} cols={3} /></div> : (
        <div>
          <div className="card" style={{ marginBottom:16,padding:20 }}>
            <div className="ct" style={{ marginBottom:4 }}>Pending Approval</div>
            <div className="cs" style={{ marginBottom:16 }}>{pending.length} user{pending.length!==1?"s":""} waiting</div>
            {pending.length===0 ? <div style={{ padding:"16px 0",color:"var(--text3)",fontSize:13 }}>No pending users</div> : pending.map(u=>(
              <div key={u.id} style={{ display:"flex",flexDirection:isMobile()?"column":"row",alignItems:isMobile()?"stretch":"center",justifyContent:"space-between",gap:isMobile()?12:0,padding:"12px 0",borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#ef4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0 }}>{(u.full_name||u.email||"U")[0].toUpperCase()}</div>
                  <div><div style={{ fontWeight:600,fontSize:14 }}>{u.full_name||"Unknown"}</div><div style={{ fontSize:12,color:"var(--text3)" }}>{u.email||u.id}</div></div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button className="btn bp bsm" onClick={()=>approve(u.id)} style={{ background:"var(--green)",border:"none",color:"#fff",flex:isMobile()?1:"none",minHeight:isMobile()?40:undefined }}>Approve</button>
                  <button className="btn bo bsm" onClick={()=>revoke(u.id)} style={{ color:"var(--red)",borderColor:"#fecaca",flex:isMobile()?1:"none",minHeight:isMobile()?40:undefined }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:20 }}>
            <div className="ct" style={{ marginBottom:4 }}>Approved Users</div>
            <div className="cs" style={{ marginBottom:16 }}>{approved.length} active user{approved.length!==1?"s":""}</div>
            {approved.map(u=>(
              <div key={u.id} style={{ display:"flex",flexDirection:isMobile()?"column":"row",alignItems:isMobile()?"stretch":"center",justifyContent:"space-between",gap:isMobile()?12:0,padding:"12px 0",borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,justifyContent:"space-between" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0 }}>{(u.full_name||"U")[0].toUpperCase()}</div>
                    <div><div style={{ fontWeight:600,fontSize:14 }}>{u.full_name||"Unknown"}</div><div style={{ fontSize:12,color:"var(--text3)" }}>{u.email||"no email on file"} · {u.role||"agent"}</div></div>
                  </div>
                  {isMobile() && <span className="badge b-green">Active</span>}
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  {!isMobile() && <span className="badge b-green">Active</span>}
                  <button className="btn bo bsm" onClick={async()=>{ if(!u.email){alert("No email for this user.");return;} await sb.resetPassword(u.email); toast.success("Reset email sent to "+u.email); }} style={{ fontSize:11,flex:isMobile()?1:"none",minHeight:isMobile()?40:undefined }}>Reset Password</button>
                  <button className="btn bo bsm" onClick={()=>resetMfa(u)} style={{ fontSize:11,flex:isMobile()?1:"none",minHeight:isMobile()?40:undefined }}>Reset MFA</button>
                  <button className="btn bo bsm" onClick={()=>revoke(u.id)} style={{ fontSize:11,color:"var(--red)",borderColor:"#fecaca",flex:isMobile()?1:"none",minHeight:isMobile()?40:undefined }}>Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
