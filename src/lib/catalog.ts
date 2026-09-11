/**
 * Acceso tipado al catálogo (src/data/catalog.json, generado por scripts/import_inventory.py)
 * y resolución de textos por idioma.
 */
import catalogJson from '../data/catalog.json';
import destacadasJson from '../data/destacadas.json';
import { photoDesc, useT, type Lang } from '../i18n';

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

/** Slug de URL de un ámbito: guiones en vez de guiones bajos. */
export const ambitoUrlSlug = (ambito: string) => ambito.replace(/_/g, '-');
export const ambitoFromUrlSlug = (slug: string) => slug.replace(/-/g, '_');

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

/** Rutas de las fichas estáticas. */
export const ambitoPath = (lang: Lang, ambito: string) => `/${lang}/obra/${ambitoUrlSlug(ambito)}/`;
export const projectPath = (lang: Lang, ambito: string, slug: string) =>
  `/${lang}/obra/${ambitoUrlSlug(ambito)}/${slug}/`;
export const explorerHash = (ambito: string, slug?: string, idx?: number) =>
  '#' + ambito + (slug ? '/' + slug + (idx != null ? '/' + idx : '') : '');

export function findProject(ambito: string, slug: string): Project | undefined {
  return catalog.ambitos[ambito]?.projects.find((p) => p.slug === slug);
}
