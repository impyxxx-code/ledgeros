import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const get = vi.fn();
const hMock = vi.fn(() => ({ apikey: "anon", Authorization: "Bearer t" }));
vi.mock("./supabase.js", () => ({
  sb: { get: (...a) => get(...a), h: (...a) => hMock(...a) },
  SUPABASE_URL: "https://db.example",
}));

import { groupPaymentsByDate, paymentMethodTotals, unbankedCash, loadDepositDays, upsertDepositDay } from "./banking.js";

const PAYS = [
  { id: 1, amount: 100, method: "cash",   created_at: "2026-08-04T09:00:00Z" },
  { id: 2, amount: 50,  method: "bank",   created_at: "2026-08-04T10:00:00Z" },
  { id: 3, amount: 25,  method: "card",   created_at: "2026-08-04T11:00:00Z" },
  { id: 4, amount: 200, method: "cash",   created_at: "2026-08-03T09:00:00Z" },
  { id: 5, amount: 10,                     payment_date: "2026-08-02" },        // no method → cash
];

describe("groupPaymentsByDate", () => {
  it("groups by day, newest first", () => {
    const { byDate, dates } = groupPaymentsByDate(PAYS);
    expect(dates).toEqual(["2026-08-04", "2026-08-03", "2026-08-02"]);
    expect(byDate["2026-08-04"].map(p => p.id)).toEqual([1, 2, 3]);
  });
  it("falls back to payment_date and skips undated rows", () => {
    const { dates } = groupPaymentsByDate([{ amount: 1 }, { amount: 2, payment_date: "2026-01-01" }]);
    expect(dates).toEqual(["2026-01-01"]);
  });
});

describe("paymentMethodTotals", () => {
  it("sums per method, missing method counts as cash", () => {
    expect(paymentMethodTotals(PAYS)).toEqual({ cash: 310, bank: 50, card: 25 });
  });
});

describe("unbankedCash", () => {
  const { byDate, dates } = groupPaymentsByDate(PAYS);
  it("counts CASH only on unbanked days (excludes card + bank transfer)", () => {
    // nothing banked → cash = 100 + 200 + 10 = 310 (the 50 bank + 25 card excluded)
    expect(unbankedCash(dates, byDate, {})).toBe(310);
  });
  it("drops days that are marked banked", () => {
    // bank 2026-08-04 (100 cash) → remaining cash = 200 + 10 = 210
    expect(unbankedCash(dates, byDate, { "2026-08-04": true })).toBe(210);
  });
  it("returns 0 when every day is banked", () => {
    expect(unbankedCash(dates, byDate, { "2026-08-04": true, "2026-08-03": true, "2026-08-02": true })).toBe(0);
  });
});

describe("loadDepositDays", () => {
  beforeEach(() => get.mockReset());
  it("maps rows into banked + refs, ignoring false/blank", async () => {
    get.mockResolvedValue([
      { deposit_date: "2026-08-04", banked: true,  deposit_ref: "DEP-1" },
      { deposit_date: "2026-08-03", banked: false, deposit_ref: "" },
      { deposit_date: "2026-08-02", banked: true,  deposit_ref: null },
    ]);
    const { banked, refs } = await loadDepositDays("t");
    expect(banked).toEqual({ "2026-08-04": true, "2026-08-02": true });
    expect(refs).toEqual({ "2026-08-04": "DEP-1" });
  });
  it("returns empty maps when the table is missing (non-array error response)", async () => {
    get.mockResolvedValue({ code: "PGRST205", message: "Could not find the table" });
    expect(await loadDepositDays("t")).toEqual({ banked: {}, refs: {} });
  });
});

describe("upsertDepositDay", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { hMock.mockClear(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
  afterEach(() => vi.unstubAllGlobals());
  it("posts a merge-duplicates upsert with only the provided fields", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const r = await upsertDepositDay("t", { date: "2026-08-04", banked: true, userId: 7 });
    expect(r.ok).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/banking_deposit_days$/);
    expect(opts.headers.Prefer).toMatch(/merge-duplicates/);
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({ deposit_date: "2026-08-04", banked: true, updated_by: "7" });
    expect("deposit_ref" in body).toBe(false); // not provided → not sent → not clobbered
  });
  it("reports ok:false on a non-2xx response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    expect(await upsertDepositDay("t", { date: "2026-08-04", banked: true })).toEqual({ ok: false, status: 403 });
  });
  it("guards a missing date", async () => {
    expect((await upsertDepositDay("t", { banked: true })).ok).toBe(false);
  });
});
