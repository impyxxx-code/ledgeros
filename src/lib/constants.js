// ── App-wide constants ────────────────────────────────────────────────────────
export const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

export const COMPANY = {
  name: "Arkham Retail Ltd",
  address: "2 Fieldhead Street",
  address2: "Fieldhead Business Centre",
  city: "Bradford", county: "West Yorkshire", postcode: "BD7 1LW",
  phone: "07801 567209 / 07851 983151",
  email: "ARKHAMRETAIL@GMAIL.COM",
  vatNumber: "GB462229106",
  bankName: "Tide Bank",
  sortCode: "04-06-05",
  accountNumber: "23058246",
};

export const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzQwIj48Y2lyY2xlIGN4PSIxNjAiIGN5PSIxMzUiIHI9IjExMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWUzYTVmIiBzdHJva2Utd2lkdGg9IjE0Ii8+PHRleHQgeD0iMTYwIiB5PSIxMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjEzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiIGZpbGw9IiMxZTNhNWYiPkFSPC90ZXh0Pjx0ZXh0IHg9IjE2MCIgeT0iMzIwIiBmb250LWZhbWlseT0iQXJpYWwsIEhlbHZldGljYSwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSIyOCIgbGV0dGVyLXNwYWNpbmc9IjIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM4YmMzNGEiPkFSS0hBTSBSRVRBSUw8L3RleHQ+PC9zdmc+";

// ── Toast Notification System ─────────────────────────────────────────────────
export const toast = (() => {
  let container = null;
  const getContainer = () => {
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    return container;
  };
  const show = (msg, type = 'info', duration = 3500) => {
    if (type === 'error' || type === 'warn') duration = Math.max(duration, 6000);
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: 'ti-circle-check', error: 'ti-circle-x', info: 'ti-info-circle', warn: 'ti-alert-triangle' };
    const icon = document.createElement('i');
    icon.className = `ti ${icons[type] || icons.info}`;
    icon.style.cssText = 'font-size:16px;flex-shrink:0';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(icon);
    el.appendChild(span);
    getContainer().appendChild(el);
    const remove = () => { el.style.animation = 'slideOutRight .2s var(--ease) forwards'; setTimeout(() => el.remove(), 200); };
    const timer = setTimeout(remove, duration);
    el.onclick = () => { clearTimeout(timer); remove(); };
    return remove;
  };
  return { success: (m, d) => show(m, 'success', d), error: (m, d) => show(m, 'error', d), info: (m, d) => show(m, 'info', d), warn: (m, d) => show(m, 'warn', d) };
})();
