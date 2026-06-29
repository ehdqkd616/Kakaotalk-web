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
        kakao: {
          yellow: '#FEE500',
          brown: '#3C1E1E',
          'chat-bg': '#B2C7D9',
          'sidebar-bg': '#1E2028',
          'sidebar-hover': '#2A2D38',
          'sidebar-active': '#363A47',
          'my-bubble': '#FFEB33',
          'other-bubble': '#FFFFFF',
          'input-bg': '#F5F5F5',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          '"Noto Sans KR"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
