import React, { useState } from "react";
import { COMPANY } from "../lib/constants.js";
import { ChangePasswordForm } from "../components/settings/ChangePasswordForm.jsx";
import { UserApproval } from "../components/settings/UserApproval.jsx";
import { ProductAliases } from "../components/settings/ProductAliases.jsx";

export function Settings({ auth, profile, darkMode: darkModeProp, toggleDark, onSignOut, products = [] }) {
  const darkMode = darkModeProp;
  const [activeTab, setActiveTab] = useState("company");
  if (profile?.role !== "admin" && profile?.role !== "manager") return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text3)" }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Access restricted</div>
      <div style={{ fontSize: 13 }}>Settings are only available to admins.</div>
    </div>
  );
  return (
    <div>
      <div className="page-hero" style={{ margin: "-26px -28px 20px -28px", background: "#201e1d", padding: "20px 24px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.10) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(221,43,15,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#e15b47", marginBottom: 6 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dd2b0f", animation: "pulse 2.4s ease-in-out infinite" }} />Administration</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", marginBottom: 3 }}>System <span style={{ background: "linear-gradient(135deg,#ff6a4d,#dd2b0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Settings</span></div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Manage your LedgerOS configuration</div></div>
        <div className="kpi-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[
            { label: "Company", val: COMPANY.name, sub: "Arkham Retail Ltd", accent: "#dd2b0f" },
            { label: "VAT Number", val: COMPANY.vatNumber, sub: "registered", accent: "#57534e" },
            { label: "Role", val: profile?.role || "—", sub: "your access level", accent: "#16a34a" },
            { label: "Version", val: "v2.9", sub: "LedgerOS", accent: "#d97706" },
          ].map((k,i) => (
            <div key={i} style={{ padding:"12px 18px", borderRight:i<3?"1px solid rgba(255,255,255,.08)":"none", borderTop:`3px solid ${k.accent}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:14,fontWeight:800,color:"#fff",fontFamily:"var(--mono)",marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, borderTop: "1px solid rgba(255,255,255,.10)", padding: "5px 0", margin: "0", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {[["company","Company"],["appearance","Appearance"],["account","Account"],["users","Users"],["aliases","WhatsApp Aliases"]].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: activeTab===k ? "#dd2b0f" : "transparent", color: activeTab===k ? "#fff" : "rgba(255,255,255,.45)", fontSize: 12, fontWeight: activeTab===k ? 700 : 500, cursor: "pointer", fontFamily: "var(--sans)", transition: "all .15s", boxShadow: activeTab===k ? "0 2px 8px rgba(221,43,15,.30)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
      {activeTab==="company" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Company Information</div>
          <div className="settings-info-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            {[{label:"Company Name",val:"Arkham Retail Ltd"},{label:"VAT Number",val:"GB462229106"},{label:"Address",val:"2 Fieldhead Street, Fieldhead Business Centre"},{label:"City",val:"Bradford, West Yorkshire BD7 1LW"},{label:"Phone",val:"07801 567209 / 07851 983151"},{label:"Email",val:"ARKHAMRETAIL@GMAIL.COM"},{label:"Bank",val:"Tide Bank"},{label:"Sort Code / Account",val:"04-06-05 / 23058246"}].map(f=>(
              <div key={f.label}><div style={{ fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:5 }}>{f.label}</div><div style={{ fontSize:14,fontWeight:600,color:"var(--text)",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--r)",padding:"10px 14px" }}>{f.val}</div></div>
            ))}
          </div>
        </div>
      )}
      {activeTab==="appearance" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Appearance</div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",borderBottom:"1px solid var(--border)" }}>
            <div><div style={{ fontWeight:600,marginBottom:3 }}>Dark Mode</div><div style={{ fontSize:12,color:"var(--text3)" }}>Switch between light and dark theme</div></div>
            <div onClick={toggleDark} style={{ width:48,height:26,borderRadius:13,background:darkMode?"var(--blue)":"var(--border)",cursor:"pointer",position:"relative",transition:"background .2s" }}>
              <div style={{ position:"absolute",top:3,left:darkMode?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
            </div>
          </div>
        </div>
      )}
      {activeTab==="account" && (
        <div className="card" style={{ padding:24 }}>
          <div className="ct" style={{ marginBottom:20 }}>Account</div>
          <div style={{ display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"#201e1d",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff" }}>{auth?.user?.email?.[0]?.toUpperCase()}</div>
            <div><div style={{ fontWeight:700,fontSize:16 }}>{auth?.user?.email}</div><div style={{ fontSize:12,color:"var(--text3)",marginTop:3 }}>Administrator</div></div>
          </div>
          <div style={{ marginTop:20,paddingTop:20,borderTop:"1px solid var(--border)" }}>
            <div style={{ fontWeight:600,fontSize:14,marginBottom:12 }}>Change Password</div>
            <ChangePasswordForm token={auth?.token} />
          </div>
          <div style={{ marginTop:16,display:"flex",gap:10 }}>
            <button className="btn bo bsm" style={{ background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca" }} onClick={onSignOut}>Sign Out</button>
          </div>
        </div>
      )}
      {activeTab==="users" && <UserApproval token={auth?.token} profile={profile} />}
      {activeTab==="aliases" && <ProductAliases token={auth?.token} products={products} />}
    </div>
  );
}
