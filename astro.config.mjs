import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx      from '@astrojs/mdx';
import sitemap  from '@astrojs/sitemap';
import netlify  from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://daltonperrine.com',

  // ── Rendering ──────────────────────────────────────────────────────────────
  // 'static' in Astro 5 behaves like the old 'hybrid' mode:
  // pages are statically pre-rendered by default.
  // Pages that need server-side rendering (homework portal, admin dashboard)
  // opt in with:  export const prerender = false;
  output:  'static',
  adapter: netlify(),

  integrations: [
    tailwind(),
    mdx(),
    sitemap({
      // Keep private/admin/homework pages out of the public sitemap
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/homework'),
    }),
  ],
});
