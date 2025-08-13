import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  maxFailures: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  globalSetup: require.resolve("./tests/helpers/global-setup.ts"),
  projects: [
    {
      name: "electron-tests",
      testMatch: "**/tests/e2e/**/*.test.ts",
    },
  ],
  outputDir: "./test-results/",
});
