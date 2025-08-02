import { Page, Locator, expect } from '@playwright/test'

export default class BasePage {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    return this.page.locator(selector).first()
  }

  async waitForElementToBeVisible(selector: string, timeout = 10000): Promise<void> {
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout })
  }

  async waitForElementToBeClickable(selector: string, timeout = 10000): Promise<void> {
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout })
  }

  async waitForText(selector: string, text: string, timeout = 10000): Promise<void> {
    await expect(this.page.locator(selector).first()).toContainText(text, { timeout })
  }

  async clickElement(selector: string): Promise<void> {
    await this.page.locator(selector).first().click()
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).first().fill(value)
  }

  async getText(selector: string): Promise<string> {
    return await this.page.locator(selector).first().textContent() || ''
  }

  async isElementVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).first().isVisible()
    } catch {
      return false
    }
  }

  async takeScreenshot(filename: string): Promise<void> {
    await this.page.screenshot({ path: `./test-results/${filename}.png` })
  }

  async pause(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds)
  }
}