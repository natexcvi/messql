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

    // Set up console error logging
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const errorText = `[Console Error] ${msg.text()}`;
        consoleErrors.push(errorText);
        console.error(errorText);
      }
    });

    // Log any page crashes
    page.on("crash", () => {
      console.error("[Page Crash] The page has crashed!");
    });

    // Log uncaught exceptions
    page.on("pageerror", (error) => {
      console.error(`[Page Error] ${error.message}`);
      console.error(error.stack);
    });

    await use(page);

    // After test, report any console errors that occurred
    if (consoleErrors.length > 0) {
      console.error(`\n[Test Summary] ${consoleErrors.length} console error(s) detected during test:`);
      consoleErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }
  },
});

export { expect } from "@playwright/test";
