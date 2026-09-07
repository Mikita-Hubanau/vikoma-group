/** Pure validation helpers, shared by browser controls and unit tests. */
export function hasText(value) { return typeof value === 'string' && value.trim().length > 0; }
export function isPhone(value) {
  if (typeof value !== 'string') return false;
  const phone = value.trim();
  const digits = phone.replace(/\D/g, '');
  return /^\+?[0-9\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15 && phone.length <= 40;
}
export function validateContactControls(form) {
  if (!form.hasAttribute('data-contact-form')) return true;
  const message = form.dataset.validationError || 'Please check this field.';
  let valid = true;
  for (const name of ['name','company','message','phone']) {
    const control = form.elements.namedItem(name);
    if (!control || typeof control.setCustomValidity !== 'function') continue;
    const okay = name === 'phone' ? isPhone(control.value) : hasText(control.value);
    control.setCustomValidity(okay ? '' : message);
    valid = valid && okay;
  }
  return valid;
}
