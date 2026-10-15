/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { sahaba: { 50:'#effaf5',100:'#d9f2e6',500:'#15956c',600:'#0e7957',700:'#0e6b50',800:'#0a4f3d',900:'#083d30' } }, fontFamily: { sans:['Plus Jakarta Sans','Inter','sans-serif'], display:['Playfair Display','serif'] }, boxShadow: { soft:'0 10px 35px rgba(19, 57, 43, .08)' } } },
  plugins: []
}