/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        freight: {
          bg: '#0B0F19', // Deep dark slate
          panel: 'rgba(23, 32, 51, 0.6)', // Glassy panel
          border: 'rgba(255, 255, 255, 0.08)',
          textMain: '#F8FAFC',
          textMuted: '#94A3B8',
          accentRoad: '#F59E0B', // Amber
          accentRail: '#10B981', // Emerald
          accentAir: '#3B82F6', // Blue
          accentCoast: '#0EA5E9', // Sky
          brand: '#FF6B00', // Vibrant safety orange
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      backgroundImage: {
        'topo': "url('https://www.transparenttextures.com/patterns/cubes.png')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
