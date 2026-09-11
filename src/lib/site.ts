/** Constantes del sitio y registro de páginas estáticas (nav, sitemap, tarjetas de la home). */
export const SITE_URL = 'https://emili.godes.org';
export const SITE_NAME = 'Emili Godes';
export const CONTACT_FALLBACK_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || '';
export const GTM_ID = import.meta.env.PUBLIC_GTM_ID || '';
export const GSC_VERIFICATION = import.meta.env.PUBLIC_GSC_VERIFICATION || '';
export const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '';

import { LOCALES, pagePath, type Lang, type PageId } from '../i18n';
export { pagePath };

export interface PageDef {
  id: PageId | 'home';
  nav: boolean;     // aparece en la barra principal
  footer: boolean;  // aparece en el pie
}
export const PAGES: PageDef[] = [
  { id: 'home', nav: false, footer: false },
  { id: 'biografia', nav: true, footer: true },
  { id: 'obra', nav: true, footer: true },
  { id: 'mirada', nav: true, footer: true },
  { id: 'destacadas', nav: true, footer: true },
  { id: 'legado', nav: true, footer: true },
  { id: 'investigacion', nav: true, footer: true },
  { id: 'creditos', nav: false, footer: true },
  { id: 'contacto', nav: false, footer: true },
  { id: 'legal', nav: false, footer: false },
  { id: 'privacy', nav: false, footer: false },
  { id: 'cookies', nav: false, footer: false },
];
/** Ruta de la página en cada idioma, relativa a /{lang}/ (para hreflang y selector de idioma). */
export const pageAlternates = (id: PageId | 'home') =>
  Object.fromEntries(LOCALES.map((l) => [l, pagePath(l, id).slice(4)])) as Record<Lang, string>;
