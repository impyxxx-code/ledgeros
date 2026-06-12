import { describe, it, expect } from "vitest";
import { fmt, fmtDate, fmtShort, fmtRelative, dueDelta, escHtml, DEFAULT_REORDER } from "./utils.js";

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
