import { LOCALES } from '../i18n';
/** getStaticPaths de las páginas que solo varían por idioma. */
export const langPaths = () => LOCALES.map((lang) => ({ params: { lang } }));
