/**
 * Zenith Browser - Main Process
 * Siêu nhẹ, Tối ưu RAM & CPU, Chặn quảng cáo, Tải Video & Ghim Video
 */

const { app, BrowserWindow, ipcMain, session, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

// ===================================================
// CỜ TỐI ƯU HÓA CHROMIUM & V8 ĐỂ ĂN ÍT RAM & CPU NHẤT
// ===================================================
// 1. Giới hạn heap memory của V8 cho mỗi renderer xuống 512MB để tránh phình RAM
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
// 2. Giới hạn số lượng process renderer sinh ra
app.commandLine.appendSwitch('renderer-process-limit', '4');
// 3. Tắt các tiến trình tính toán che khuất ngốn CPU
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,SpareRendererForSitePerProcess');
// 4. Tiết kiệm băng thông và tác vụ mạng ngầm
app.commandLine.appendSwitch('disable-background-networking');
// 5. Bật giải mã video bằng phần cứng, tải đa luồng và Ghim video Picture-in-Picture
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,ParallelDownloading,PictureInPicture,DocumentPictureInPictureAPI');

const ExtensionManager = require('./modules/extensions/manager');
const { COCCOC_DARKMODE_SCRIPT } = require('./modules/darkmode/darkmode');

let mainWindow = null;
let extensionManager = null;

// Thư mục tải về mặc định
let downloadDirectory = app.getPath('downloads');

function getBinPath(filename) {
  if (app.isPackaged) {
    const p1 = path.join(process.resourcesPath, 'bin', filename);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', filename);
    if (fs.existsSync(p2)) return p2;
  }
  return path.join(__dirname, '..', 'bin', filename);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 880,
    minHeight: 560,
    frame: false, // Custom Titlebar hiện đại
    backgroundColor: '#0b0f17', // Màu nền tối sang trọng
    icon: path.join(__dirname, '../assets/zenith.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: true // Tự động giảm tài nguyên khi cửa sổ ở chế độ nền
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] [${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // ==========================================
  // QUẢN LÝ TIẾN TRÌNH TẢI FILE & HUỶ TẢI
  // ==========================================
  const pendingDownloads = new Map();
  const runningDownloads = new Map();

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    if (mb >= 1) {
      return mb.toFixed(1) + ' MB';
    }
    const kb = bytes / 1024;
    if (kb >= 1) {
      return kb.toFixed(0) + ' KB';
    }
    return bytes + ' B';
  }

  function parseToMB(str) {
    if (!str) return null;
    const m = str.match(/([\d\.]+)\s*([KMGTP]?i?B)/i);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const u = m[2].toUpperCase();
    if (u.includes('G')) return num * 1024;
    if (u.includes('M')) return num;
    if (u.includes('K')) return num / 1024;
    return num / (1024 * 1024);
  }

  function cleanUpPartialFiles(savePath) {
    if (!savePath) return;
    setTimeout(() => {
      try {
        if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
        if (fs.existsSync(savePath + '.part')) fs.unlinkSync(savePath + '.part');
        if (fs.existsSync(savePath + '.ytdl')) fs.unlinkSync(savePath + '.ytdl');
      } catch (e) {}
    }, 500);
  }

  ipcMain.on('download-media', (event, { url, filename }) => {
    if (!mainWindow || !url) return;
    const downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    if (filename) {
      pendingDownloads.set(url, { filename, downloadId });
    }
    mainWindow.webContents.downloadURL(url);
  });

  // Xử lý tải file thông thường qua Electron session
  session.defaultSession.on('will-download', (event, item, webContents) => {
    let fileName = item.getFilename();
    const itemUrl = item.getURL();
    let downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // 1. Kiểm tra filename tùy chỉnh từ renderer
    if (pendingDownloads.has(itemUrl)) {
      const p = pendingDownloads.get(itemUrl);
      if (typeof p === 'string') {
        fileName = p;
      } else if (p && p.filename) {
        fileName = p.filename;
        if (p.downloadId) downloadId = p.downloadId;
      }
      pendingDownloads.delete(itemUrl);
    }

    // 2. Chống triệt để việc lưu video/audio thành file .html
    const mime = (item.getMimeType() || '').toLowerCase();
    const isYT = itemUrl.includes('googlevideo.com') || itemUrl.includes('youtube.com');
    const isAudio = mime.startsWith('audio/') || itemUrl.includes('mime=audio') || fileName.toLowerCase().includes('audio');
    const isVideo = mime.startsWith('video/') || (isYT && !isAudio);

    // Chuẩn hóa tên file sạch cho Windows (loại bỏ : * ? " < > | / \)
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
    // Bỏ đuôi .html hoặc .htm nếu bị Chromium gán nhầm
    fileName = fileName.replace(/\.html?$/i, '');

    if (isVideo && !fileName.endsWith('.mp4') && !fileName.endsWith('.webm') && !fileName.endsWith('.mkv')) {
      fileName += '.mp4';
    } else if (isAudio && !fileName.endsWith('.mp3') && !fileName.endsWith('.m4a')) {
      fileName += '.m4a';
    }

    if (!fileName) fileName = 'download_' + Date.now() + (isVideo ? '.mp4' : (isAudio ? '.m4a' : ''));

    const savePath = path.join(downloadDirectory, fileName);
    item.setSavePath(savePath);

    runningDownloads.set(downloadId, {
      id: downloadId,
      type: 'electron',
      item: item,
      fileName: fileName,
      savePath: savePath,
      cancelled: false
    });

    let prevReceived = 0;
    let prevTime = Date.now();
    let lastSpeed = '';

    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const percent = total > 0 ? Math.round((received / total) * 100) : 0;

        const now = Date.now();
        const timeDiff = (now - prevTime) / 1000;
        if (timeDiff >= 0.5) {
          const speed = (received - prevReceived) / timeDiff;
          lastSpeed = formatBytes(speed) + '/s';
          prevTime = now;
          prevReceived = received;
        }

        const receivedStr = formatBytes(received);
        const totalStr = total > 0 ? formatBytes(total) : '';
        const sizeText = totalStr ? `${receivedStr} / ${totalStr}` : receivedStr;

        const entry = runningDownloads.get(downloadId);
        if (entry) entry.lastSizeText = sizeText;

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            id: downloadId,
            fileName,
            savePath,
            received,
            total,
            percent,
            sizeText,
            speedText: lastSpeed,
            state: 'downloading'
          });
        }
      }
    });

    item.once('done', (event, state) => {
      const entry = runningDownloads.get(downloadId);
      runningDownloads.delete(downloadId);

      if (entry && entry.cancelled) return;

      const success = state === 'completed';
      let finalSize = '';
      try {
        if (fs.existsSync(savePath)) {
          finalSize = formatBytes(fs.statSync(savePath).size);
        }
      } catch (e) {}

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-complete', {
          id: downloadId,
          fileName,
          savePath,
          sizeText: finalSize || (entry && entry.lastSizeText) || '',
          state: success ? 'success' : (state === 'cancelled' ? 'cancelled' : 'failed')
        });
      }
    });
  });

  // Huỷ tải xuống
  ipcMain.on('cancel-download', (event, downloadId) => {
    const entry = runningDownloads.get(downloadId);
    if (!entry) return;

    entry.cancelled = true;
    runningDownloads.delete(downloadId);

    if (entry.type === 'electron' && entry.item) {
      try {
        entry.item.cancel();
      } catch (e) {}
    } else if (entry.type === 'ytdlp' && entry.proc) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${entry.proc.pid} /f /t`);
        } else {
          entry.proc.kill('SIGKILL');
        }
      } catch (e) {}
    }

    cleanUpPartialFiles(entry.savePath);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-complete', {
        id: downloadId,
        fileName: entry.fileName,
        savePath: entry.savePath,
        sizeText: 'Đã huỷ tải',
        state: 'cancelled'
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Khởi chạy ứng dụng
app.whenReady().then(async () => {
  // Khởi tạo và nạp các tiện ích mở rộng Chrome / uBlock Origin
  extensionManager = new ExtensionManager(session.defaultSession);
  try {
    await extensionManager.init();
  } catch (e) {
    console.error('[Main] Extension initialization error:', e);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS - Tương tác hệ thống
// ==========================================

// 0. Đường dẫn preload cho webview
ipcMain.on('get-webview-preload', (event) => {
  const { pathToFileURL } = require('url');
  event.returnValue = pathToFileURL(path.join(__dirname, 'webview-preload.js')).href;
});

// 1. Điều khiển cửa sổ
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// 2. Quản lý Tiện ích mở rộng (Chrome / uBlock Extensions)
ipcMain.handle('extension-get-all', async () => {
  if (!extensionManager) return [];
  return await extensionManager.getAllExtensions();
});

ipcMain.on('extension-open-folder', () => {
  if (extensionManager) {
    extensionManager.openExtensionsFolder();
  }
});

ipcMain.handle('extension-pick-and-install', async () => {
  if (!mainWindow || !extensionManager) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn thư mục Extension đã giải nén hoặc tệp .zip / .crx',
    properties: ['openFile', 'openDirectory'],
    filters: [
      { name: 'Tiện ích mở rộng (Thư mục hoặc Zip/Crx)', extensions: ['zip', 'crx'] },
      { name: 'Tất cả tệp', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  try {
    const res = await extensionManager.installFromPath(result.filePaths[0]);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extension-install-path', async (event, sourcePath) => {
  if (!extensionManager || !sourcePath) return { success: false, error: 'Đường dẫn không hợp lệ' };
  try {
    const res = await extensionManager.installFromPath(sourcePath);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extension-toggle', async (event, { id, enabled }) => {
  if (!extensionManager) return { success: false };
  try {
    return await extensionManager.toggleExtension(id, enabled);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extension-remove', async (event, id) => {
  if (!extensionManager) return { success: false };
  try {
    return await extensionManager.removeExtension(id);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extension-reload-all', async () => {
  if (!extensionManager) return [];
  try {
    return await extensionManager.reloadAll();
  } catch (err) {
    console.error('[Main] Extension reload error:', err);
    return [];
  }
});

ipcMain.on('open-download-folder', () => {
  shell.openPath(downloadDirectory);
});

ipcMain.on('show-item-in-folder', (event, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    shell.openPath(downloadDirectory);
  }
});

// 4. Chế độ Ban đêm (Dark Mode)
ipcMain.handle('toggle-dark-mode', async (event) => {
  return COCCOC_DARKMODE_SCRIPT;
});

// 5. Tối ưu bộ nhớ: Dọn dẹp cache & RAM
ipcMain.handle('clear-cache', async () => {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage']
    });
    return true;
  } catch (e) {
    return false;
  }
});

// 6. Cài đặt hệ thống (Settings API)
ipcMain.handle('get-download-folder', () => {
  return downloadDirectory;
});

ipcMain.handle('select-download-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn thư mục tải về mặc định',
    defaultPath: downloadDirectory,
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    downloadDirectory = result.filePaths[0];
    return downloadDirectory;
  }
  return null;
});

ipcMain.handle('clear-browsing-data', async () => {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    });
    return true;
  } catch (e) {
    return false;
  }
});
