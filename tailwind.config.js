/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        soul: {
          teal: '#009c99',
          yellow: '#e8d92e',
          gold: '#f5cc78',
          orange: '#e8b52e',
          green: '#08704F',
          dark: '#084F4F',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
