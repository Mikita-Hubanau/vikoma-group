/** Contacts: localized copy comes from the same JSON files edited by the CMS.
 * Social addresses remain empty until the owner supplies approved URLs. */
import ru from '../content/pages/ru/contacts.json' with { type: 'json' };
import it from '../content/pages/it/contacts.json' with { type: 'json' };
import en from '../content/pages/en/contacts.json' with { type: 'json' };
import ruSettings from '../content/settings/ru.json' with { type: 'json' };

export const CONTACT_DETAILS = {
  italy: { phone: '+39 328 2303160', tel: '+393282303160' },
  belarus: { phone: '+375 29 6409880', tel: '+375296409880' },
  email: 'info@vikub.com',
};
export const CONTACT_SOCIALS = ruSettings.socials.map(({ label, href }) => ({ label, url: href }));
export const CONTACT_COPY = { ru, it, en };
/** @param {'it' | 'en' | 'ru'} locale */
export function getContactsCopy(locale) {
  const copy = CONTACT_COPY[locale];
  if (!copy) throw new Error(`Unsupported contacts locale: ${locale}`);
  return copy;
}
/** Reject unapproved protocols. Hide Telegram completely until a URL exists.
 * LinkedIn can remain a non-clickable label until its URL has been approved.
 * @param {{label: string, url: string}[]} [items] */
export function getContactSocials(items = CONTACT_SOCIALS) {
  return items.map(({ label, url }) => {
    const href = url.trim();
    if (href) {
      let parsed;
      try { parsed = new URL(href); }
      catch { throw new Error(`Invalid social URL for ${label}`); }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
        throw new Error(`Social URL for ${label} must be an HTTPS URL without credentials`);
      }
    }
    return { label, href };
  }).filter(({ label, href }) => label.toLowerCase() !== 'telegram' || Boolean(href));
}
