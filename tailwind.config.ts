import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))', border: 'hsl(var(--border))',
        card: 'hsl(var(--card))', muted: 'hsl(var(--muted))', accent: 'hsl(var(--accent))', primary: 'hsl(var(--primary))'
      },
      boxShadow: { glow: '0 0 40px rgba(20, 184, 166, 0.12)' }
    }
  },
  plugins: []
};
export default config;
