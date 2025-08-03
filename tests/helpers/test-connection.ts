import { Page } from '@playwright/test'
import { ConnectionPage } from '../page-objects/ConnectionPage'
import { TestDatabase } from './test-database'

export class TestConnection {
  private connectionsCreated: string[] = []
  private connectionPage: ConnectionPage

  constructor(private page: Page) {
    this.connectionPage = new ConnectionPage(page)
  }

  async createTestConnection(testName: string): Promise<string> {
    const connectionName = TestDatabase.getConnectionName(testName)
    
    await this.connectionPage.openNewConnectionModal()
    await this.connectionPage.fillConnectionForm({
      name: connectionName,
      host: TestDatabase.config.host,
      port: TestDatabase.config.port,
      database: TestDatabase.config.database,
      username: TestDatabase.config.username,
      password: TestDatabase.config.password
    })
    await this.connectionPage.saveConnection()
    
    // Track this connection for cleanup
    this.connectionsCreated.push(connectionName)
    
    return connectionName
  }

  async connectToTestDatabase(connectionName: string, openNewTab: boolean = false): Promise<void> {
    await this.connectionPage.connectToDatabase(connectionName)
    // Wait a bit for connection to establish
    await this.page.waitForTimeout(2000)
    
    if (openNewTab) {
      // Open a new query tab using keyboard shortcut
      await this.page.keyboard.press('Meta+t')
      await this.page.waitForTimeout(1000)
    }
  }

  async cleanup(): Promise<void> {
    // Delete all connections created during this test
    for (const connectionName of this.connectionsCreated) {
      try {
        await this.connectionPage.deleteConnection(connectionName)
        await this.page.waitForTimeout(500) // Small delay between deletions
      } catch (error) {
        console.warn(`Failed to delete connection "${connectionName}":`, error)
      }
    }
    this.connectionsCreated = []
  }
}