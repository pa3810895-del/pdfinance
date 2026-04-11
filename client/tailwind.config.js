/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'ios-bg': '#F2F2F7',
        'santi-blue': '#007AFF',
        'paty-pink': '#FF2D55',
        'success-green': '#34C759'
      },
      animation: {
        'ticker': 'ticker 25s linear infinite',
        'in': 'fadeIn 0.3s ease-in'
      },
      keyframes: {
        'ticker': {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-200%)' }
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
