import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  },
  resolve: {
    alias: {
      '@echrimheni/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
      '@echrimheni/database': path.resolve(__dirname, './packages/database/src/index.ts')
    }
  }
});
