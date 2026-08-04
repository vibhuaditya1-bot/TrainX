/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090d',
          900: '#0d0f15',
          850: '#12141c',
          800: '#171a24',
          700: '#1f232f',
          600: '#2a2f3d',
          500: '#3a4055',
          400: '#565d75',
          300: '#7c849e',
          200: '#aab1c6',
          100: '#d4d8e6',
        },
        brand: {
          50: '#eafbff',
          100: '#cdf6ff',
          200: '#a3edff',
          300: '#67ddff',
          400: '#22c5ff',
          500: '#00a8ec',
          600: '#0085c4',
          700: '#086a9e',
          800: '#0d5780',
          900: '#11486a',
        },
        lime: {
          400: '#c6ff3d',
          500: '#a8e62a',
          600: '#8bc91c',
        },
        coral: {
          400: '#ff6b6b',
          500: '#f04848',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseRing: { '0%': { transform: 'scale(0.9)', opacity: '0.7' }, '70%': { transform: 'scale(1.3)', opacity: '0' }, '100%': { transform: 'scale(0.9)', opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
      },
    },
  },
  plugins: [],
};
