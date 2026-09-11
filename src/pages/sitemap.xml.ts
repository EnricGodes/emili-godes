/**
 * Sitemap propio: todas las páginas indexables en los 6 idiomas con sus alternates hreflang.
 * (Se hace a mano porque las fichas de temática y proyecto tienen slugs distintos por idioma.)
 */
import type { APIRoute } from 'astro';
import { LOCALES, DEFAULT_LANG, pagePath } from '../i18n';
import { PAGES, SITE_URL } from '../lib/site';
import { catalog, ambitoPath, projectPath } from '../lib/catalog';

type Alt = Record<string, string>; // lang → ruta absoluta

function entry(alts: Alt, lang: string, priority: string, changefreq: string) {
  const links = LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}${alts[l]}"/>`).join('');
  const xd = `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${alts[DEFAULT_LANG]}"/>`;
  return `<url><loc>${SITE_URL}${alts[lang]}</loc>${links}${xd}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export const GET: APIRoute = () => {
  const urls: string[] = [];
  // páginas estáticas
  for (const page of PAGES) {
    if (page.id === 'legal' || page.id === 'privacy' || page.id === 'cookies') continue; // noindex
    const alts: Alt = Object.fromEntries(LOCALES.map((l) => [l, pagePath(l, page.id)]));
    for (const l of LOCALES) urls.push(entry(alts, l, page.id === 'home' ? '1.0' : '0.8', 'monthly'));
  }
  // temáticas y proyectos
  for (const amb of catalog.ambito_order) {
    const alts: Alt = Object.fromEntries(LOCALES.map((l) => [l, ambitoPath(l, amb)]));
    for (const l of LOCALES) urls.push(entry(alts, l, '0.7', 'monthly'));
    for (const p of catalog.ambitos[amb].projects) {
      const palts: Alt = Object.fromEntries(LOCALES.map((l) => [l, projectPath(l, amb, p.slug)]));
      for (const l of LOCALES) urls.push(entry(palts, l, '0.6', 'yearly'));
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
