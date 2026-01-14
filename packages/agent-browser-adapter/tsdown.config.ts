import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: './tsconfig.json',
  outDir: 'dist',
  platform: 'node',
  target: 'es2022',
  format: ['es'],
  fixedExtension: true,
  dts: true,
  sourcemap: true,
  external: [],
  clean: true,
});
