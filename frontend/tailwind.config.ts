import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        'surface-low': 'var(--surface-low)',
        'surface-lowest': 'var(--surface-lowest)',
        'surface-high': 'var(--surface-high)',
        tertiary: 'var(--tertiary)',
        accent: 'var(--tertiary)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
        'on-background': 'var(--on-background)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'on-tertiary': 'var(--on-tertiary)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-geist)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space)', 'var(--font-geist)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      spacing: {
        gutter: '24px',
        xxl: '80px',
        xl: '40px',
        lg: '24px',
        md: '16px',
        sm: '8px',
        xs: '4px',
        'margin-desktop': '48px',
        'margin-mobile': '16px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.35s ease-out',
        'pulse-soft': 'pulse-soft 2.2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-in': {
          'from': { transform: 'translateX(12px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(212, 255, 63, 0.35)',
        'glow-soft': '0 0 24px rgba(212, 255, 63, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
