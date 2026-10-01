import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './qa-tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 720 } },
      testMatch: /session-0[1-8]|session-1[0-1]/,
    },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 } },
      testMatch: /session-09/,
    },
    {
      name: 'visual',
      testMatch: /visual-enhancement/,
    },
  ],
});
