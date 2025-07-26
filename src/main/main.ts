import { app, BrowserWindow, ipcMain, Menu, nativeTheme, dialog } from "electron";
import * as fs from "fs";
import * as path from "path";
import { DatabaseService } from "./services/database";
import { KeychainService } from "./services/keychain";
import { AIService } from "./services/ai";

let mainWindow: BrowserWindow;
let databaseService: DatabaseService;
let keychainService: KeychainService;
let aiService: AIService;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 20 },
    backgroundColor: "#f5f5f5",
    vibrancy: "sidebar",
  });

  // Handle window close event to check for open tabs
  mainWindow.on("close", async (event) => {
    event.preventDefault();

    try {
      const hasOpenTabs = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI && window.electronAPI.hasOpenTabs ? window.electronAPI.hasOpenTabs() : false
      `);

      if (hasOpenTabs) {
        const { dialog } = await import("electron");
        const choice = await dialog.showMessageBox(mainWindow, {
          type: "question",
          buttons: ["Close", "Cancel"],
          defaultId: 1,
          message:
            "You have open query tabs. Are you sure you want to close the application?",
          detail: "Any unsaved work will be lost.",
        });

        if (choice.response === 0) {
          mainWindow.destroy();
        }
      } else {
        mainWindow.destroy();
      }
    } catch (error) {
      // If there's an error checking tabs, just close normally
      mainWindow.destroy();
    }
  });

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    mainWindow.loadURL("http://localhost:9000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

const createMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "mesSQL",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Connection",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("new-connection");
          },
        },
        {
          label: "New Query",
          accelerator: "CmdOrCtrl+T",
          click: () => {
            mainWindow.webContents.send("new-query");
          },
        },
        {
          label: "Close Tab",
          accelerator: "CmdOrCtrl+W",
          click: () => {
            mainWindow.webContents.send("close-tab");
          },
        },
        { type: "separator" },
        {
          label: "AI Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow.webContents.send("ai-settings");
          },
        },
        {
          label: "Text to SQL",
          accelerator: "CmdOrCtrl+Shift+T",
          click: () => {
            mainWindow.webContents.send("text-to-sql");
          },
        },
        { type: "separator" },
        {
          label: "Export to CSV",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => {
            mainWindow.webContents.send("export-csv");
          },
        },
        {
          label: "Export to JSON",
          accelerator: "CmdOrCtrl+Shift+J",
          click: () => {
            mainWindow.webContents.send("export-json");
          },
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createWindow();
  createMenu();

  databaseService = new DatabaseService();
  keychainService = new KeychainService();
  aiService = new AIService();

  setupIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

const setupIpcHandlers = (): void => {
  ipcMain.handle("db:connect", async (_, connectionConfig) => {
    // Get password from keychain
    const password = await keychainService.getPassword(
      "postgres",
      connectionConfig.id,
    );
    if (!password) {
      throw new Error("Password not found in keychain");
    }

    return await databaseService.connect(connectionConfig, password);
  });

  ipcMain.handle("db:disconnect", async (_, connectionId) => {
    return await databaseService.disconnect(connectionId);
  });

  ipcMain.handle("db:query", async (_, connectionId, sql, params, schema, queryId) => {
    return await databaseService.query(connectionId, sql, params, schema, queryId);
  });

  ipcMain.handle("db:cancelQuery", async (_, queryId) => {
    return await databaseService.cancelQuery(queryId);
  });

  ipcMain.handle("db:getSchemas", async (_, connectionId) => {
    return await databaseService.getSchemas(connectionId);
  });


  ipcMain.handle(
    "db:getTableSchema",
    async (_, connectionId, schema, table) => {
      return await databaseService.getTableSchema(connectionId, schema, table);
    },
  );

  ipcMain.handle(
    "db:getSchemaTableSchemas",
    async (_, connectionId, schema) => {
      return await databaseService.getSchemaTableSchemas(connectionId, schema);
    },
  );

  ipcMain.handle("keychain:set", async (_, service, account, password) => {
    return await keychainService.setPassword(service, account, password);
  });

  ipcMain.handle("keychain:get", async (_, service, account) => {
    return await keychainService.getPassword(service, account);
  });

  ipcMain.handle("keychain:delete", async (_, service, account) => {
    return await keychainService.deletePassword(service, account);
  });

  // Theme handling
  ipcMain.handle("theme:get", () => {
    return nativeTheme.shouldUseDarkColors;
  });

  // Listen for theme changes and notify renderer
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors);
    }
  });

  // File operations
  ipcMain.handle("file:saveQuery", async (_, content: string) => {
    try {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save SQL Query',
        defaultPath: 'query.sql',
        filters: [
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (filePath) {
        await fs.promises.writeFile(filePath, content, 'utf8');
        return filePath;
      }
      return null;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  });

  ipcMain.handle("file:loadQuery", async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Load SQL Query',
        filters: [
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (filePaths && filePaths.length > 0) {
        const content = await fs.promises.readFile(filePaths[0], 'utf8');
        return content;
      }
      return null;
    } catch (error) {
      console.error('Error loading file:', error);
      throw error;
    }
  });

  // AI service handlers
  ipcMain.handle("ai:generateTabName", async (_, query: string, credentials) => {
    return await aiService.generateTabName(query, credentials);
  });

  ipcMain.handle("ai:generateSQL", async (_, prompt: string, schemas, credentials) => {
    return await aiService.generateSQL(prompt, schemas, credentials);
  });

  ipcMain.handle("ai:validateCredentials", async (_, credentials) => {
    return await aiService.validateCredentials(credentials);
  });

  // AI credentials handlers
  ipcMain.handle("ai:setCredentials", async (_, provider: string, credentials: string) => {
    return await keychainService.setAICredentials(provider, credentials);
  });

  ipcMain.handle("ai:getCredentials", async (_, provider: string) => {
    return await keychainService.getAICredentials(provider);
  });

  ipcMain.handle("ai:deleteCredentials", async (_, provider: string) => {
    return await keychainService.deleteAICredentials(provider);
  });
};
