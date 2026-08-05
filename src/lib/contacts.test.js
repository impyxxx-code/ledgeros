import { describe, it, expect } from "vitest";
import { isArchived, activeCustomers, activeSuppliers, customersForEdit } from "./contacts.js";

const CS = [
  { id: "1", name: "Active Cust", type: "customer", active: true },
  { id: "2", name: "Legacy Cust", type: "customer" },                 // active undefined → active
  { id: "3", name: "Archived Cust", type: "customer", active: false },
  { id: "4", name: "Both Co", type: "both", active: true },
  { id: "5", name: "Archived Both", type: "both", active: false },
  { id: "6", name: "Active Supp", type: "supplier", active: true },
  { id: "7", name: "Archived Supp", type: "supplier", active: false },
];

describe("isArchived", () => {
  it("is true only when active === false", () => {
    expect(isArchived({ active: false })).toBe(true);
    expect(isArchived({ active: true })).toBe(false);
    expect(isArchived({})).toBe(false);       // undefined → not archived
    expect(isArchived(null)).toBe(false);
  });
});

describe("activeCustomers", () => {
  it("keeps customers + both, drops archived", () => {
    expect(activeCustomers(CS).map(c => c.name)).toEqual(["Active Cust", "Legacy Cust", "Both Co"]);
  });
  it("excludes suppliers", () => {
    expect(activeCustomers(CS).some(c => c.type === "supplier")).toBe(false);
  });
  it("handles empty/undefined", () => {
    expect(activeCustomers(undefined)).toEqual([]);
    expect(activeCustomers([])).toEqual([]);
  });
});

describe("activeSuppliers", () => {
  it("keeps suppliers + both, drops archived", () => {
    expect(activeSuppliers(CS).map(c => c.name)).toEqual(["Both Co", "Active Supp"]);
  });
});

describe("customersForEdit", () => {
  it("returns active customers when the current one is still active", () => {
    expect(customersForEdit(CS, "Active Cust").map(c => c.name)).toEqual(["Active Cust", "Legacy Cust", "Both Co"]);
  });
  it("prepends an archived current customer so the bound select keeps its value", () => {
    const r = customersForEdit(CS, "Archived Cust");
    expect(r[0].name).toBe("Archived Cust");
    expect(r.map(c => c.name)).toEqual(["Archived Cust", "Active Cust", "Legacy Cust", "Both Co"]);
  });
  it("does not duplicate when the current customer is already active", () => {
    const names = customersForEdit(CS, "Both Co").map(c => c.name);
    expect(names.filter(n => n === "Both Co").length).toBe(1);
  });
  it("returns plain active list when current name is missing/unknown", () => {
    expect(customersForEdit(CS, "").map(c => c.name)).toEqual(["Active Cust", "Legacy Cust", "Both Co"]);
    expect(customersForEdit(CS, "Ghost").map(c => c.name)).toEqual(["Active Cust", "Legacy Cust", "Both Co"]);
  });
});
