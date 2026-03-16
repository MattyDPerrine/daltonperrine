# FM Dalton Perrine – Chess Coaching Website

## Quick Start

Open a terminal in this project folder and run:

```bash
npm install
npm run dev
```

Then open http://localhost:4321 in your browser to preview the site.

## Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Navbar.astro      # Sticky nav with mobile hamburger
│   │   └── Footer.astro      # Footer with social links
│   ├── content/
│   │   ├── config.ts         # Blog content collection schema
│   │   └── blog/             # Drop .md or .mdx blog posts here
│   ├── layouts/
│   │   └── Layout.astro      # Shared page wrapper (head, nav, footer)
│   ├── pages/
│   │   ├── index.astro       # Homepage
│   │   └── 404.astro         # 404 page
│   └── styles/
│       └── global.css        # Tailwind directives + custom utility classes
├── astro.config.mjs
├── tailwind.config.mjs
├── netlify.toml              # Netlify deployment config
└── package.json
```

## Deploying to Netlify

1. Push this folder to a GitHub repository.
2. Log into Netlify → "Add new site" → "Import an existing project."
3. Connect your GitHub repo.
4. Netlify auto-detects the `netlify.toml` — build command and publish dir are already set.
5. Add your environment variables (from `.env`) in Netlify → Site settings → Environment variables.

## Tech Stack

- [Astro 5](https://astro.build) – framework
- [Tailwind CSS 3](https://tailwindcss.com) – styling
- [@astrojs/mdx](https://docs.astro.build/en/guides/integrations-guide/mdx/) – MDX support for blog
- [Netlify](https://netlify.com) – hosting
