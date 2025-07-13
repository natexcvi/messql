import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { DatabaseService } from './services/database';
import { KeychainService } from './services/keychain';

let mainWindow: BrowserWindow;
let databaseService: DatabaseService;
let keychainService: KeychainService;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:9000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

const createMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'mesSQL',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Connection',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-connection');
          },
        },
        {
          label: 'New Query',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('new-query');
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
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
  
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const setupIpcHandlers = (): void => {
  ipcMain.handle('db:connect', async (_, connectionConfig) => {
    // Get password from keychain
    const password = await keychainService.getPassword('postgres', connectionConfig.id);
    if (!password) {
      throw new Error('Password not found in keychain');
    }
    
    return await databaseService.connect(connectionConfig, password);
  });

  ipcMain.handle('db:disconnect', async (_, connectionId) => {
    return await databaseService.disconnect(connectionId);
  });

  ipcMain.handle('db:query', async (_, connectionId, sql) => {
    return await databaseService.query(connectionId, sql);
  });

  ipcMain.handle('db:getSchemas', async (_, connectionId) => {
    return await databaseService.getSchemas(connectionId);
  });

  ipcMain.handle('db:getTables', async (_, connectionId, schema) => {
    return await databaseService.getTables(connectionId, schema);
  });

  ipcMain.handle('db:getTableSchema', async (_, connectionId, schema, table) => {
    return await databaseService.getTableSchema(connectionId, schema, table);
  });

  ipcMain.handle('keychain:set', async (_, service, account, password) => {
    return await keychainService.setPassword(service, account, password);
  });

  ipcMain.handle('keychain:get', async (_, service, account) => {
    return await keychainService.getPassword(service, account);
  });

  ipcMain.handle('keychain:delete', async (_, service, account) => {
    return await keychainService.deletePassword(service, account);
  });
};