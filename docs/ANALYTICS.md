# Analítica: GTM + GA4 + Search Console

## Google Tag Manager
1. https://tagmanager.google.com → Crear cuenta «Emili Godes» → contenedor `emili.godes.org` (Web). Anota el ID `GTM-XXXXXXX`.
2. Cloudflare Pages → variable `PUBLIC_GTM_ID=GTM-XXXXXXX` → re-desplegar. El snippet ya está en `Base.astro`
   con **Consent Mode v2** (`analytics_storage` denegado por defecto; el banner lo concede).
3. En GTM: **Admin → Container settings → Enable consent overview** (recomendado).

## Google Analytics 4
1. https://analytics.google.com → Crear propiedad «Emili Godes» (zona horaria Madrid, moneda EUR) → flujo de datos Web `https://emili.godes.org` → anota el **Measurement ID** `G-XXXXXXXXXX`.
2. En GTM: Tags → New → **Google Tag** → Tag ID `G-XXXXXXXXXX` → Trigger *Initialization – All Pages*.
   En *Consent settings* del tag: *Require additional consent: analytics_storage* (o dejar el comportamiento
   integrado de Consent Mode; GA4 respeta `analytics_storage` automáticamente).
3. Evento de consentimiento: el banner hace `dataLayer.push({event:'consent_update', analytics_storage:'granted'|'denied'})`
   y `gtag('consent','update',…)`. No hace falta trigger extra: GA4 reacciona al update y envía el `page_view` pendiente.
4. **Enhanced measurement** en GA4 (scrolls, outbound clicks, file downloads → cubre el PDF del TFG).
5. Publicar el contenedor GTM (Submit). Comprobar con **GA4 → Admin → DebugView** + extensión Tag Assistant:
   sin aceptar cookies no debe haber hits con cookies; tras aceptar sí.
6. Data retention: Admin → Data settings → Data retention → 14 meses (coincide con la política de privacidad).

Eventos útiles que se pueden añadir en GTM (opcional): clic en `[data-vw="download"]` (descarga de foto),
`[data-vw="share"]`, `a[href$=".pdf"]`, cambio de idioma (`a[data-setlang]`), envío de contacto (`form#eg-contact`).

## Google Search Console
1. https://search.google.com/search-console → Añadir propiedad → **Dominio** `emili.godes.org` → verificación por registro DNS TXT
   (Namecheap → Advanced DNS → TXT Record · Host `emili` · Value `google-site-verification=…`).
   Alternativa: propiedad *Prefijo de URL* `https://emili.godes.org/` con meta tag → `PUBLIC_GSC_VERIFICATION=<token>` y re-desplegar.
2. Sitemaps → enviar `https://emili.godes.org/sitemap.xml` y `https://emili.godes.org/sitemap-images.xml`.
3. Al cabo de unos días: *Páginas* (cobertura), *Rendimiento* (consultas: emili godes, nova objectivitat, plácido fotos rodaje, laboratoris esteve…), *Mejoras → Rutas de exploración / Vídeos*.
4. Inspección de URL de una ficha de proyecto para comprobar hreflang y datos estructurados (ImageGallery, BreadcrumbList).

## Bing Webmaster Tools
https://www.bing.com/webmasters → Import from Google Search Console (importa la propiedad y los sitemaps).

## Cloudflare Web Analytics
Pages → Settings → Web Analytics. Sin cookies, no requiere consentimiento; cifras de visitas aunque el usuario rechace GA4.
