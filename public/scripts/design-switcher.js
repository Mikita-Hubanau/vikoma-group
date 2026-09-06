/** Design selection only; no personal data or network calls. The head bootstrap
 * applies the same allowlist before first paint. Buttons remain normal controls
 * (not tabs): all five select a stylesheet for the same content. */
const designs = ['original', 'editorial', 'atlas', 'signature', 'grid'];
const root = document.documentElement;
const buttons = [...document.querySelectorAll('[data-design-choice]')];
let current = designs.includes(root.dataset.design) ? root.dataset.design : 'original';
let storageAvailable = true;
function reflectSelection() {
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.designChoice === current));
  const active = buttons.find((button) => button.dataset.designChoice === current);
  document.querySelectorAll('[data-design-current]').forEach((label) => { label.textContent = active?.dataset.designName || current; });
  // Only needed when storage is blocked: carry a validated choice in internal links.
  if (!storageAvailable) document.querySelectorAll('a[href]').forEach((link) => {
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#') || link.hasAttribute('download')) return;
    try {
      const url = new URL(link.href);
      if (url.origin !== location.origin || /\.(?:pdf|zip|svg|png|jpg|webp)$/i.test(url.pathname) || /\/(?:admin|blocks)\//.test(url.pathname)) return;
      url.searchParams.set('design', current);
      link.href = url.pathname + url.search + url.hash;
    } catch { /* Ignore non-HTTP links. */ }
  });
}
try { localStorage.setItem('vikub-design', current); } catch { storageAvailable = false; }
function selectDesign(id, updateUrl = true) {
  if (!designs.includes(id)) return;
  current = id;
  root.dataset.design = id;
  try { localStorage.setItem('vikub-design', id); } catch { storageAvailable = false; }
  if (updateUrl) {
    try { const url = new URL(location.href); url.searchParams.set('design', id); history.replaceState(null, '', url); } catch { /* file:// preview or privacy mode */ }
  }
  reflectSelection();
  window.dispatchEvent(new CustomEvent('vikub:designchange', { detail: { design: id } }));
}
for (const button of buttons) button.addEventListener('click', () => selectDesign(button.dataset.designChoice));
window.addEventListener('storage', (event) => {
  if (event.key === 'vikub-design' && designs.includes(event.newValue)) selectDesign(event.newValue);
});
window.addEventListener('pageshow', () => {
  try { const id = localStorage.getItem('vikub-design'); if (designs.includes(id)) selectDesign(id, false); } catch { /* Current design remains active. */ }
  reflectSelection();
});
reflectSelection();
