import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      'sand-api': resolve(import.meta.dirname, 'src/index.ts'),
    },
  },
});
