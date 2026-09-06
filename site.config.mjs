/** Production domain. The repository name can remain vikoma-group. */
export const DOMAIN = 'vikub.com';
/** GitHub Actions supplies the actual Pages origin and base path. */
export const SITE_URL = process.env.SITE_URL || `https://${DOMAIN}`;
export const BASE_PATH = process.env.BASE_PATH || '/';
