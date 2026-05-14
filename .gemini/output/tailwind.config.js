/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        braga: {
          primary: '#5c2d91',
          dark: '#1A1A1A',
          gray: '#F8F9FA',
        },
        primary: '#5c2d91',
        secondary: '#000000',
        background: '#FFFFFF',
        surface: '#F8F9FA',
        text: '#1A1A1A',
      },
      fontFamily: {
        brand: ['Industry', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'brand': '0px',
      },
      boxShadow: {
        'brand': '0 4px 12px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
