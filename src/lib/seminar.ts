import data from '../content/system/seminar.json';
import { validateSeminar, getEventState } from './config-validation.mjs';
import type { Locale } from '../i18n/config';
export const seminar = validateSeminar(data) as typeof data;
export const seminarEnd = new Date(Date.parse(seminar.startAt) + seminar.durationMinutes * 60_000).toISOString();
export const eventState = (now = Date.now()) => getEventState(seminar, now);
export function eventDate(locale: Locale, date = seminar.startAt): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: seminar.timeZone,
  }).format(new Date(date)).replace(/\s?г\.$/, '');
}
export function eventTime(locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: seminar.timeZone,
  }).format(new Date(seminar.startAt));
}
export const withDate = (text: string, date: string) => text.replaceAll('{date}', date);

export function eventDuration(locale: Locale): string {
  const wholeHours = seminar.durationMinutes % 60 === 0;
  return new Intl.NumberFormat(locale, {
    style: 'unit', unit: wholeHours ? 'hour' : 'minute', unitDisplay: 'long',
  }).format(wholeHours ? seminar.durationMinutes / 60 : seminar.durationMinutes);
}
