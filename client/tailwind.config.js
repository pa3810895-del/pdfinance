export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ios: {
          bg: '#F2F2F7',
          card: '#FFFFFF',
          blue: '#007AFF',
          pink: '#FF2D55',
          green: '#34C759'
        }
      }
    },
  },
  plugins: [],
}
