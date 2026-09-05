/** Basic opt-in analytics: no request to Google until an explicit grant.
 * The storage record is versioned and expires. Blocked storage never breaks the UI.
 */
const banner = document.querySelector('[data-analytics-banner]');
if (banner) {
  const id = banner.dataset.measurementId || '';
  const base = banner.dataset.basePath || '/';
  const key = `vikub-analytics-v1:${base}`;
  const maxAge = 180 * 24 * 60 * 60 * 1000;
  let loaded = false;
  let returnFocus = null;
  let choice = readChoice();
  window[`ga-disable-${id}`] = true;

  function readChoice() {
    try {
      const record = JSON.parse(localStorage.getItem(key) || 'null');
      if (record?.version === 1 && ['granted','denied'].includes(record.choice) &&
          Number.isFinite(record.at) && Date.now() >= record.at && Date.now() - record.at < maxAge) return record.choice;
    } catch { /* Private mode or disabled storage: default to no consent. */ }
    return null;
  }
  function saveChoice(value) {
    choice = value;
    try { localStorage.setItem(key, JSON.stringify({ version:1, choice:value, at:Date.now() })); }
    catch { /* Consent still applies to this page, but is not remembered. */ }
  }
  function safeReferrer() {
    try { const url = new URL(document.referrer); return url.origin + url.pathname; }
    catch { return ''; }
  }
  function loadAnalytics() {
    if (loaded || choice !== 'granted' || !/^G-[A-Z0-9]{4,20}$/.test(id)) return;
    loaded = true;
    window[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    });
    window.gtag('consent', 'update', {
      analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', id, {
      allow_google_signals:false, allow_ad_personalization_signals:false,
      // Do not pass form values, URL queries, hashes or sensitive referrer queries.
      page_location:location.origin + location.pathname, page_referrer:safeReferrer(),
    });
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.async = true;
    script.dataset.vikubAnalytics = '';
    document.head.append(script);
  }
  function clearAnalyticsCookies() {
    // Cookies can be blocked independently of storage in privacy-restricted contexts.
    try {
    const names = document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter((name) => /^_ga(?:_|$)/.test(name));
    const hostParts = location.hostname.split('.');
    const domains = ['', ...hostParts.map((_, index) => `.${hostParts.slice(index).join('.')}`)];
    const pathParts = location.pathname.split('/').filter(Boolean);
    const paths = new Set(['/', base, ...pathParts.map((_, index) => '/' + pathParts.slice(0,index+1).join('/'))]);
    for (const name of names) for (const domain of domains) for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax${domain ? `; domain=${domain}` : ''}`;
    }
    } catch { /* Revocation must work even when the cookie API is unavailable. */ }
  }
  function rejectAnalytics() {
    saveChoice('denied');
    window[`ga-disable-${id}`] = true;
    if (window.gtag) window.gtag('consent','update', {
      analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    });
    document.querySelector('[data-vikub-analytics]')?.remove();
    clearAnalyticsCookies();
    hideBanner();
    // A loaded tag can keep timers in memory. Reload after revocation to stop it.
    // No analytics script is inserted on the next load because denial is saved.
    if (loaded) {
      loaded = false;
      if (readChoice() === 'denied') location.reload();
    }
  }
  function hideBanner() {
    banner.hidden = true;
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
    returnFocus = null;
  }
  banner.querySelector('[data-analytics-accept]')?.addEventListener('click', () => {
    saveChoice('granted'); loadAnalytics(); hideBanner();
  });
  banner.querySelector('[data-analytics-reject]')?.addEventListener('click', rejectAnalytics);
  document.querySelectorAll('[data-analytics-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      returnFocus = button;
      banner.hidden = false;
      banner.querySelector('button')?.focus();
    });
  });
  banner.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); hideBanner(); }
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== key) return;
    choice = readChoice();
    if (choice === 'granted') { loadAnalytics(); hideBanner(); }
    else if (loaded) { window[`ga-disable-${id}`] = true; location.reload(); }
    else banner.hidden = choice === 'denied';
  });
  if (choice === 'granted') loadAnalytics();
  else if (choice === null) banner.hidden = false;
}
