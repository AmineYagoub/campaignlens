import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [devvit(), tailwindcss()],
});
