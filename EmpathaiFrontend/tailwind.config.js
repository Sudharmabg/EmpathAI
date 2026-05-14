/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'lora': ['Lora', 'serif'],
      },
      colors: {
        'sage-green': '#9CAF88',
        'warm-apricot': '#F4B942',
        'powder-blue': '#A8DADC',
        'dusty-lilac': '#C8A8E9',
        'primary': '#2D1B69',
        'dark-navy': '#1E1B4B',
        'navy-purple': '#3B2F5C',
        'light-purple': '#6366F1',
      }
    },
  },
  plugins: [],
}