# CLAUDE.md

Guía para Claude Code en este repositorio.

## Qué es

Web pública y multilingüe (es, ca, en, fr, de, it) dedicada al fotógrafo **Emili Godes (1895–1970)**:
biografía, catálogo de 2.801 fotografías en 255 proyectos, «Una mirada moderna», destacadas, legado,
investigación, créditos, contacto y legales. Producción: **https://emili.godes.org** (Cloudflare Pages).
Nació como subcarpeta de Godesia (`godesia/frontend/emili-godes`) y en septiembre de 2026 se separó en
este proyecto independiente. No usa base de datos: la verdad es el Excel + carpetas de fotos.

## Stack

- **Astro 7** estático (`npm run build` → `dist/`, ~7.400 ficheros, 1.660 páginas). Sin framework UI ni Tailwind: CSS propio en `src/styles/emili.css`, fuentes autoalojadas (@fontsource Manrope Variable + Noto Serif).
- Scripts de datos en **Python 3** (Pillow, openpyxl).
- **Cloudflare Pages Functions** (`functions/`): `index.ts` redirige `/` al idioma del navegador (cookie `eg_lang` > Accept-Language > es); `api/contact.ts` envía el formulario por Resend (+ Turnstile opcional).

## Estructura

```
src/
  i18n/<lang>/        ui.json · pages.json · legal.json · catalog-meta.json · catalog-photos.json
  i18n/index.ts       useT(lang) con fallback a es; photoDesc(); LOCALES
  data/catalog.json   estructura del catálogo (generado) · destacadas.json · featured-series.json (series de la portada, editable)
  lib/catalog.ts      tipos, rutas (ambitoPath/projectPath), tituloFrom, useCatalogText(lang)
  lib/schema.ts       JSON-LD (Person, WebSite, Article, ImageGallery, BreadcrumbList)
  lib/site.ts         SITE_URL, PAGES (registro de páginas/nav), env PUBLIC_*
  layouts/Base.astro  <head> SEO completo (title, description, canonical, hreflang ×6 + x-default, OG, JSON-LD), GTM + Consent Mode, header/footer/cookies
  components/         Header, Footer, LangSwitch, CookieConsent, UiJson (strings para JS cliente), LegalPage
  pages/[lang]/index.astro      portada
  pages/[lang]/[slug].astro     despachador de secciones con slug traducido (ui.json slug.<id>): /es/biografia/, /en/biography/, /de/impressum/…
  components/pages/*.astro      contenido de cada sección (Biografia, Obra=explorador, MiradaModerna, Destacadas, Legado, Investigacion, Creditos, Contacto) + LegalPage
  pages/[lang]/[obra]/[ambito]/index · [project]   9 temáticas y 255 fichas, todo con slugs traducidos (/en/work/science-and-medicine/…)
  pages/404.astro               404 único (dist/404.html, el que usa Cloudflare Pages)
  pages/data/catalog.[lang].json.ts   JSON resuelto por idioma para el explorador
  pages/sitemap-images.xml.ts         sitemap de imágenes (Google Images)
  scripts/            explorer.ts (explorador, hash #ambito/proyecto/idx) · viewer.ts (visor) · gallery.ts (fichas estáticas, #foto-N)
public/photos/obra/   2.801 JPEG (1000 px) + thumbs/ (480 px)   ← en el repo, generados por el importador
public/photos/bio/    fotos de la biografía · public/assets/ hero, mirada/, PDF, og/
scripts/              import_inventory.py · i18n_export.py · i18n_apply.py · og_images.py
translations/         README.md, PROMPT.md, glossary.md, source/ (exportado), incoming/<lang>/ (devuelto por ChatGPT)
_resources/           (gitignored) Excel del inventario, originales por fondo, .md de contenido, TFG
docs/                 DEPLOY.md (Cloudflare, DNS, variables) · ANALYTICS.md (GTM, GA4, Search Console)
```

## Flujos habituales

- **Desarrollo:** `npm run dev` (http://localhost:4321/es/). `npm run build && npx astro preview`. Con Functions: `npm run build && npx wrangler pages dev dist`.
- **Actualizar el catálogo:** editar `_resources/archivo/inventario_maestro_consolidado_traduccion.xlsx` (hoja `Inventario`) o añadir fotos en las carpetas de `FOLDER` → `python3 scripts/import_inventory.py` → revisar avisos (SIN ARCHIVO / cobertura inversa) → `python3 scripts/i18n_export.py --only-missing en` etc. para traducir lo nuevo → build → commit (incluye `public/photos/obra/`).
  - Dedup por nombre exacto de archivo; nombres distintos nunca se fusionan. Un proyecto = `proyecto_es` exacto (una preposición distinta parte la serie: arreglar en el Excel, no con matching difuso).
  - Claves de texto estables: `project.<ambito>.<slug>`, `place.<hash>`, `category.<slug>`, `fondo.<slug>`, descripciones por hash sha1[:12] del texto ES.
- **Traducir:** ver `translations/README.md` (exportar → ChatGPT → `incoming/<lang>/` → `i18n_apply.py <lang>`). El build cae al castellano en lo que falte; `i18n_apply.py --status` da la cobertura.
- **Cambiar textos:** `src/i18n/es/*.json` es la fuente; los enlaces se escriben en castellano (`{{base}}biografia/`, `{{base}}legal/privacidad/`, `{{base}}obra/#fotografia_artistica`) y `t()` los convierte a la ruta del idioma (`localizeLinks` en `src/i18n/index.ts`); los párrafos con HTML se pintan con `set:html`.
- **URLs por idioma:** secciones (`slug.*` en ui.json), temáticas y proyectos (slugify de la etiqueta traducida, `src/lib/catalog.ts`); el hash del explorador usa esos mismos slugs (`#science-and-medicine/torre-marimon`) y acepta las claves internas antiguas. Cambiar un slug cambia la URL pública: hacerlo antes de indexar o añadir una redirección en `public/_redirects`.
- **SEO:** títulos/descripciones en `ui.json` (`seo.*`); `Base.astro` añade « · Emili Godes» salvo que el título ya lo contenga. Páginas legales y 404: `noindex` y fuera del sitemap.
- **Desplegar:** push a `main` → Cloudflare Pages construye (`npm run build`, output `dist`). Variables de entorno en `docs/DEPLOY.md`.

## Reglas

- Sin referencias a Godesia en la web (proyecto independiente).
- `public/photos/obra/` lo escribe solo el importador (borra huérfanas). No editar a mano.
- Cloudflare Pages: máximo 20.000 ficheros por deploy y 25 MB por fichero. Hoy ~7.400.
- Commit + push a GitHub (`EnricGodes/emili-godes`) al terminar cada bloque de trabajo.
