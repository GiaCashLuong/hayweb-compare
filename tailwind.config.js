/** @type {import('tailwindcss').Config} */
// S5B 2026-05-20 Day 39: ADD navy + gold + cream tokens for HAYWEB family palette alignment.
// Keep bone/ink/cream-warm body for long-form readability (7:1 contrast preserved).
// Navy/gold used ONLY for: header strips, CTA fills, accent borders, key data callouts (18pt+).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Fraunces Variable"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#1a1a1a',
        bone: '#fafaf7',
        accent: '#a8794d',
        pass: '#2f7d4d',
        warn: '#b8801b',
        fail: '#a53a2a',
        rule: '#e5e2dc',
        // S5B HAYWEB family tokens (mirrors mockup-A/tailwind.config.js navy + gold)
        navy: {
          DEFAULT: '#0B1426',
          900: '#0B1426',
          800: '#131E36',
          700: '#1C2A4A',
        },
        gold: {
          DEFAULT: '#B8860B',
          champagne: '#D4AF37',
          shimmer: '#E8C870',
          deep: '#8B6508',
        },
        cream: {
          DEFAULT: '#F5EFD8',
          warm: '#EDE5C8',
        },
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};
