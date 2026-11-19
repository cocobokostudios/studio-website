import { defineConfig } from '@playwright/test';

const siteURL = process.env.SITE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  webServer: siteURL ? undefined : {
    command: process.env.SITE_PREVIEW_COMMAND || 'pnpm run preview',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: siteURL || 'http://127.0.0.1:4321',
  },
});
