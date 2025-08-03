import { Page, Locator } from "@playwright/test";
import BasePage from "./BasePage";

export class QueryEditorPage extends BasePage {
  readonly queryEditor: Locator;
  readonly executeButton: Locator;
  readonly resultsTable: Locator;
  readonly queryHistory: Locator;
  readonly newTabButton: Locator;
  readonly resultsInfo: Locator;
  readonly errorContainer: Locator;
  readonly cancelQueryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.queryEditor = page.locator('[data-testid="query-editor"]');
    this.executeButton = page.locator('[data-testid="run-query-btn"]');
    this.resultsTable = page.locator('[data-testid="results-table"]');
    this.queryHistory = page.locator('[data-testid="query-history"]');
    this.newTabButton = page.locator('[data-testid="new-tab-btn"]');
    this.resultsInfo = page.locator('[data-testid="results-info"]');
    this.errorContainer = page.locator('[data-testid="query-error"]');
    this.cancelQueryButton = page.locator('[data-testid="cancel-query-btn"]');
  }

  async openNewTab(): Promise<void> {
    await this.newTabButton.click();
    // Wait for the query editor to be ready
    await this.queryEditor.waitFor({ state: "visible", timeout: 5000 });
  }

  async writeQuery(query: string): Promise<void> {
    // CodeMirror 6 requires special handling - we need to use JavaScript to set the value
    await this.page.evaluate((text) => {
      // Find the CodeMirror editor element
      const editorElement = document.querySelector(
        '[data-testid="query-editor"] .cm-editor',
      );
      if (!editorElement) {
        console.error("CodeMirror editor not found");
        return;
      }

      // CodeMirror 6 stores the view instance on the element
      const view =
        (editorElement as any).cmView?.view || (editorElement as any)._view;

      if (view && view.dispatch) {
        // Clear existing content and insert new text
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: text,
          },
        });
      } else {
        // Alternative approach: trigger input events
        const contentEditable = editorElement.querySelector(
          '.cm-content[contenteditable="true"]',
        );
        if (contentEditable) {
          // Focus the editor
          (contentEditable as HTMLElement).focus();

          // Select all existing content
          document.execCommand("selectAll");

          // Insert the new text
          document.execCommand("insertText", false, text);
        }
      }
    }, query);

    // Give CodeMirror a moment to update
    await this.page.waitForTimeout(200);
  }

  async clearQuery(): Promise<void> {
    await this.writeQuery("");
  }

  async executeQuery(): Promise<void> {
    await this.executeButton.click();
  }

  async cancelQuery(): Promise<void> {
    await this.cancelQueryButton.click();
  }

  async getQueryText(): Promise<string> {
    return await this.page.evaluate(() => {
      const editorElement = document.querySelector(
        '[data-testid="query-editor"] .cm-editor',
      );
      if (!editorElement) return "";

      const view =
        (editorElement as any).cmView?.view || (editorElement as any)._view;
      if (view && view.state) {
        return view.state.doc.toString();
      }

      // Fallback: try to get text from content
      const content = editorElement.querySelector(".cm-content");
      return content?.textContent || "";
    });
  }

  async getQueryResults(): Promise<string[][]> {
    // This would need to be implemented based on your table structure
    const rows = await this.resultsTable.locator("tr").all();
    const results: string[][] = [];

    for (const row of rows) {
      const cells = await row.locator("td").all();
      const rowData: string[] = [];
      for (const cell of cells) {
        rowData.push((await cell.textContent()) || "");
      }
      results.push(rowData);
    }

    return results;
  }
}
