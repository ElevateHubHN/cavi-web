import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server.ts', 'scripts/crear-admin': 'src/scripts/crear-admin.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  splitting: false,
  esbuildOptions(options) {
    options.packages = 'external';
  },
});
