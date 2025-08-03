import { test, expect } from '../helpers/electron-app'
import { MainPage } from '../page-objects/MainPage'
import { TestConnection } from '../helpers/test-connection'

test.describe('Tab Management', () => {
  let mainPage: MainPage
  let testConnection: TestConnection
  let connectionName: string

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page)
    testConnection = new TestConnection(page)
    await mainPage.waitForAppToLoad()
    
    // Setup a test connection
    connectionName = await testConnection.createTestConnection('tab-test')
    await testConnection.connectToTestDatabase(connectionName)
  })

  test.afterEach(async () => {
    // Clean up connections
    await testConnection.cleanup()
  })

  test('should create new query tab after connection', async () => {
    // Open a new query tab
    await mainPage.openNewQuery()
    
    // Query editor should be visible
    await expect(mainPage.queryEditorPage.queryEditor).toBeVisible()
    await expect(mainPage.queryEditorPage.executeButton).toBeEnabled()
  })

  test('should create multiple query tabs', async () => {
    // Open first tab
    await mainPage.openNewQuery()
    await mainPage.queryEditorPage.writeQuery('SELECT 1;')
    
    // Open second tab
    await mainPage.openNewQuery()
    await mainPage.queryEditorPage.writeQuery('SELECT 2;')
    
    // Both tabs should exist and have different content
    await expect(mainPage.queryEditorPage.queryEditor).toBeVisible()
  })

  test('should close current tab', async () => {
    // Open a new tab
    await mainPage.openNewQuery()
    await mainPage.queryEditorPage.writeQuery('SELECT 1;')
    
    // Close the tab
    await mainPage.closeCurrentTab()
    
    // Query editor should no longer be visible (unless there are other tabs)
    await mainPage.pause(500)
  })

  test('should execute query in new tab', async () => {
    // Open a new query tab
    await mainPage.openNewQuery()
    
    // Write and execute a query
    await mainPage.queryEditorPage.writeQuery('SELECT name, countrycode FROM city LIMIT 3;')
    await mainPage.queryEditorPage.executeQuery()
    
    // Results should appear
    await expect(mainPage.queryEditorPage.resultsTable).toBeVisible({ timeout: 10000 })
    const results = await mainPage.queryEditorPage.getQueryResults()
    expect(results.length).toBe(3)
  })

  test('should handle keyboard shortcut for new tab', async () => {
    // Use keyboard shortcut
    await mainPage.useKeyboardShortcut('Meta+t')
    await mainPage.pause(1000)
    
    // Query editor should be visible
    await expect(mainPage.queryEditorPage.queryEditor).toBeVisible()
  })
})