import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy:          '#1B1F3B',
        charcoal:      '#2D2D2D',
        gold:          '#C9A227',
        'gold-hover':  '#B8911F',
        'off-white':   '#F7F5F0',
        'text-primary':   '#1B1F3B',
        'text-secondary': '#555555',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        inter:    ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(27,31,59,0.08)',
        navbar: '0 2px 12px 0 rgba(27,31,59,0.18)',
      },
      typography: (theme) => ({
        chess: {
          css: {
            '--tw-prose-body':         theme('colors.text-secondary'),
            '--tw-prose-headings':     theme('colors.navy'),
            '--tw-prose-lead':         theme('colors.text-secondary'),
            '--tw-prose-links':        theme('colors.gold'),
            '--tw-prose-bold':         theme('colors.navy'),
            '--tw-prose-counters':     theme('colors.gold'),
            '--tw-prose-bullets':      theme('colors.gold'),
            '--tw-prose-hr':           theme('colors.navy / 0.12'),
            '--tw-prose-quotes':       theme('colors.navy'),
            '--tw-prose-quote-borders':theme('colors.gold'),
            '--tw-prose-captions':     theme('colors.text-secondary'),
            '--tw-prose-code':         theme('colors.navy'),
            '--tw-prose-pre-code':     theme('colors.off-white'),
            '--tw-prose-pre-bg':       theme('colors.navy'),
            '--tw-prose-th-borders':   theme('colors.navy / 0.2'),
            '--tw-prose-td-borders':   theme('colors.navy / 0.1'),
            // Heading font
            'h1, h2, h3, h4, h5, h6': {
              fontFamily: '"Playfair Display", serif',
            },
            // Body font
            'p, li, blockquote': {
              fontFamily: 'Inter, sans-serif',
            },
            // Link hover
            'a:hover': {
              color: theme('colors.gold-hover'),
            },
            // Max readable width handled by container, not prose
            maxWidth: 'none',
          },
        },
      }),
    },
  },
  plugins: [
    typography,
  ],
};
