/** Shared, dependency-free validation: used by the site, prebuild and tests. */
export function validateHttps(value, name) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name}: требуется полный HTTPS-адрес.`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error(`${name}: разрешён HTTPS без пароля, логина и #фрагмента.`);
  }
  return value;
}

export function validateIntegrations(input) {
  const result = {
    googleAnalyticsId: String(input.googleAnalyticsId ?? '').trim(),
    contactFormEndpoint: String(input.contactFormEndpoint ?? '').trim(),
    registrationUrl: String(input.registrationUrl ?? '').trim(),
  };
  if (result.googleAnalyticsId && !/^G-[A-Z0-9]{4,20}$/.test(result.googleAnalyticsId)) {
    throw new Error('Google Analytics: нужен Measurement ID формата G-…, а не номер ресурса.');
  }
  validateHttps(result.contactFormEndpoint, 'Адрес обработчика формы');
  validateHttps(result.registrationUrl, 'Google Forms');
  if (result.registrationUrl) {
    const url = new URL(result.registrationUrl);
    if (!(url.hostname === 'forms.gle' && url.pathname.length > 1) &&
        !(url.hostname === 'docs.google.com' && url.pathname.startsWith('/forms/'))) {
      throw new Error('Регистрация: требуется ссылка Google Forms (forms.gle или docs.google.com/forms/).');
    }
  }
  return result;
}

export function validateSeminar(input) {
  for (const key of ['startAt', 'registrationDeadline']) {
    if (typeof input[key] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/.test(input[key]) || !Number.isFinite(Date.parse(input[key]))) {
      throw new Error(`Семинар: ${key} должен быть датой ISO 8601 с часовым поясом.`);
    }
    // Date.parse normalises impossible days (e.g. 30 February); reject them.
    const parts = input[key].match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)/).slice(1).map(Number);
    const [year, month, day, hour, minute, second] = parts;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) {
      throw new Error(`Семинар: ${key} содержит несуществующую календарную дату или время.`);
    }
  }
  if (Date.parse(input.registrationDeadline) >= Date.parse(input.startAt)) {
    throw new Error('Срок регистрации должен завершаться до начала семинара.');
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 1440) {
    throw new Error('Продолжительность семинара должна быть от 1 до 1440 минут.');
  }
  if (typeof input.timeZone !== 'string' || !input.timeZone.trim()) throw new Error('Не указан часовой пояс семинара.');
  try { new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format(); }
  catch { throw new Error('Неизвестный часовой пояс семинара. Используйте IANA, например Europe/Rome.'); }
  return input;
}

export function getEventState(seminar, now = Date.now()) {
  const start = Date.parse(seminar.startAt);
  const end = start + seminar.durationMinutes * 60_000;
  if (now >= end) return 'ended';
  if (now > Date.parse(seminar.registrationDeadline)) return 'closed';
  return 'open';
}
