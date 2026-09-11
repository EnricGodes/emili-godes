/**
 * Sitemap de imágenes (Google Images): una entrada por ficha de proyecto en castellano
 * (las fotos son las mismas en todos los idiomas; se evita repetirlas 6 veces).
 */
import type { APIRoute } from 'astro';
import { catalog, useCatalogText, projectPath, photoUrl } from '../lib/catalog';
import { SITE_URL } from '../lib/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = () => {
  const ct = useCatalogText('es');
  const urls: string[] = [];
  for (const [amb, a] of Object.entries(catalog.ambitos)) {
    for (const p of a.projects) {
      const imgs = p.photos.map((ph) =>
        `<image:image><image:loc>${SITE_URL}${photoUrl(ph.file)}</image:loc><image:title>${esc(ct.photoTitle(ph, p))}</image:title></image:image>`).join('');
      urls.push(`<url><loc>${SITE_URL}${projectPath('es', amb, p.slug)}</loc>${imgs}</url>`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('\n')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
