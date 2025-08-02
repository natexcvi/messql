import {
  test as base,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Determine the correct app binary path based on architecture
const arch = process.arch === "arm64" ? "arm64" : "x64";
const APP_BINARY_PATH = `./dist/mac-${arch}/messql.app/Contents/MacOS/messql`;

export const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
}>({
  electronApp: async ({}, use) => {
    // Check if the app binary exists
    if (!fs.existsSync(APP_BINARY_PATH)) {
      throw new Error(
        `Electron app binary not found at: ${APP_BINARY_PATH}. Please build the application first by running: npm run dist`,
      );
    }

    // Launch the Electron app
    const electronApp = await electron.launch({
      args: ["dist/main.js"],
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
