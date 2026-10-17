import type { Config } from 'tailwindcss';

/**
 * Tabimemo デザイントークン
 * メインカラー: brand（サンセットコーラル / 旅の高揚感）
 * アクセントカラー: accent（ラグーンティール / 海と地図）
 * 色を増やしたい時はここだけを編集する。
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF3EE',
          100: '#FFE3D6',
          200: '#FFC4AC',
          300: '#FFA07E',
          400: '#FF7F57',
          500: '#FF6134', // メイン
          600: '#ED4517',
          700: '#C53410',
          800: '#9C2B10',
          900: '#7C2712',
        },
        accent: {
          50: '#EBFCF9',
          100: '#CFF7F0',
          200: '#A1EEE3',
          300: '#65DFD2',
          400: '#2FC7BB',
          500: '#13AAA1', // アクセント
          600: '#0A8882',
          700: '#0B6C69',
          800: '#0D5654',
          900: '#0F4745',
        },
        ink: {
          50: '#F7F7F8',
          100: '#EDEEF0',
          200: '#D9DBDF',
          300: '#B7BBC2',
          400: '#8D929C',
          500: '#6B7280',
          600: '#525762',
          700: '#3F434C',
          800: '#2A2D34',
          900: '#191B20',
          950: '#101216',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Noto Sans JP',
          'Meiryo',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1.25rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 2px 10px -2px rgb(16 18 22 / 0.08), 0 8px 30px -12px rgb(16 18 22 / 0.12)',
        lift: '0 10px 40px -12px rgb(255 97 52 / 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF6134 0%, #FF9F5A 45%, #13AAA1 100%)',
        'sky-gradient': 'linear-gradient(180deg, #FFF3EE 0%, #EBFCF9 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out both',
        'pop-in': 'pop-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
