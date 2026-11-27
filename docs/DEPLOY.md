# Despliegue en Cloudflare Pages

## 1. Cuenta y proyecto
1. Crear cuenta en https://dash.cloudflare.com (gratis).
2. **Workers & Pages → Create → Pages → Connect to Git** → autorizar GitHub → repo `EnricGodes/emili-godes`.
3. Build settings: Framework preset **Astro** · Build command `npm run build` · Output directory `dist` · Root `/`.
   En *Environment variables* añadir `NODE_VERSION = 22`.
4. Save and Deploy. La primera build tarda ~2-3 min (sube ~7.400 ficheros). Queda en `https://emili-godes.pages.dev`.

## 2. Variables de entorno (Settings → Environment variables, Production)
| Variable | Valor | Para |
|---|---|---|
| `NODE_VERSION` | `22` | build |
| `PUBLIC_GTM_ID` | `GTM-XXXXXXX` | Google Tag Manager (sin él no hay analítica ni banner de cookies) |
| `PUBLIC_GSC_VERIFICATION` | token de Search Console (meta tag) | verificación (alternativa: DNS) |
| `PUBLIC_TURNSTILE_SITE_KEY` | clave pública Turnstile | anti-spam del formulario (opcional) |
| `TURNSTILE_SECRET` | clave secreta Turnstile | idem, lado servidor (opcional) |
| `RESEND_API_KEY` | la misma clave de Resend que usa Godesia | envío del formulario |
| `RESEND_FROM` | `Emili Godes <no-reply@godes.org>` | remitente (godes.org ya verificado en Resend) |
| `CONTACT_TO` | tu email | destinatario del formulario |
| `PUBLIC_CONTACT_EMAIL` | (vacío) | si se define, se muestra como alternativa al formulario |

Las `PUBLIC_*` se leen en el build (hay que re-desplegar tras cambiarlas); las otras las leen las Functions en tiempo real.
Tras añadir variables: Deployments → Retry deployment.

## 3. Dominio emili.godes.org (DNS en Namecheap)
1. Pages → Custom domains → **Set up a custom domain** → `emili.godes.org`. Cloudflare mostrará el CNAME a crear.
2. Namecheap → Domain List → godes.org → **Advanced DNS** → Add record: `CNAME` · Host `emili` · Value `emili-godes.pages.dev` · TTL automático.
3. Volver a Cloudflare y pulsar *Check DNS*. Activo en minutos (hasta 24 h en el peor caso). Certificado TLS automático.
4. Comprobar: `curl -I https://emili.godes.org/` → `301` a `/es/`; `curl -I -H "Accept-Language: fr" https://emili.godes.org/` → `/fr/`.

## 4. Turnstile y límite de envíos (recomendado en producción)
Cloudflare → Turnstile → Add site → dominio `emili.godes.org` (+ `localhost` para pruebas) → widget *Managed*.
Copiar Site key → `PUBLIC_TURNSTILE_SITE_KEY`, Secret key → `TURNSTILE_SECRET`. El código lo trata como
opcional, pero en producción conviene tener las dos: sin ellas el formulario solo tiene el honeypot.

**Estado (27-11-2026):** activo. Widget Turnstile «emili» (Managed, `emili.godes.org`) con las dos variables
en Pages; un POST sin token devuelve `403 {"error":"turnstile"}`.

Límite de envíos: Cloudflare → godes.org → **Security → Security rules → Rate limiting rules**. Regla activa
«emili.godes.org formulario de contacto»: `http.host eq "emili.godes.org" and http.request.uri.path eq
"/api/contact"`, por IP, **3 peticiones / 10 s → Block 10 s** (el plan Free solo permite periodos y bloqueos de
10 s y una única regla). Probado: la 4.ª petición seguida devuelve 429.
No se programa en la Function: un contador en memoria del Worker no es fiable.

Cabeceras (`public/_headers`): HSTS y las básicas de seguridad. Sin CSP a propósito: Astro emite scripts
inline y GTM/Consent Mode inyectan otros; una CSP estricta rompería la analítica.

Imagen OG de las fichas de proyecto: es la portada del proyecto tal cual (no se genera un 1200×630 por
ficha; coste de build alto para poco beneficio).

## 5. Cloudflare Web Analytics (sin cookies)
Pages → proyecto → Settings → **Web Analytics → Enable**. Gratis, sin banner, complementa a GA4.

## 6. Pruebas locales de las Functions
```bash
npm run build
cp .dev.vars.example .dev.vars   # rellenar RESEND_API_KEY, CONTACT_TO…
npx wrangler pages dev dist      # http://localhost:8788
curl -I -H "Accept-Language: de" http://localhost:8788/
```

## 7. Namecheap: reenvío info@godes.org (si algún día se quiere)
godes.org no tiene MX hoy (Resend solo envía). Namecheap → godes.org → **Email Forwarding** (gratis con BasicDNS):
`info` → tu Gmail. Namecheap añade los MX (`eforward*.registrar-servers.com`). Comprobar que no rompe el
registro `send.godes.org` (MX de rebotes de Resend, en subdominio aparte: no interfiere).

## 8. Checklist tras el primer deploy
- [ ] `https://emili.godes.org/es/` 200 y `https://emili.godes.org/` 301
- [ ] `https://emili.godes.org/sitemap.xml`, `/sitemap-images.xml`, `/robots.txt`
- [ ] Search Console: propiedad `emili.godes.org` (dominio, por DNS TXT en Namecheap) → Sitemaps → enviar los dos
- [ ] Bing Webmaster Tools → Import from Google Search Console
- [ ] Formulario de contacto: enviar una prueba
- [ ] Banner de cookies visible y GA4 DebugView solo tras aceptar (ver ANALYTICS.md)
- [ ] Godesia: `/emili-godes/` redirige aquí
