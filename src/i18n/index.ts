/**
 * i18n mínimo: diccionarios JSON por idioma en src/i18n/<lang>/*.json.
 *  - ui.json            cadenas de interfaz (nav, pie, botones, formulario, SEO)
 *  - pages.json         prosa de las páginas (claves <pagina>.NNN, HTML inline permitido)
 *  - catalog-meta.json  nombres de proyecto, lugares, categorías, fondos (generado por scripts/import_inventory.py)
 *  - catalog-photos.json descripciones de foto por hash del texto ES (generado)
 * Todo lo que falte en un idioma cae al castellano (idioma fuente). Los fallbacks se cuentan
 * y se muestran al final del build (ver astro.config.mjs).
 */
export const LOCALES = ['es', 'ca', 'en', 'fr', 'de', 'it'] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = 'es';

export const LANG_NAMES: Record<Lang, string> = {
  es: 'Castellano', ca: 'Català', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano',
};
/** Etiquetas og:locale */
export const OG_LOCALES: Record<Lang, string> = {
  es: 'es_ES', ca: 'ca_ES', en: 'en_GB', fr: 'fr_FR', de: 'de_DE', it: 'it_IT',
};

type Dict = Record<string, string>;

const files = import.meta.glob<Dict>('./*/*.json', { eager: true, import: 'default' });

const dicts: Record<string, Dict> = {};
const photoDicts: Record<string, Dict> = {};
for (const [path, data] of Object.entries(files)) {
  const m = path.match(/^\.\/([a-z]{2})\/([a-z-]+)\.json$/);
  if (!m) continue;
  const [, lang, file] = m;
  const target = file === 'catalog-photos' ? photoDicts : dicts;
  target[lang] = Object.assign(target[lang] || {}, data);
}

/** Recuento de claves que han caído al castellano, por idioma (para el informe del build). */
export const fallbacks: Record<string, Set<string>> = {};
function noteFallback(lang: string, key: string) {
  if (lang === DEFAULT_LANG) return;
  (fallbacks[lang] ||= new Set()).add(key);
}

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

export function baseOf(lang: Lang): string {
  return `/${lang}/`;
}

function interpolate(s: string, lang: Lang, vars?: Record<string, string | number>): string {
  let out = s.replace(/\{\{base\}\}/g, baseOf(lang));
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Devuelve una función t(key, vars) ligada al idioma. */
export function useT(lang: Lang) {
  const d = dicts[lang] || {};
  const es = dicts[DEFAULT_LANG] || {};
  return function t(key: string, vars?: Record<string, string | number>): string {
    let s = d[key];
    if (s === undefined) {
      s = es[key];
      if (s === undefined) return key;
      noteFallback(lang, key);
    }
    return interpolate(s, lang, vars);
  };
}

/** Descripción de una foto por su hash (catalog-photos.json). */
export function photoDesc(lang: Lang, hash: string): string {
  if (!hash) return '';
  const s = photoDicts[lang]?.[hash];
  if (s !== undefined) return s;
  const es = photoDicts[DEFAULT_LANG]?.[hash];
  if (es === undefined) return '';
  noteFallback(lang, 'photo:' + hash);
  return es;
}

/** ¿Existe la clave en ese idioma (sin fallback)? */
export function has(lang: Lang, key: string): boolean {
  return dicts[lang]?.[key] !== undefined;
}

export function fallbackReport(): string[] {
  return LOCALES.filter((l) => l !== DEFAULT_LANG).map((l) => {
    const set = fallbacks[l];
    const n = set ? set.size : 0;
    const photos = set ? [...set].filter((k) => k.startsWith('photo:')).length : 0;
    return `${l}: ${n} claves en castellano (${photos} descripciones de foto, ${n - photos} de UI/prosa/catálogo)`;
  });
}
