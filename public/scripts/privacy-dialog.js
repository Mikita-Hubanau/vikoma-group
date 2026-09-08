/** Local privacy dialog: no form submission, network request, storage or consent.
 * Uses the browser's native modal focus containment. CSS :target is the readable
 * no-JS/old-browser fallback. State is restored without resetting the form.
 */
const dialog = document.querySelector('[data-privacy-dialog]');
if (typeof HTMLDialogElement !== 'undefined' && dialog instanceof HTMLDialogElement && typeof dialog.showModal === 'function') {
  let opener = null;
  let saved = null;
  let startedOnBackdrop = false;
  const scrollArea = dialog.querySelector('[data-privacy-scroll]');
  const title = dialog.querySelector('#privacy-title');
  const root = document.documentElement;
  const body = document.body;
  const properties = ['position', 'top', 'left', 'right', 'width', 'overflow', 'padding-right'];

  function lockScroll() {
    if (saved) return;
    saved = {
      x: window.scrollX, y: window.scrollY,
      rootOverflow: root.style.getPropertyValue('overflow'),
      rootOverflowPriority: root.style.getPropertyPriority('overflow'),
      body: properties.map((key) => [key, body.style.getPropertyValue(key), body.style.getPropertyPriority(key)]),
    };
    const gutter = Math.max(0, window.innerWidth - root.clientWidth);
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    root.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('position', 'fixed', 'important');
    body.style.setProperty('top', `-${saved.y}px`, 'important');
    body.style.setProperty('left', `-${saved.x}px`, 'important');
    body.style.setProperty('right', '0', 'important');
    body.style.setProperty('width', '100%', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    if (gutter) body.style.setProperty('padding-right', `${padding + gutter}px`, 'important');
  }

  function restoreProperty(element, key, value, priority = '') {
    if (value) element.style.setProperty(key, value, priority);
    else element.style.removeProperty(key);
  }

  function restore() {
    // Remove only the legacy privacy fragment, preserving queries/history state.
    if (location.hash === '#privacy') {
      try { history.replaceState(history.state, '', location.pathname + location.search); }
      catch { /* Restricted previews may disallow history changes. */ }
    }
    const previous = saved;
    saved = null;
    if (previous) {
      restoreProperty(root, 'overflow', previous.rootOverflow, previous.rootOverflowPriority);
      for (const [key, value, priority] of previous.body) restoreProperty(body, key, value, priority);
    }
    const target = opener instanceof HTMLElement && opener.isConnected ? opener : document.querySelector('#main');
    opener = null;
    target?.focus({ preventScroll:true });
    if (previous) window.scrollTo({ left:previous.x, top:previous.y, behavior:'instant' });
  }

  function show(source) {
    if (dialog.open) return;
    opener = source instanceof HTMLElement ? source : document.activeElement;
    // Do not cancel normal #privacy navigation if native modal opening fails.
    dialog.showModal();
    lockScroll();
    if (scrollArea) scrollArea.scrollTop = 0;
    title?.focus({ preventScroll:true });
  }

  function dismiss() {
    if (dialog.open) dialog.close();
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const open = event.target.closest('[data-privacy-open]');
    const close = event.target.closest('[data-privacy-close]');
    if (open) {
      // Preserve browser functions such as opening the local fallback in a tab.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      try { show(open); event.preventDefault(); }
      catch { /* The local #privacy fallback remains accessible. */ }
    } else if (close && dialog.contains(close)) {
      event.preventDefault();
      dismiss();
    }
  });

  // Header X, footer Close, Escape and pointer clicks outside the panel all work.
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', restore);
  // Explicit edge wrapping also avoids a transient browser-chrome focus stop
  // observed in Chromium when tabbing past the final link in a native dialog.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !dialog.open) return;
    const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden]'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first) { event.preventDefault(); title?.focus(); return; }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  const outside = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  dialog.addEventListener('pointerdown', (event) => { startedOnBackdrop = outside(event); });
  dialog.addEventListener('pointerup', (event) => {
    if (startedOnBackdrop && outside(event)) dismiss();
    startedOnBackdrop = false;
  });
  dialog.addEventListener('pointercancel', () => { startedOnBackdrop = false; });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#privacy') show(null);
    else dismiss();
  });
  if (location.hash === '#privacy') show(null);
}
