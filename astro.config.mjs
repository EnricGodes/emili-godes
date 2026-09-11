// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://emili.godes.org';
const LOCALES = ['es', 'ca', 'en', 'fr', 'de', 'it'];

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'es',
    locales: LOCALES,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es', ca: 'ca', en: 'en', fr: 'fr', de: 'de', it: 'it' },
      },
      // 404 y datos no van al sitemap
      filter: (page) => !/\/404\/?$/.test(page) && !page.includes('/data/') && !page.includes('/legal/'),
    }),
  ],
  image: { domains: [] },
});
