import { Page, Locator } from "@playwright/test";
import BasePage from "./BasePage";
import { ConnectionPage } from "./ConnectionPage";
import { QueryEditorPage } from "./QueryEditorPage";
import { SidebarPage } from "./SidebarPage";

export class MainPage extends BasePage {
  readonly appContainer: Locator;
  readonly mainContent: Locator;
  readonly loadingSpinner: Locator;
  readonly menuBar: Locator;
  readonly statusBar: Locator;
  readonly connectionStatus: Locator;
  readonly appTitle: Locator;

  // Page object instances
  readonly connectionPage: ConnectionPage;
  readonly queryEditorPage: QueryEditorPage;
  readonly sidebarPage: SidebarPage;

  constructor(page: Page) {
    super(page);
    this.appContainer = page.locator('[data-testid="app-container"]');
    this.mainContent = page.locator('[data-testid="main-content"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.menuBar = page.locator('[data-testid="menu-bar"]');
    this.statusBar = page.locator('[data-testid="status-bar"]');
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.appTitle = page.locator('[data-testid="app-title"]');

    this.connectionPage = new ConnectionPage(page);
    this.queryEditorPage = new QueryEditorPage(page);
    this.sidebarPage = new SidebarPage(page);
  }

  async waitForAppToLoad(): Promise<void> {
    // First wait for the React app to mount
    await this.page.waitForFunction(
      () => {
        // Try multiple selectors to ensure the app is loaded
        const appContainer = document.querySelector(
          '[data-testid="app-container"]',
        );
        const appDiv = document.querySelector(".app");
        return appContainer || appDiv;
      },
      { timeout: 30000 },
    );

    // Then wait for any loading states to complete
    await this.page.waitForFunction(
      () => {
        const loading = document.querySelector(
          '[data-testid="loading-spinner"]',
        );
        return !loading || !loading.offsetParent;
      },
      { timeout: 30000 },
    );

    // Give the app a moment to stabilize
    await this.pause(1000);
  }

  async getConnectionStatus(): Promise<string> {
    return (await this.connectionStatus.textContent()) || "";
  }

  async isConnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.toLowerCase().includes("connected");
  }

  async waitForConnection(timeout = 30000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const status =
          document.querySelector('[data-testid="connection-status"]')
            ?.textContent || "";
        return status.toLowerCase().includes("connected");
      },
      { timeout },
    );
  }

  async getAppTitle(): Promise<string> {
    return (await this.appTitle.textContent()) || "";
  }

  async useKeyboardShortcut(shortcut: string): Promise<void> {
    const keys = shortcut.split("+").map((key) => {
      switch (key.toLowerCase()) {
        case "ctrl":
        case "cmd":
          return "Meta";
        case "shift":
          return "Shift";
        case "alt":
          return "Alt";
        default:
          return key;
      }
    });

    await this.page.keyboard.press(keys.join("+"));
  }

  async openNewConnection(): Promise<void> {
    await this.useKeyboardShortcut("Meta+n");
  }

  async openNewQuery(): Promise<void> {
    await this.useKeyboardShortcut("Meta+t");
  }

  async closeCurrentTab(): Promise<void> {
    await this.useKeyboardShortcut("Meta+w");
  }

  async openAISettings(): Promise<void> {
    await this.useKeyboardShortcut("Meta+Comma");
  }

  async openTextToSQL(): Promise<void> {
    await this.useKeyboardShortcut("Meta+Shift+t");
  }

  async exportToCsv(): Promise<void> {
    await this.useKeyboardShortcut("Meta+Shift+c");
  }

  async exportToJson(): Promise<void> {
    await this.useKeyboardShortcut("Meta+Shift+j");
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForAppToLoad();
  }

  async maximizeWindow(): Promise<void> {
    // Playwright doesn't have direct maximize, but we can set to large viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  async getWindowSize(): Promise<{ width: number; height: number }> {
    const viewport = this.page.viewportSize();
    return viewport || { width: 0, height: 0 };
  }

  async setWindowSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }
}
