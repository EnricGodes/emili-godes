/**
 * /data/catalog.<lang>.json — catálogo con los textos resueltos en un idioma, para el explorador
 * cliente de /obra/. Generado en el build (uno por idioma).
 */
import type { APIRoute } from 'astro';
import { LOCALES, useT, type Lang } from '../../i18n';
import { catalog, useCatalogText, ambitoPath, projectPath, ambitoUrlSlug, projectUrlSlug, photoUrl, thumbUrl } from '../../lib/catalog';

export function getStaticPaths() {
  return LOCALES.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const t = useT(lang);
  const ct = useCatalogText(lang);
  const ambitos: Record<string, unknown> = {};
  for (const [amb, a] of Object.entries(catalog.ambitos)) {
    ambitos[amb] = {
      label: ct.ambitoLabel(amb),
      uslug: ambitoUrlSlug(lang, amb),
      intro: t('obra.intro.' + amb),
      url: ambitoPath(lang, amb),
      count: a.count,
      decades: a.decades,
      fondos: a.fondos,
      projects: a.projects.map((p) => ({
        slug: p.slug,
        uslug: projectUrlSlug(lang, amb, p.slug),
        name: ct.projectName(p),
        lugar: ct.placeLabel(p.lugar),
        fecha: p.fecha,
        year: p.year,
        decada: p.decada,
        count: p.count,
        cover: thumbUrl(p.cover),
        fondos: p.fondos,
        url: projectPath(lang, amb, p.slug),
        photos: p.photos.map((ph) => ({
          orig: ph.orig,
          image: photoUrl(ph.file),
          thumb: thumbUrl(ph.file),
          w: ph.w, h: ph.h,
          title: ct.photoTitle(ph, p),
          desc: ct.desc(ph),
          fecha: ph.fecha,
          lugar: ct.placeLabel(ph.lugar),
          categoria: ct.ambitoLabel(ph.categoria),
          fondo: ph.fondo,
          decada: ph.decada,
        })),
      })),
    };
  }
  const fondos: Record<string, string> = {};
  for (const f of catalog.fondos) fondos[f] = ct.fondoLabel(f);
  return new Response(JSON.stringify({
    lang, generated_at: catalog.generated_at, total: catalog.total,
    ambito_order: ct.orderedAmbitos(), decades: catalog.decades, fondos_order: catalog.fondos, fondos, ambitos,
  }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
