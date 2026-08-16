/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0D0F',
        voidraised: '#12151A',
        voidline: '#1E2329',
        phosphor: '#4ADE80',
        phosphordim: '#1F3D2B',
        alarm: '#F59E0B',
        alarmdim: '#3D2E14',
        static: '#6B7280',
        staticdim: '#232629',
        trace: '#E5E7EB',
        tracedim: '#9CA3AF',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'trace-sweep': 'traceSweep 2.4s ease-in-out infinite',
        blink: 'blink 1.4s step-end infinite',
      },
      keyframes: {
        traceSweep: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
