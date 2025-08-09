import {
  test as base,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";

export const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
}>({
  electronApp: async ({}, use) => {
    // Launch the Electron app
    const args = ["dist/main.js"];
    
    // Disable sandbox in CI environments to avoid permission issues
    if (process.env.CI) {
      args.push("--no-sandbox", "--disable-setuid-sandbox", "--headless");
    }
    
    const electronApp = await electron.launch({
      args,
      timeout: 30000,
    });

    await use(electronApp);
    await electronApp.close();
  },

  page: async ({ electronApp }, use) => {
    // Get the first window that the app opens
    const page = await electronApp.firstWindow();

    // Wait for the app to be ready
    await page.waitForLoadState("domcontentloaded");

    await use(page);
  },
});

export { expect } from "@playwright/test";
