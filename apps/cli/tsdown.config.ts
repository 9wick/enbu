import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/main.ts'],
  tsconfig: './tsconfig.json',
  outDir: 'dist',
  platform: 'node',
  target: 'es2022',
  format: ['es'],
  fixedExtension: true,
  dts: false,
  sourcemap: true,
  external: [],
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
