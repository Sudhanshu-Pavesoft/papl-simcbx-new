import './env'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { appendFileSync } from 'fs'

process.on('uncaughtException', (err) => {
  try {
    appendFileSync(
      require('path').join(app.getPath('userData'), 'main-crash.log'),
      `${new Date().toISOString()} ${err.stack ?? err.message}\n`
    )
  } catch {
    /* ignore */
  }
  console.error('Uncaught exception in main process:', err)
})
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC } from '@shared/ipc.types'
import { registerDbIpc } from './ipc/registerDbIpc'
import { registerPlcIpc } from './ipc/registerPlcIpc'
import { initDevices, registerDeviceIpc } from './ipc/registerDeviceIpc'
import { destroyBarcodeScanner } from './devices/barcodeScanner'
import { destroyLaserClient } from './devices/laserMarker'
import { prisma } from './db/prisma'
import { node } from './plc/plcNode'
import { getPLCConnectionStatus, startPolling, stopAllPolling } from './plcService'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Fullscreen kiosk-style HMI window (layouts assume 100vh).
  mainWindow = new BrowserWindow({
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.simcbx.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle(IPC.APP_EXIT, () => {
    app.quit()
  })

  registerDbIpc()
  registerPlcIpc()
  registerDeviceIpc()
  initDevices()

  createWindow()

  const sendToRenderer = (channel: string, payload: unknown): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload)
    }
  }

  // Fire-and-forget: connect() also starts the reconnect loop.
  void node.connect().catch((err) => console.error('PLC initial connect failed:', err))

  // 800ms data poll -> 'plc-data' push (payload keyed by raw mapping strings).
  startPolling((data) => sendToRenderer(IPC.PLC_DATA, data))

  // 1s status push replaces the old heartbeat websocket.
  setInterval(() => sendToRenderer(IPC.PLC_STATUS, getPLCConnectionStatus()), 1000)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopAllPolling()
  void node.disconnect()
  destroyBarcodeScanner()
  destroyLaserClient()
  void prisma.$disconnect()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
