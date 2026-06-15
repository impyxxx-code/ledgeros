import React from "react";

export function OnboardingChecklist({ onClose, invoices, contacts, products, setPage }) {
  const steps = [
    { key: "profile",  icon: "ti-user",          label: "Set up your profile",          done: true,                                     page: null },
    { key: "customer", icon: "ti-users",          label: "Add your first customer",      done: contacts.length > 0,                      page: "contacts" },
    { key: "product",  icon: "ti-package",        label: "Add products to inventory",    done: products.length > 0,                      page: "inventory" },
    { key: "invoice",  icon: "ti-file-invoice",   label: "Create your first invoice",    done: invoices.length > 0,                      page: "invoices" },
    { key: "delivery", icon: "ti-truck-delivery", label: "Send a delivery note",         done: false,                                    page: "delivery-notes" },
    { key: "report",   icon: "ti-chart-bar",      label: "Explore Reports",        done: false,                                    page: "admin-reports" },
  ];
  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="onboard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="onboard-card">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 4 }}>Get started with LedgerOS 🚀</div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>{completed} of {steps.length} steps completed</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 20 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg,var(--blue),#7c3aed)", borderRadius: 3, transition: "width .5s var(--ease)" }} />
        </div>

        {/* Steps */}
        <div className="onboard-grid">
          {steps.map(step => (
            <div key={step.key} className={"onboard-item" + (step.done ? " done" : "")} onClick={() => { if (step.page && !step.done) { setPage(step.page); onClose(); } }}>
              <div className="onboard-icon-lg" style={{ background: step.done ? "var(--green-lt)" : "var(--bg)", color: step.done ? "var(--green)" : "var(--text3)" }}>
                <i className={"ti " + (step.done ? "ti-check" : step.icon)} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: step.done ? "var(--text3)" : "var(--text)", textDecoration: step.done ? "line-through" : "none", marginBottom: 2 }}>{step.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{step.done ? "Completed" : "Tap to get started"}</div>
              </div>
              {!step.done && step.page && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn bo" onClick={onClose}>Maybe later</button>
          <button className="btn bp" onClick={onClose}>Let\'s go! 🎉</button>
        </div>
      </div>
    </div>
  );
}
