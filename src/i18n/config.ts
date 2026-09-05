import { locales as configuredLocales, defaultLocale as configuredDefault } from '../../locales.config.mjs';
export type Locale = 'ru' | 'it' | 'en';
export const locales = configuredLocales as Locale[];
export const enabledLocales: Locale[] = [...locales];
export const defaultLocale = configuredDefault as Locale;
export const htmlLang: Record<Locale, string> = { ru: 'ru', it: 'it', en: 'en' };
export const ogLocale: Record<Locale, string> = { ru: 'ru_RU', it: 'it_IT', en: 'en_GB' };
export const localeName: Record<Locale, string> = { ru: 'RU', it: 'IT', en: 'EN' };
export const localeFullName: Record<Locale, string> = { ru: 'Русский', it: 'Italiano', en: 'English' };
