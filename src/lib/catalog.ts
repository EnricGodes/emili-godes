/**
 * Acceso tipado al catálogo (src/data/catalog.json, generado por scripts/import_inventory.py)
 * y resolución de textos por idioma.
 */
import catalogJson from '../data/catalog.json';
import destacadasJson from '../data/destacadas.json';
import { LOCALES, photoDesc, useT, type Lang } from '../i18n';

export interface Photo {
  orig: string;
  file: string;
  w: number;
  h: number;
  desc: string; // hash en catalog-photos.json ('' si no hay descripción)
  fecha: string;
  lugar: string; // clave place.<hash> en catalog-meta.json ('' si no hay)
  categoria: string; // slug de ámbito
  fondo: string; // slug de fondo
  decada: string; // '1930' | 'sf'
}
export interface Project {
  slug: string;
  name: string; // clave project.<ambito>.<slug>
  lugar: string;
  fecha: string;
  year: number;
  decada: string;
  count: number;
  cover: string;
  fondos: string[];
  photos: Photo[];
}
export interface Ambito {
  count: number;
  decades: string[];
  fondos: string[];
  projects: Project[];
}
export interface Catalog {
  generated_at: string;
  ambito_order: string[];
  ambitos: Record<string, Ambito>;
  decades: string[];
  fondos: string[];
  total: number;
}
export interface Destacada extends Photo {
  ambito: string;
  project: string;
  name: string;
  orden: number;
}

export const catalog = catalogJson as Catalog;
export const destacadas = destacadasJson as Destacada[];

export const PHOTO_URL = '/photos/obra/';
export const THUMB_URL = '/photos/obra/thumbs/';
export const photoUrl = (file: string) => PHOTO_URL + file;
export const thumbUrl = (file: string) => THUMB_URL + file;

export const projectCount = () =>
  Object.values(catalog.ambitos).reduce((n, a) => n + a.projects.length, 0);

/** Título legible de una foto a partir de su descripción (misma regla que el importador). */
const KEYVAL = /^[\wÀ-ÿ .·/]{1,20}:/;
const DIM_ONLY = /^(m\.i\.\s*)?[\d.,]+\s*[x×]\s*[\d.,]+\s*(cm|mm)?\.?$/i;
function truncate(line: string) {
  line = line.trim();
  return line.length > 90 ? line.slice(0, 88).trimEnd() + '…' : line;
}
function isCaption(line: string) {
  if (line.length < 15 || !line.includes(' ') || KEYVAL.test(line) || DIM_ONLY.test(line)) return false;
  return /^[A-Za-zÀ-ÿ¿¡]/.test(line);
}
export function tituloFrom(desc: string, proyecto: string): string {
  proyecto = (proyecto || '').trim();
  for (const raw of (desc || '').split('\n')) {
    const m = raw.match(/^\s*(?:descripci[óo]n?|descripció|description|beschreibung|descrizione)\s*:\s*(.+)$/i);
    if (m && m[1].trim()) return truncate(m[1]);
  }
  for (const raw of (desc || '').split('\n')) {
    const line = raw.trim();
    if (line) return isCaption(line) ? truncate(line) : proyecto;
  }
  return proyecto;
}

/** Textos resueltos de un ámbito, proyecto o foto en un idioma. */
export function useCatalogText(lang: Lang) {
  const t = useT(lang);
  const ambitoLabel = (ambito: string) => t('category.' + ambito);
  const fondoLabel = (fondo: string) => t('fondo.' + fondo);
  const placeLabel = (key: string) => (key ? t(key) : '');
  const projectName = (p: Project) => t(p.name);
  const desc = (ph: Photo) => photoDesc(lang, ph.desc);
  const photoTitle = (ph: Photo, project?: Project) =>
    tituloFrom(desc(ph), project ? projectName(project) : '');
  const decadeLabel = (d: string) => (d === 'sf' ? t('obra.sf') : d + 's');
  /** Ámbitos ordenados alfabéticamente por su etiqueta en el idioma (difiere entre idiomas). */
  const orderedAmbitos = () =>
    catalog.ambito_order.slice().sort((a, b) => ambitoLabel(a).localeCompare(ambitoLabel(b), lang, { sensitivity: 'base' }));
  return { t, ambitoLabel, fondoLabel, placeLabel, projectName, desc, photoTitle, decadeLabel, orderedAmbitos };
}

/** Slug de URL a partir de un texto (misma regla que scripts/import_inventory.py). */
export function slugify(text: string): string {
  const t = (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return t || 'sin-titulo';
}

/**
 * Slugs de URL por idioma: la temática y el proyecto se nombran con su etiqueta traducida
 * (/ca/obra/ciencia-i-medicina/…, /en/obra/science-and-medicine/…). Sin traducción → castellano.
 * Las colisiones dentro de una temática se resuelven con sufijo -2, -3… en orden estable (slug ES).
 */
interface LangSlugs { ambito: Record<string, string>; ambitoByUrl: Record<string, string>; project: Record<string, Record<string, string>>; projectByUrl: Record<string, Record<string, string>> }
const slugCache = new Map<Lang, LangSlugs>();
function langSlugs(lang: Lang): LangSlugs {
  let ls = slugCache.get(lang);
  if (ls) return ls;
  const t = useT(lang);
  ls = { ambito: {}, ambitoByUrl: {}, project: {}, projectByUrl: {} };
  const usedA = new Set<string>();
  for (const amb of catalog.ambito_order) {
    let s = slugify(t('category.' + amb)), n = 2;
    while (usedA.has(s)) s = slugify(t('category.' + amb)) + '-' + n++;
    usedA.add(s); ls.ambito[amb] = s; ls.ambitoByUrl[s] = amb;
    const used = new Set<string>();
    ls.project[amb] = {}; ls.projectByUrl[amb] = {};
    for (const p of catalog.ambitos[amb].projects.slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
      const base = slugify(t(p.name));
      let ps = base, k = 2;
      while (used.has(ps)) ps = base + '-' + k++;
      used.add(ps); ls.project[amb][p.slug] = ps; ls.projectByUrl[amb][ps] = p.slug;
    }
  }
  slugCache.set(lang, ls);
  return ls;
}
export const ambitoUrlSlug = (lang: Lang, ambito: string) => langSlugs(lang).ambito[ambito];
export const projectUrlSlug = (lang: Lang, ambito: string, slug: string) => langSlugs(lang).project[ambito][slug];

/** Rutas de las fichas estáticas (relativas a la raíz, con idioma). */
export const ambitoPath = (lang: Lang, ambito: string) => `/${lang}/obra/${ambitoUrlSlug(lang, ambito)}/`;
export const projectPath = (lang: Lang, ambito: string, slug: string) =>
  `/${lang}/obra/${ambitoUrlSlug(lang, ambito)}/${projectUrlSlug(lang, ambito, slug)}/`;
/** Mismas rutas en todos los idiomas (para hreflang), relativas a /{lang}/. */
export const ambitoAlternates = (ambito: string) =>
  Object.fromEntries(LOCALES.map((l) => [l, ambitoPath(l, ambito).slice(4)])) as Record<Lang, string>;
export const projectAlternates = (ambito: string, slug: string) =>
  Object.fromEntries(LOCALES.map((l) => [l, projectPath(l, ambito, slug).slice(4)])) as Record<Lang, string>;
export const explorerHash = (ambito: string, slug?: string, idx?: number) =>
  '#' + ambito + (slug ? '/' + slug + (idx != null ? '/' + idx : '') : '');

export function findProject(ambito: string, slug: string): Project | undefined {
  return catalog.ambitos[ambito]?.projects.find((p) => p.slug === slug);
}
