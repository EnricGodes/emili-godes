/**
 * GET / — la raíz no tiene contenido: redirige al idioma del visitante.
 * Prioridad: cookie eg_lang (elección explícita) → Accept-Language → es.
 */
const LOCALES = ['es', 'ca', 'en', 'fr', 'de', 'it'];

function pick(accept: string | null): string {
  if (!accept) return 'es';
  const ranked = accept.split(',').map((part, i) => {
    const [tag, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    return { tag: tag.toLowerCase(), q: q ? parseFloat(q.slice(2)) || 0 : 1, i };
  }).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (LOCALES.includes(base)) return base;
  }
  return 'es';
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)eg_lang=([a-z]{2})/);
  const lang = m && LOCALES.includes(m[1]) ? m[1] : pick(request.headers.get('Accept-Language'));
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: `/${lang}/${url.search}`, Vary: 'Accept-Language, Cookie', 'Cache-Control': 'no-store' },
  });
};
