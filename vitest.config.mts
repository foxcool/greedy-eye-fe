import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit and component tests. The environment is jsdom for components; pure
// modules run in it too, which costs nothing and keeps one config.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Spies restore after each test; the fetch guard in setup stays installed.
    restoreMocks: true,
  },
})
