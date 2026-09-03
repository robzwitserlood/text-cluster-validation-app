import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssTypography from '@tailwindcss/typography';

const config: Config = {
  darkMode: ['class', 'media'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  plugins: [tailwindcssAnimate, tailwindcssTypography],
};

export default config;
