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

export const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MjAgMTIwIj4KICA8IS0tIEEgLSBncmVlbiAtLT4KICA8dGV4dCB4PSIyMCIgeT0iODgiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iODIiIGZpbGw9IiMyMmM1NWUiPkE8L3RleHQ+CiAgPCEtLSBSIC0gYmx1ZSAtLT4KICA8dGV4dCB4PSI3MCIgeT0iODgiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iODIiIGZpbGw9IiMxZTkwZmYiPlI8L3RleHQ+CiAgPCEtLSBWZXJ0aWNhbCBkaXZpZGVyIC0tPgogIDxyZWN0IHg9IjE2NCIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9Ijg4IiBmaWxsPSIjMjJjNTVlIiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEFSS0hBTSAtIGRhcmsgZm9yIHByaW50IC0tPgogIDx0ZXh0IHg9IjE4MiIgeT0iNTIiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iMzQiIGxldHRlci1zcGFjaW5nPSIzIiBmaWxsPSIjMGYxNzJhIj5BUktIQU08L3RleHQ+CiAgPCEtLSBHcmVlbiBydWxlIC0tPgogIDxyZWN0IHg9IjE4MiIgeT0iNjAiIHdpZHRoPSIyMjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyYzU1ZSIvPgogIDwhLS0gUkVUQUlMIExURCAtLT4KICA8dGV4dCB4PSIxODIiIHk9IjgyIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMTQiIGxldHRlci1zcGFjaW5nPSI2IiBmaWxsPSIjMjJjNTVlIj5SRVRBSUwgIExURDwvdGV4dD4KICA8IS0tIFdIT0xFU0FMRSDCtyBSRVRBSUwgLSBkYXJrIGZvciBwcmludCAtLT4KICA8dGV4dCB4PSIxODIiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNDAwIiBmb250LXNpemU9IjEwIiBsZXR0ZXItc3BhY2luZz0iMyIgZmlsbD0iIzY0NzQ4YiI+V0hPTEVTQUxFICDCtyAgUkVUQUlMPC90ZXh0Pgo8L3N2Zz4=";

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
