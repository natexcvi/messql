import { Page, Locator } from '@playwright/test'
import BasePage from './BasePage'

export class SidebarPage extends BasePage {
  readonly sidebar: Locator
  readonly schemaTree: Locator
  readonly refreshButton: Locator
  readonly connectionsSection: Locator

  constructor(page: Page) {
    super(page)
    this.sidebar = page.locator('[data-testid="sidebar"]')
    this.schemaTree = page.locator('[data-testid="schema-tree"]')
    this.refreshButton = page.locator('[data-testid="refresh-btn"]')
    this.connectionsSection = page.locator('[data-testid="connections-section"]')
  }

  async refreshSchemas(): Promise<void> {
    await this.refreshButton.click()
  }

  async expandSchema(schemaName: string): Promise<void> {
    await this.page.locator(`[data-testid="schema-${schemaName}"]`).click()
  }

  async selectTable(tableName: string): Promise<void> {
    await this.page.locator(`[data-testid="table-${tableName}"]`).click()
  }
}