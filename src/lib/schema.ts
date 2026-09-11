/** Generadores de JSON-LD (schema.org). */
import { SITE_URL, SITE_NAME } from './site';
import type { Lang } from '../i18n';

const PERSON_ID = `${SITE_URL}/#emili-godes`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const SAME_AS = [
  'https://ca.wikipedia.org/wiki/Emili_Godes_i_Hurtado',
  'https://es.wikipedia.org/wiki/Emili_Godes_Hurtado',
  'https://www.wikidata.org/wiki/Q8775491',
  'https://viaf.org/viaf/50038549/',
  'https://rkd.nl/explore/artists/394650',
  'https://d-nb.info/gnd/119544350',
];

const JOB: Record<Lang, string> = {
  es: 'Fotógrafo', ca: 'Fotògraf', en: 'Photographer', fr: 'Photographe', de: 'Fotograf', it: 'Fotografo',
};

export function person(lang: Lang, description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Emili Godes',
    alternateName: ['Emili Godes Hurtado', 'Emili Godes i Hurtado', 'Emilio Godes'],
    givenName: 'Emili',
    familyName: 'Godes',
    birthDate: '1895-04-14',
    deathDate: '1970-02-20',
    birthPlace: { '@type': 'Place', name: 'Barcelona' },
    deathPlace: { '@type': 'Place', name: 'Barcelona' },
    nationality: { '@type': 'Country', name: 'España' },
    jobTitle: JOB[lang],
    hasOccupation: { '@type': 'Occupation', name: JOB[lang] },
    image: `${SITE_URL}/assets/emili-godes-laboratorio.jpg`,
    url: `${SITE_URL}/${lang}/`,
    sameAs: SAME_AS,
    ...(description ? { description } : {}),
  };
}

export function website(lang: Lang, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: lang,
    description,
    about: { '@id': PERSON_ID },
    publisher: { '@type': 'Organization', name: 'Família Godes' },
  };
}

export interface Crumb { name: string; url: string }
export function breadcrumb(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url.startsWith('http') ? it.url : SITE_URL + it.url,
    })),
  };
}

export function article(lang: Lang, opts: { url: string; headline: string; description: string; image?: string; datePublished?: string; dateModified?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: SITE_URL + opts.url,
    headline: opts.headline,
    description: opts.description,
    inLanguage: lang,
    image: opts.image ? [SITE_URL + opts.image] : undefined,
    about: { '@id': PERSON_ID },
    author: { '@type': 'Organization', name: 'Família Godes' },
    publisher: { '@type': 'Organization', name: 'Família Godes' },
    datePublished: opts.datePublished || '2026-07-19',
    dateModified: opts.dateModified || new Date().toISOString().slice(0, 10),
  };
}

export interface GalleryImage { url: string; name: string; caption?: string; width: number; height: number; thumbnail: string; dateCreated?: string; credit?: string }
export function imageGallery(lang: Lang, opts: { url: string; name: string; description: string; images: GalleryImage[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    mainEntityOfPage: SITE_URL + opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: lang,
    about: { '@id': PERSON_ID },
    creator: { '@id': PERSON_ID },
    associatedMedia: opts.images.slice(0, 60).map((im) => ({
      '@type': 'ImageObject',
      contentUrl: SITE_URL + im.url,
      thumbnailUrl: SITE_URL + im.thumbnail,
      name: im.name,
      ...(im.caption ? { caption: im.caption } : {}),
      width: im.width,
      height: im.height,
      creator: { '@id': PERSON_ID },
      creditText: im.credit || 'Emili Godes',
      copyrightNotice: '© Família Godes / ' + (im.credit || ''),
      ...(im.dateCreated ? { dateCreated: im.dateCreated } : {}),
    })),
  };
}
