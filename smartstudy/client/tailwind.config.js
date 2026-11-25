/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: { 950: '#05050a', 900: '#08080f', 850: '#0c0c16', 800: '#11111d', 700: '#1a1a2a' },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(167,139,250,.25), 0 10px 40px -10px rgba(139,92,246,.55)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,.25), 0 10px 40px -10px rgba(34,211,238,.5)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 20px 50px -20px rgba(0,0,0,.6)',
      },
      keyframes: {
        aurora: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(8%,-6%) scale(1.15)' },
          '66%': { transform: 'translate(-6%,8%) scale(.9)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'gradient-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-ring': { '0%': { transform: 'scale(.8)', opacity: '.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        scan: { '0%': { top: '0%' }, '100%': { top: '100%' } },
        marquee: { to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        aurora: 'aurora 18s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(.2,.6,.4,1) infinite',
        scan: 'scan 2.2s ease-in-out infinite alternate',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
