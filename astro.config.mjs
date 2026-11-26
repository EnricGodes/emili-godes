// @ts-check
import { defineConfig } from 'astro/config';

import { SITE_URL as SITE } from './src/lib/constants.ts';
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
  integrations: [],
  image: { domains: [] },
});
