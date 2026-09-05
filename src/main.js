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

const AdBlockEngine = require('./modules/adblocker/engine');
const MediaSniffer = require('./modules/downloader/sniffer');
const { COCCOC_DARKMODE_SCRIPT } = require('./modules/darkmode/darkmode');

let mainWindow = null;
const adBlockEngine = new AdBlockEngine();
const mediaSniffer = new MediaSniffer();

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

  ipcMain.on('download-media', (event, { url, filename, type }) => {
    if (!mainWindow || !url) return;

    const downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const ytdlpPath = getBinPath('yt-dlp.exe');

    // Nếu là video YouTube và engine yt-dlp đã sẵn sàng: Tải và ghép video + audio 100% chuẩn
    if (isYouTube && fs.existsSync(ytdlpPath)) {
      let baseName = (filename || 'youtube_video').replace(/[<>:"/\\|?*]/g, '_').trim();
      baseName = baseName.replace(/\.(mp4|m4a|mp3|html?)$/i, '');
      const isAudio = type === 'audio' || baseName.toLowerCase().includes('mp3') || baseName.toLowerCase().includes('audio');
      const ext = isAudio ? 'mp3' : 'mp4';
      const finalFileName = `${baseName}.${ext}`;
      const savePath = path.join(downloadDirectory, finalFileName);

      // Báo tiến trình bắt đầu tải với ID để hỗ trợ huỷ
      mainWindow.webContents.send('download-progress', {
        id: downloadId,
        fileName: finalFileName,
        savePath: savePath,
        received: 0,
        total: 100,
        percent: 0,
        sizeText: 'Đang kết nối & phân tích dung lượng...',
        speedText: '',
        state: 'downloading'
      });

      const ffmpegPath = getBinPath('ffmpeg.exe');
      const args = [
        '--newline',
        '--no-playlist',
        '--ffmpeg-location', ffmpegPath
      ];

      if (isAudio) {
        args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3');
      } else {
        args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', '--merge-output-format', 'mp4');
      }

      args.push('-o', path.join(downloadDirectory, `${baseName}.%(ext)s`), url);

      const proc = spawn(ytdlpPath, args, {
        cwd: path.join(__dirname, '..', 'bin')
      });

      runningDownloads.set(downloadId, {
        id: downloadId,
        type: 'ytdlp',
        proc,
        fileName: finalFileName,
        savePath,
        lastSizeText: 'Đang tải...',
        cancelled: false
      });

      let lastPercent = 0;
      let lastSizeText = 'Đang tải...';

      proc.stdout.on('data', data => {
        const text = data.toString();
        const lines = text.split(/[\r\n]+/);
        for (const line of lines) {
          if (!line) continue;

          if (line.includes('[Merger]')) {
            lastSizeText = 'Đang ghép video & âm thanh Full HD...';
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-progress', {
                id: downloadId,
                fileName: finalFileName,
                savePath: savePath,
                percent: 98,
                sizeText: lastSizeText,
                speedText: '',
                state: 'downloading'
              });
            }
            continue;
          }

          if (line.includes('[ExtractAudio]')) {
            lastSizeText = 'Đang trích xuất sang MP3 320kbps...';
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-progress', {
                id: downloadId,
                fileName: finalFileName,
                savePath: savePath,
                percent: 98,
                sizeText: lastSizeText,
                speedText: '',
                state: 'downloading'
              });
            }
            continue;
          }

          const percentMatch = line.match(/(\d+\.?\d*)%/);
          const sizeMatch = line.match(/of\s+~?\s*([\d\.]+\s*[KMGTP]?i?B)/i);
          const speedMatch = line.match(/at\s+([\d\.]+\s*[KMGTP]?i?B\/s)/i);

          if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            lastPercent = percent;

            let sizeText = lastSizeText;
            if (sizeMatch) {
              const totalStr = sizeMatch[1];
              const totalMB = parseToMB(totalStr);
              if (totalMB) {
                const receivedMB = (totalMB * percent / 100).toFixed(1);
                const totalDisplay = totalMB >= 1024 ? (totalMB / 1024).toFixed(2) + ' GB' : totalMB.toFixed(1) + ' MB';
                const receivedDisplay = totalMB >= 1024 ? (receivedMB / 1024).toFixed(2) + ' GB' : receivedMB + ' MB';
                sizeText = `${receivedDisplay} / ${totalDisplay}`;
              } else {
                sizeText = `${percent.toFixed(1)}% của ${totalStr}`;
              }
              lastSizeText = sizeText;
            }

            const speedText = speedMatch ? speedMatch[1].replace('iB', 'B') : '';

            const entry = runningDownloads.get(downloadId);
            if (entry) entry.lastSizeText = sizeText;

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-progress', {
                id: downloadId,
                fileName: finalFileName,
                savePath: savePath,
                percent: Math.round(percent),
                sizeText: sizeText,
                speedText: speedText,
                state: 'downloading'
              });
            }
          }
        }
      });

      proc.on('close', code => {
        const entry = runningDownloads.get(downloadId);
        runningDownloads.delete(downloadId);

        if (entry && entry.cancelled) {
          return;
        }

        const targetFile = fs.existsSync(savePath) ? savePath : path.join(downloadDirectory, `${baseName}.${ext}`);
        const fileExists = fs.existsSync(targetFile);
        let finalSizeText = lastSizeText;
        if (fileExists) {
          try {
            const stats = fs.statSync(targetFile);
            finalSizeText = formatBytes(stats.size);
          } catch (e) {}
        }
        const success = code === 0 || fileExists;

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-complete', {
            id: downloadId,
            fileName: finalFileName,
            savePath: targetFile,
            sizeText: finalSizeText,
            state: success ? 'success' : 'failed'
          });
        }
      });
      return;
    }

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
app.whenReady().then(() => {
  // Gắn bộ chặn quảng cáo cực mạnh
  adBlockEngine.attachToSession(session.defaultSession);

  // Gắn bộ phát hiện Video / Audio
  mediaSniffer.attachToSession(session.defaultSession, (tabId, mediaItem) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-detected', {
        tabId,
        media: mediaItem
      });
    }
  });

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

// 2. Chặn quảng cáo (Zenith Shield)
ipcMain.handle('adblock-get-stats', (event, host) => {
  return {
    enabled: adBlockEngine.isEnabledForHost(host),
    blockedCount: adBlockEngine.getBlockedCount(host),
    totalBlocked: adBlockEngine.stats.totalBlocked
  };
});

ipcMain.handle('adblock-record-block', (event, { host, count }) => {
  const c = Math.min(Math.max(count || 1, 1), 3);
  for (let i = 0; i < c; i++) {
    adBlockEngine.recordBlock(host || 'youtube.com');
  }
  return {
    blockedCount: adBlockEngine.getBlockedCount(host || 'youtube.com'),
    totalBlocked: adBlockEngine.stats.totalBlocked
  };
});

ipcMain.handle('adblock-toggle', (event, host) => {
  const newStatus = adBlockEngine.toggleForHost(host);
  return {
    enabled: newStatus,
    blockedCount: adBlockEngine.getBlockedCount(host)
  };
});

// 3. Tải Video & Media
ipcMain.handle('media-get-list', (event, tabId) => {
  return mediaSniffer.getMediaList(tabId);
});

ipcMain.handle('media-clear-list', (event, tabId) => {
  mediaSniffer.clearTab(tabId);
  return true;
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
