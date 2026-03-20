import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0b',
        surface: '#111113',
        'surface2': '#18181c',
        border: 'rgba(255,255,255,0.07)',
        'border2': 'rgba(255,255,255,0.12)',
        text: '#f0efe8',
        muted: '#888784',
        faint: '#3a3a3e',
        teal: {
          DEFAULT: '#5BB5A2',
          dim: 'rgba(91,181,162,0.15)',
          glow: 'rgba(91,181,162,0.08)',
        },
        indigo: {
          DEFAULT: '#7C6EF6',
          dim: 'rgba(124,110,246,0.15)',
        },
        green: {
          DEFAULT: '#3ecf8e',
          dim: 'rgba(62,207,142,0.12)',
        },
        amber: {
          DEFAULT: '#f5a623',
          dim: 'rgba(245,166,35,0.12)',
        },
        coral: {
          DEFAULT: '#f06449',
          dim: 'rgba(240,100,73,0.12)',
        },
        blue: '#4f9cf9',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '16px',
        sm: '10px',
      },
    },
  },
  plugins: [],
}
export default config
