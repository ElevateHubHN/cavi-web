import type { Config } from 'tailwindcss';

// Mismos colores y fuentes que el sitio (web/tailwind.config.ts).
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B2545', dark: '#081A34' },
        red: { DEFAULT: '#E01F26', dark: '#C0161C' },
        green: '#1F8A4C',
        ink: '#0F1B34',
        'ink-2': '#26364F',
        muted: '#5B6B82',
        'muted-2': '#7E8DA6',
        'muted-3': '#9AA7BA',
        soft: '#F5F7FA',
        'soft-2': '#F1F4F9',
        line: '#E3E8EF',
        'line-2': '#D7DEE8',
        'on-navy': '#B9C6DC',
        'on-navy-2': '#9FB0C9',
        'on-navy-3': '#C6D2E4',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
