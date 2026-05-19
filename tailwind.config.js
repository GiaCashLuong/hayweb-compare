/** @type {import('tailwindcss').Config} */
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
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};
