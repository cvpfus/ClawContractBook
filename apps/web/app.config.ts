import { defineConfig } from '@tanstack/start/config';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [
      viteTsconfigPaths(),
      tailwindcss(),
    ],
  },
});
