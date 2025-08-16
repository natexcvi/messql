import { ElectronApplication } from "@playwright/test";

export async function setupKeychainMock(electronApp: ElectronApplication) {
  // Mock the keychain IPC handlers to use localStorage
  await electronApp.evaluate(({ ipcMain, BrowserWindow }) => {
    // Remove existing handlers if any
    ipcMain.removeHandler("keychain:set");
    ipcMain.removeHandler("keychain:get");
    ipcMain.removeHandler("keychain:delete");

    // Helper to get the main window
    const getMainWindow = () => {
      const windows = BrowserWindow.getAllWindows();
      return windows[0];
    };

    // Register mock handlers that use localStorage
    ipcMain.handle(
      "keychain:set",
      async (_, service: string, account: string, password: string) => {
        const key = `keychain:${service}:${account}`;
        const mainWindow = getMainWindow();
        if (mainWindow) {
          await mainWindow.webContents.executeJavaScript(
            `localStorage.setItem('${key}', '${password}')`
          );
          console.log(`[Mock Keychain] Stored password for ${key} in localStorage`);
        }
        return Promise.resolve();
      },
    );

    ipcMain.handle(
      "keychain:get",
      async (_, service: string, account: string) => {
        const key = `keychain:${service}:${account}`;
        const mainWindow = getMainWindow();
        if (mainWindow) {
          const value = await mainWindow.webContents.executeJavaScript(
            `localStorage.getItem('${key}')`
          );
          console.log(
            `[Mock Keychain] Retrieved password for ${key} from localStorage: ${value ? "found" : "not found"}`,
          );
          return value;
        }
        return null;
      },
    );

    ipcMain.handle(
      "keychain:delete",
      async (_, service: string, account: string) => {
        const key = `keychain:${service}:${account}`;
        const mainWindow = getMainWindow();
        if (mainWindow) {
          await mainWindow.webContents.executeJavaScript(
            `localStorage.removeItem('${key}')`
          );
          console.log(`[Mock Keychain] Deleted password for ${key} from localStorage`);
        }
        return Promise.resolve();
      },
    );
  });
}
