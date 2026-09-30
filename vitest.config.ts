import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/tests/**/*.test.ts',
      'apps/web/src/**/*.test.{ts,tsx}',
      'scripts/build-dataset/tests/**/*.test.ts',
      'scripts/assets/**/*.test.ts',
      'scripts/recommender/tests/**/*.test.ts',
    ],
  },
});
