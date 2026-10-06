/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#07070D',
        surface: 'rgba(255, 255, 255, 0.04)',
        surfaceHover: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.08)',
        theme: {
          blue: '#3B82F6',   // Urban Tech
          green: '#10B981',  // HealthTech
          amber: '#F59E0B',  // Sustainability
          pink: '#EC4899',   // EdTech
          violet: '#8B5CF6'  // Space
        }
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
