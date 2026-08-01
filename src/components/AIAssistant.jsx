import React, { useState, useEffect, useRef } from "react";
import { fmt, DEFAULT_REORDER } from "../lib/utils.js";

export function AIAssistant({ invoices, contacts, products, accounts, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I am your LedgerOS AI assistant. Ask me anything about your invoices, customers, stock or finances." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const q = userMsg.toLowerCase();

    let reply = "";
    if (q.includes("owe") || q.includes("most money") || q.includes("outstanding") || q.includes("unpaid")) {
      const byCustomer = invoices.filter(i => i.status !== "paid").reduce((acc, i) => { acc[i.customer] = (acc[i.customer]||0) + i.amount; return acc; }, {});
      const sorted = Object.entries(byCustomer).sort((a,b) => b[1]-a[1]);
      reply = sorted.length > 0
        ? "Top customers with outstanding balances:\n\n" + sorted.slice(0,5).map(([name,amt],i) => (i+1) + ". " + name + " - " + fmt(amt)).join("\n") + "\n\nTotal outstanding: " + fmt(sorted.reduce((s,[,a])=>s+a,0))
        : "No outstanding invoices at the moment.";
    } else if (q.includes("overdue")) {
      const ov = invoices.filter(i => i.status === "overdue");
      reply = ov.length > 0
        ? "You have " + ov.length + " overdue invoice" + (ov.length>1?"s":"") + ":\n\n" + ov.map(i => "- " + i.customer + " - " + fmt(i.amount) + " (" + i.invoice_number + ")").join("\n")
        : "No overdue invoices.";
    } else if (q.includes("low stock") || q.includes("running low") || q.includes("stock")) {
      const low = products.filter(p => p.stock_qty <= (p.reorder_level || DEFAULT_REORDER));
      reply = low.length > 0
        ? low.length + " products low on stock:\n\n" + low.map(p => "- " + p.name + " - " + p.stock_qty + " " + (p.unit||"units") + " remaining").join("\n")
        : "All products are well stocked.";
    } else if (q.includes("revenue") || q.includes("total") || q.includes("sales") || q.includes("made")) {
      const paid = invoices.filter(i => i.status==="paid").reduce((s,i)=>s+i.amount,0);
      const pending = invoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0);
      reply = "Revenue Summary:\n\nCollected: " + fmt(paid) + "\nPending: " + fmt(pending) + "\nTotal invoiced: " + fmt(paid+pending) + "\nTotal invoices: " + invoices.length;
    } else if (q.includes("customer") || q.includes("top") || q.includes("best")) {
      const top = Object.entries(invoices.reduce((acc,i)=>{ acc[i.customer]=(acc[i.customer]||0)+i.amount; return acc; },{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
      reply = top.length > 0
        ? "Top customers by spend:\n\n" + top.map(([name,amt],i)=>(i+1)+". "+name+" - "+fmt(amt)).join("\n")
        : "No customer data yet.";
    } else if (q.includes("paid") || q.includes("collected")) {
      const paidInv = invoices.filter(i=>i.status==="paid");
      reply = "Paid invoices: " + paidInv.length + "\nTotal collected: " + fmt(paidInv.reduce((s,i)=>s+i.amount,0));
    } else if (q.includes("product") || q.includes("inventory")) {
      reply = "You have " + products.length + " products.\n\nTop by price:\n" + products.sort((a,b)=>(b.sale_price||0)-(a.sale_price||0)).slice(0,5).map(p=>"- "+p.name+" - "+fmt(p.sale_price||0)).join("\n");
    } else {
      reply = "I can help you with:\n\n- Who owes the most money?\n- Show overdue invoices\n- Which products are low on stock?\n- What is my total revenue?\n- Who are my top customers?";
    }

    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const suggestions = ["Who owes the most money?", "Which products are low on stock?", "What is my total revenue?", "Show overdue invoices"];

  return (
    <>
    <div style={{ width: 360, height: 520, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "var(--sh3)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "scaleIn .2s var(--ease) both", transformOrigin: "bottom right", outline: "none" }}>
      <div style={{ padding: "14px 16px", background: "#201e1d", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, outline: "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}>
          <span style={{ color: "#fff", display: "flex", pointerEvents: "none" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg></span>
        </div>
        <div style={{ flex: "1" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Live business data</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, outline: "none" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#201e1d", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}>
                <span style={{ color: "#fff", display: "flex", pointerEvents: "none" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg></span>
              </div>
            )}
            <div style={{ maxWidth: "80%", padding: "10px 13px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "var(--blue)" : "#f4f6f9", color: msg.role === "user" ? "#fff" : "var(--text)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: "8px 14px" }}>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: "0 14px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ padding: "5px 10px", background: "var(--blue-lt)", border: "1px solid var(--blue-mid)", borderRadius: 20, fontSize: 11, color: "var(--blue)", cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 500, whiteSpace: "nowrap" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0, outline: "none" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about your business..."
          style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontFamily: "var(--sans)", outline: "none", color: "var(--text)", background: "#f8fafd" }}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "var(--blue)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  </>
  );
}
