import { defineConfig, devices } from '@playwright/test'

// UI smoke tests in demo mode: no backend, no psina. NEXT_PUBLIC_* values are
// inlined at build time, so they are set for the build, not just the server.
// The mock user id short-circuits checkAuth; the RPCs that demo mode still
// sends (portfolios, accounts) are answered in the browser by e2e/fixtures.ts.
const PORT = 3000

const demoEnv = {
  NEXT_PUBLIC_USE_BACKEND: 'false',
  NEXT_PUBLIC_USE_LIVE_PRICES: 'false',
  NEXT_PUBLIC_MOCK_USER_ID: 'e2e-user',
  // Relative URLs: an RPC the fixtures miss lands on the Next server and 404s
  // instead of reaching whatever runs on localhost:8080.
  NEXT_PUBLIC_API_URL: '',
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Trailing slash matters: specs navigate with relative paths ('portfolios')
    // so they resolve under basePath /app.
    baseURL: `http://localhost:${PORT}/app/`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A production build, served the way build/Dockerfile serves it: next dev
    // compiles each route on first hit, which makes the first test of every
    // page slow and timing-dependent. Standalone output does not carry its
    // static assets, hence the copies.
    command: [
      'npm run build',
      'cp -r public .next/standalone/',
      'cp -r .next/static .next/standalone/.next/',
      'node .next/standalone/server.js',
    ].join(' && '),
    url: `http://localhost:${PORT}/app/login`,
    env: {
      ...demoEnv,
      NEXT_TELEMETRY_DISABLED: '1',
      PORT: String(PORT),
      // server.js binds to $HOSTNAME, which Docker sets to the container id.
      HOSTNAME: 'localhost',
    },
    timeout: 300_000,
    // Never reuse: a server already on the port is likely a backend-mode dev
    // server, and the specs would run against the wrong mode.
    reuseExistingServer: false,
  },
})
