// ── Supabase client ───────────────────────────────────────────────────────────
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const sb = {
  h: (t) => ({ "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${t || SUPABASE_ANON_KEY}` }),
  async refreshToken(refreshToken) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST", headers: sb.h(), body: JSON.stringify({ refresh_token: refreshToken })
      });
      const data = await res.json();
      if (data.access_token) return data;
    } catch(e) {}
    return null;
  },
  async signIn(e, p) { return (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p }) })).json(); },
  async signUp(e, p, n) {
    const d = await (await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email: e, password: p, data: { full_name: n } }) })).json();
    if (d.access_token && d.user) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { method: "POST", headers: { ...sb.h(d.access_token), "Prefer": "return=representation" }, body: JSON.stringify({ id: d.user.id, full_name: n, role: "agent" }) });
      } catch(err) { console.log("Profile creation failed, will retry on login"); }
    }
    return d;
  },
  async signOut(t) { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: sb.h(t) }); },
  async resetPassword(email) {
    return (await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method: "POST", headers: sb.h(), body: JSON.stringify({ email }) })).json();
  },
  async updatePassword(t, password) {
    return (await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { ...sb.h(t), "Content-Type": "application/json" }, body: JSON.stringify({ password }) })).json();
  },
  async mfaGetUser(t) { return (await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: sb.h(t) })).json(); },
  async mfaEnroll(t) { return (await fetch(`${SUPABASE_URL}/auth/v1/factors`, { method: "POST", headers: sb.h(t), body: JSON.stringify({ friendly_name: `TOTP-${Date.now()}`, factor_type: "totp" }) })).json(); },
  async mfaUnenroll(t, factorId) { try { await fetch(`${SUPABASE_URL}/auth/v1/factors/${factorId}`, { method: "DELETE", headers: sb.h(t) }); } catch {} },
  async mfaChallenge(t, factorId) { return (await fetch(`${SUPABASE_URL}/auth/v1/factors/${factorId}/challenge`, { method: "POST", headers: sb.h(t) })).json(); },
  async mfaVerify(t, factorId, challengeId, code) { return (await fetch(`${SUPABASE_URL}/auth/v1/factors/${factorId}/verify`, { method: "POST", headers: sb.h(t), body: JSON.stringify({ challenge_id: challengeId, code }) })).json(); },
  async get(t, table, q = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: sb.h(t) });
    if (res.status === 401) { window._jwtExpired = true; return []; }
    return res.json();
  },
  async post(t, table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(body) });
    if (res.status === 401) { window._jwtExpired = true; return []; }
    return res.json();
  },
  async patch(t, table, id, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(body) });
    if (res.status === 401) { window._jwtExpired = true; return null; }
    return res.json();
  },
  async del(t, table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: sb.h(t) });
    if (res.status === 401) { window._jwtExpired = true; return null; }
    return res.ok;
  },
  async rpc(t, fn, args) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: sb.h(t), body: JSON.stringify(args || {}) });
    if (res.status === 401) { window._jwtExpired = true; return null; }
    return res.json();
  },
  async getPayments(t, invoiceId) { return (await fetch(`${SUPABASE_URL}/rest/v1/invoice_payments?invoice_id=eq.${invoiceId}&order=created_at.asc`, { headers: sb.h(t) })).json(); },
  async addPayment(t, row) { return (await fetch(`${SUPABASE_URL}/rest/v1/invoice_payments`, { method: "POST", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(row) })).json(); },
  async getCredits(t, customer) { return (await fetch(`${SUPABASE_URL}/rest/v1/customer_credits?customer=eq.${encodeURIComponent(customer)}&order=created_at.desc`, { headers: sb.h(t) })).json(); },
  async addCredit(t, row) { return (await fetch(`${SUPABASE_URL}/rest/v1/customer_credits`, { method: "POST", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify(row) })).json(); },
  async useCredit(t, id, amountUsed) { return (await fetch(`${SUPABASE_URL}/rest/v1/customer_credits?id=eq.${id}`, { method: "PATCH", headers: { ...sb.h(t), "Prefer": "return=representation" }, body: JSON.stringify({ amount_used: amountUsed, status: "used" }) })).json(); },
};
