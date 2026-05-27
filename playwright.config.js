// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop — tous les tests
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile — smoke uniquement (PWA mobile)
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
      testMatch: '**/smoke.spec.js',
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
      testMatch: '**/smoke.spec.js',
    },
  ],

  webServer: {
    command: 'npx serve . -p 4000 --no-clipboard',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
