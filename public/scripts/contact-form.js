/** Progressive enhancement for a real HTTPS form backend (e.g. Formspree).
 * No SMTP secrets, localStorage of personal data, simulated success or silent retries.
 * The normal POST action still works without JavaScript once configured.
 */
for (const form of document.querySelectorAll('[data-contact-form], [data-registration-form]')) {
  const button = form.querySelector('[data-submit-button]');
  const status = form.querySelector('[data-form-status]');
  const fieldset = form.querySelector('fieldset');
  if (!(form instanceof HTMLFormElement) || !button || !status || !fieldset) continue;
  let submitting = false;
  let completed = false;
  const registration = form.hasAttribute('data-registration-form');
  const message = (key, state = 'error') => {
    status.textContent = form.dataset[key] || form.dataset.error || '';
    status.dataset.state = state;
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || completed || form.dataset.configured !== 'true') return;
    if (registration && Date.now() > Date.parse(form.dataset.deadline || '')) { message('closed'); return; }
    if (!form.reportValidity()) return;
    const payload = new FormData(form);
    if (String(payload.get('_gotcha') || '').trim()) { message('error'); return; }
    let endpoint;
    try {
      endpoint = new URL(form.action);
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('Unsafe endpoint');
    } catch { message('error'); return; }

    submitting = true;
    button.disabled = true;
    fieldset.disabled = true;
    button.textContent = form.dataset.sending || '';
    form.setAttribute('aria-busy', 'true');
    status.textContent = '';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint.href, {
        method: 'POST', body: payload, headers: { Accept: 'application/json' },
        credentials: 'omit', redirect: 'error', signal: controller.signal,
        referrerPolicy: 'strict-origin-when-cross-origin',
      });
      if (!response.ok) {
        message(response.status === 429 ? 'rateLimited' : response.status === 422 || response.status === 400 ? 'validationError' : 'error');
        return;
      }
      // A 200 HTML landing page or an arbitrary JSON object is not proof of acceptance.
      if (!response.headers.get('content-type')?.includes('application/json')) {
        message('uncertain'); return;
      }
      const result = await response.json();
      if (!result || (result.ok !== true && result.success !== true)) {
        message('uncertain'); return;
      }
      form.reset();
      if (registration) { completed = true; fieldset.hidden = true; }
      message('success', 'success');
    } catch {
      // Timeouts and disconnected responses can happen after the server accepted
      // the message. Do not automatically retry and create duplicate enquiries.
      message('uncertain');
    } finally {
      clearTimeout(timeout);
      submitting = false;
      fieldset.disabled = completed;
      button.disabled = completed;
      button.textContent = form.dataset.submit || '';
      form.removeAttribute('aria-busy');
      status.focus({ preventScroll: true });
    }
  });
}
