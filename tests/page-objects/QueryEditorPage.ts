import { Page, Locator } from '@playwright/test'
import BasePage from './BasePage'

export class QueryEditorPage extends BasePage {
  readonly queryEditor: Locator
  readonly executeButton: Locator
  readonly resultsTable: Locator
  readonly queryHistory: Locator

  constructor(page: Page) {
    super(page)
    this.queryEditor = page.locator('[data-testid="query-editor"]')
    this.executeButton = page.locator('[data-testid="execute-btn"]')
    this.resultsTable = page.locator('[data-testid="results-table"]')
    this.queryHistory = page.locator('[data-testid="query-history"]')
  }

  async writeQuery(query: string): Promise<void> {
    await this.queryEditor.fill(query)
  }

  async executeQuery(): Promise<void> {
    await this.executeButton.click()
  }

  async getQueryResults(): Promise<string[][]> {
    // This would need to be implemented based on your table structure
    const rows = await this.resultsTable.locator('tr').all()
    const results: string[][] = []
    
    for (const row of rows) {
      const cells = await row.locator('td').all()
      const rowData: string[] = []
      for (const cell of cells) {
        rowData.push(await cell.textContent() || '')
      }
      results.push(rowData)
    }
    
    return results
  }
}