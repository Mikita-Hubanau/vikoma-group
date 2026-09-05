/** Keep prebuilt pages accurate after the deadline, without rebuilding daily. */
const sections = [...document.querySelectorAll('[data-event-status]')];
function updateEventState() {
  const now = Date.now();
  for (const section of sections) {
    const deadline = Date.parse(section.dataset.deadline || '');
    const end = Date.parse(section.dataset.end || '');
    if (!Number.isFinite(deadline) || !Number.isFinite(end)) continue;
    const ended = now >= end;
    const open = !ended && now <= deadline;
    section.querySelectorAll('[data-event-open]').forEach((item) => { item.hidden = !open; });
    section.querySelectorAll('[data-event-archive]').forEach((item) => { item.hidden = open; });
    section.querySelectorAll('[data-event-closed]').forEach((item) => { item.hidden = open || ended; });
    section.querySelectorAll('[data-event-ended]').forEach((item) => { item.hidden = !ended; });
    // Guard activation even if an already-focused link survives a clock change.
    section.querySelectorAll('[data-registration-link]').forEach((link) => {
      if (!open) link.setAttribute('aria-disabled', 'true');
      else link.removeAttribute('aria-disabled');
    });
  }
}
for (const section of sections) {
  section.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-registration-link]') : null;
    if (target && Date.now() > Date.parse(section.dataset.deadline || '')) {
      event.preventDefault(); updateEventState();
    }
  });
}
if (sections.length) {
  updateEventState();
  window.setInterval(updateEventState, 30000);
  document.addEventListener('visibilitychange', updateEventState);
  window.addEventListener('pageshow', updateEventState);
}
