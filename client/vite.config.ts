import { defineConfig, loadEnv } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const projectRoot = path.resolve(__dirname, '..');
  const env = loadEnv(mode, projectRoot, '');
  const surveyLanguage = process.env.SURVEY_LANGUAGE ?? env.SURVEY_LANGUAGE ?? '';
  const clientDistDir = process.env.CLIENT_DIST_DIR ?? 'client/dist';

  return {
    root: __dirname,
    envDir: projectRoot,
    define: {
      'import.meta.env.SURVEY_LANGUAGE': JSON.stringify(surveyLanguage),
    },
    plugins: [
      tanstackRouter({
        target: 'react',
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        quoteStyle: 'single',
        semicolons: true,
        routeTreeFileHeader: ['/* eslint-disable */', '// noinspection JSUnusedGlobalSymbols'],
      }),
      react(),
      tailwindcss(),
    ],
    server: {
      middlewareMode: true,
    },
    build: {
      outDir: path.resolve(projectRoot, clientDistDir),
      emptyOutDir: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime', 'recharts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
