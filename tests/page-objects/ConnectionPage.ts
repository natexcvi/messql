import { Page, Locator } from "@playwright/test";
import BasePage from "./BasePage";

export class ConnectionPage extends BasePage {
  readonly newConnectionButton: Locator;
  readonly connectionNameInput: Locator;
  readonly hostInput: Locator;
  readonly portInput: Locator;
  readonly databaseInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly sslCheckbox: Locator;
  readonly testConnectionButton: Locator;
  readonly saveConnectionButton: Locator;
  readonly cancelButton: Locator;
  readonly connectionsList: Locator;
  readonly connectionItem: Locator;
  readonly deleteConnectionButton: Locator;
  readonly editConnectionButton: Locator;
  readonly connectionModal: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.newConnectionButton = page.locator(
      '[data-testid="new-connection-btn"]',
    );
    this.connectionNameInput = page.locator(
      '[data-testid="connection-name-input"]',
    );
    this.hostInput = page.locator('[data-testid="host-input"]');
    this.portInput = page.locator('[data-testid="port-input"]');
    this.databaseInput = page.locator('[data-testid="database-input"]');
    this.usernameInput = page.locator('[data-testid="username-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.sslCheckbox = page.locator('[data-testid="ssl-checkbox"]');
    this.testConnectionButton = page.locator(
      '[data-testid="test-connection-btn"]',
    );
    this.saveConnectionButton = page.locator(
      '[data-testid="save-connection-btn"]',
    );
    this.cancelButton = page.locator('[data-testid="cancel-btn"]');
    this.connectionsList = page.locator('[data-testid="connections-list"]');
    this.connectionItem = page.locator('[data-testid="connection-item"]');
    this.deleteConnectionButton = page.locator(
      '[data-testid="delete-connection-btn"]',
    );
    this.editConnectionButton = page.locator(
      '[data-testid="edit-connection-btn"]',
    );
    this.connectionModal = page.locator('[data-testid="connection-modal"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }

  async openNewConnectionModal(): Promise<void> {
    await this.newConnectionButton.click();
    await this.connectionModal.waitFor({ state: "visible" });
  }

  async fillConnectionForm(connectionData: {
    name: string;
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  }): Promise<void> {
    await this.connectionNameInput.fill(connectionData.name);
    await this.hostInput.fill(connectionData.host);
    await this.portInput.fill(connectionData.port);
    await this.databaseInput.fill(connectionData.database);
    await this.usernameInput.fill(connectionData.username);
    await this.passwordInput.fill(connectionData.password);

    if (connectionData.ssl) {
      await this.sslCheckbox.check();
    }
  }

  async testConnection(): Promise<void> {
    await this.testConnectionButton.click();
  }

  async saveConnection(): Promise<void> {
    await this.saveConnectionButton.click();
  }

  async cancelConnectionForm(): Promise<void> {
    await this.cancelButton.click();
  }

  async getConnectionByName(name: string): Promise<Locator | null> {
    try {
      return this.page.locator(
        `[data-testid="connection-item"][data-connection-name="${name}"]`,
      );
    } catch {
      return null;
    }
  }

  async deleteConnection(name: string): Promise<void> {
    const connection = await this.getConnectionByName(name);
    if (connection) {
      await connection.click();
      await this.deleteConnectionButton.click();
    }
  }

  async editConnection(name: string): Promise<void> {
    const connection = await this.getConnectionByName(name);
    if (connection) {
      await connection.click();
      await this.editConnectionButton.click();
      await this.connectionModal.waitFor({ state: "visible" });
    }
  }

  async connectToDatabase(name: string): Promise<void> {
    const connection = await this.getConnectionByName(name);
    if (connection) {
      await connection.click();
    }
  }

  async waitForConnectionSuccess(): Promise<void> {
    await this.successMessage.waitFor({ state: "visible", timeout: 15000 });
  }

  async waitForConnectionError(): Promise<void> {
    await this.errorMessage.waitFor({ state: "visible", timeout: 15000 });
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }
}
