/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        f1red: '#E10600',
        f1dark: '#0f0f0f',
        f1card: '#1a1a1a',
        f1border: '#2a2a2a',
        f1yellow: '#FFD700',
        f1silver: '#C0C0C0',
      },
      fontFamily: {
        formula: ['"Formula1"', 'sans-serif'],
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      backgroundImage: {
        'f1-gradient': 'linear-gradient(135deg, #0f0f0f 0%, #1a0000 50%, #0f0f0f 100%)',
        'card-gradient': 'linear-gradient(145deg, #1e1e1e, #141414)',
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(225,6,0,0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(225,6,0,0.4)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
