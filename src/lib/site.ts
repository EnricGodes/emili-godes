/** Constantes del sitio y registro de páginas estáticas (nav, sitemap, tarjetas de la home). */
export const SITE_URL = 'https://emili.godes.org';
export const SITE_NAME = 'Emili Godes';
export const CONTACT_FALLBACK_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || '';
export const GTM_ID = import.meta.env.PUBLIC_GTM_ID || '';
export const GSC_VERIFICATION = import.meta.env.PUBLIC_GSC_VERIFICATION || '';
export const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '';

export interface PageDef {
  id: string;      // clave de nav.* y seo.*
  path: string;    // relativo a /{lang}/ (con barra final, '' = home)
  nav: boolean;    // aparece en la barra principal
}
export const PAGES: PageDef[] = [
  { id: 'home', path: '', nav: false },
  { id: 'biografia', path: 'biografia/', nav: true },
  { id: 'obra', path: 'obra/', nav: true },
  { id: 'mirada', path: 'mirada-moderna/', nav: true },
  { id: 'destacadas', path: 'destacadas/', nav: true },
  { id: 'legado', path: 'legado/', nav: true },
  { id: 'investigacion', path: 'investigacion/', nav: true },
  { id: 'creditos', path: 'creditos/', nav: false },
  { id: 'contacto', path: 'contacto/', nav: false },
];
export const pagePath = (id: string) => PAGES.find((p) => p.id === id)?.path ?? '';
