import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0007cd',
        'primary-active': '#0005a3',
        'primary-glow': '#1a26ff',
        ink: '#ffffff',
        body: '#a8a8a8',
        'body-strong': '#ffffff',
        muted: '#888888',
        'muted-soft': '#666666',
        hairline: '#222222',
        'hairline-soft': '#1a1a1a',
        'hairline-strong': '#333333',
        canvas: '#0f0f0f',
        'canvas-deep': '#000000',
        'surface-card': '#181818',
        'surface-card-elevated': '#222222',
        'surface-strong': '#2a2a2a',
        'on-primary': '#ffffff',
        'on-dark': '#ffffff',
        'accent-cyan': '#00d4ff',
        'accent-violet': '#7b3aed',
        'semantic-error': '#ff4d4d',
        'semantic-success': '#33d17a',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      spacing: {
        section: '96px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-mega': ['72px', { lineHeight: '1.05', letterSpacing: '-2.16px', fontWeight: '500' }],
        'display-xl': ['56px', { lineHeight: '1.05', letterSpacing: '-1.68px', fontWeight: '500' }],
        'display-lg': ['44px', { lineHeight: '1.1', letterSpacing: '-1.32px', fontWeight: '500' }],
        'display-md': ['32px', { lineHeight: '1.15', letterSpacing: '-0.96px', fontWeight: '500' }],
        'display-sm': ['24px', { lineHeight: '1.25', letterSpacing: '-0.5px', fontWeight: '500' }],
        'title-md': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'title-sm': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'caption-uppercase': ['11px', { lineHeight: '1.4', letterSpacing: '0.88px', fontWeight: '600' }],
        code: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        button: ['14px', { lineHeight: '1.0', fontWeight: '500' }],
        'nav-link': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};

export default config;
