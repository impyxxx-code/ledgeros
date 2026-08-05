// ── Contact selection helpers ─────────────────────────────────────────────────
// Archived contacts are stored with active === false ("hidden from active lists",
// per Contacts.jsx). Selection pickers must not offer them — otherwise you can
// still raise new invoices / credit notes / bills against a closed account, which
// defeats archiving. Records with active undefined/true are treated as active.

export const isArchived = (c) => !!c && c.active === false;

// Active (non-archived) customers for selection pickers.
export function activeCustomers(contacts) {
  return (contacts || []).filter(c => (c.type === "customer" || c.type === "both") && c.active !== false);
}

// Active (non-archived) suppliers for selection pickers.
export function activeSuppliers(contacts) {
  return (contacts || []).filter(c => (c.type === "supplier" || c.type === "both") && c.active !== false);
}

// For EDIT contexts: the active customers PLUS the record currently selected by
// name — even if it has since been archived — so re-rendering the picker can't
// blank or silently change an existing document's customer. The current record is
// surfaced first so the bound <select value> always has a matching <option>.
export function customersForEdit(contacts, currentName) {
  const list = activeCustomers(contacts);
  if (currentName && !list.some(c => c.name === currentName)) {
    const cur = (contacts || []).find(c => c.name === currentName);
    if (cur) return [cur, ...list];
  }
  return list;
}
