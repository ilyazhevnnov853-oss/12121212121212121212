import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

let mainWindow: BrowserWindow | null = null;
let prisma: PrismaClient;

// Определяем путь к БД: в production используем userData, в dev - C:\Temp\TagEngine
const dbDir = app.isPackaged 
  ? path.join(app.getPath('userData'), 'Database')
  : 'C:\\Temp\\TagEngine';
const dbPath = path.join(dbDir, 'database.sqlite');

function initDatabase() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Инициализируем PrismaClient с адаптером better-sqlite3 для Electron
  const sqlite = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(sqlite);
  
  // Указываем Prisma, где искать бинарный движок
  const qePath = path.join(__dirname, '../node_modules/@prisma/client');
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(qePath, 'query_engine-windows.dll.node');
  
  prisma = new PrismaClient({ adapter });
  
  console.log('Database initialized at:', dbPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});
