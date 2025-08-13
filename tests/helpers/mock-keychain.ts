import { ElectronApplication } from "@playwright/test";

export async function setupKeychainMock(electronApp: ElectronApplication) {
  const testStorage = new Map<string, string>();

  // Mock the keychain IPC handlers
  await electronApp.evaluate(({ ipcMain }) => {
    // Remove existing handlers if any
    ipcMain.removeHandler("keychain:set");
    ipcMain.removeHandler("keychain:get");
    ipcMain.removeHandler("keychain:delete");

    // Register mock handlers
    ipcMain.handle(
      "keychain:set",
      async (_, service: string, account: string, password: string) => {
        const key = `${service}:${account}`;
        testStorage.set(key, password);
        console.log(`[Mock Keychain] Stored password for ${key}`);
        return Promise.resolve();
      },
    );

    ipcMain.handle(
      "keychain:get",
      async (_, service: string, account: string) => {
        const key = `${service}:${account}`;
        const value = testStorage.get(key) || null;
        console.log(
          `[Mock Keychain] Retrieved password for ${key}: ${value ? "found" : "not found"}`,
        );
        return Promise.resolve(value);
      },
    );

    ipcMain.handle(
      "keychain:delete",
      async (_, service: string, account: string) => {
        const key = `${service}:${account}`;
        testStorage.delete(key);
        console.log(`[Mock Keychain] Deleted password for ${key}`);
        return Promise.resolve();
      },
    );
  });
}
