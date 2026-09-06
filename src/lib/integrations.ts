import defaults from '../content/system/integrations.json';
import { validateIntegrations } from './config-validation.mjs';

/** These are public IDs/URLs, never SMTP passwords or API secrets. */
export function getIntegrations(): { googleAnalyticsId: string; contactFormEndpoint: string; registrationUrl: string; registrationFormEndpoint: string } {
  return validateIntegrations({
    googleAnalyticsId: import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID || defaults.googleAnalyticsId,
    contactFormEndpoint: import.meta.env.PUBLIC_CONTACT_FORM_ENDPOINT || defaults.contactFormEndpoint,
    registrationUrl: import.meta.env.PUBLIC_REGISTRATION_URL || defaults.registrationUrl,
    registrationFormEndpoint: import.meta.env.PUBLIC_REGISTRATION_FORM_ENDPOINT || defaults.registrationFormEndpoint,
  });
}
