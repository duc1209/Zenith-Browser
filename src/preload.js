/**
 * Zenith Browser - Preload Script
 * Cầu nối bảo mật an toàn giữa Electron Main và giao diện UI
 */

const { contextBridge, ipcRenderer } = require('electron');

let webviewPreloadUrl = '';
try {
  webviewPreloadUrl = ipcRenderer.sendSync('get-webview-preload');
} catch (e) {}

contextBridge.exposeInMainWorld('zenithAPI', {
  // Đường dẫn nạp preload vào thẻ webview
  webviewPreloadPath: webviewPreloadUrl,

  // Điều khiển cửa sổ
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Quản lý chặn quảng cáo (Zenith Shield)
  getAdblockStats: (host) => ipcRenderer.invoke('adblock-get-stats', host),
  toggleAdblock: (host) => ipcRenderer.invoke('adblock-toggle', host),
  recordAdBlock: (host, count) => ipcRenderer.invoke('adblock-record-block', { host, count }),

  // Quản lý Bắt link & Tải Video
  getMediaList: (tabId) => ipcRenderer.invoke('media-get-list', tabId),
  clearMediaList: (tabId) => ipcRenderer.invoke('media-clear-list', tabId),
  downloadUrl: (url, filename, type) => ipcRenderer.send('download-media', { url, filename, type }),
  cancelDownload: (downloadId) => ipcRenderer.send('cancel-download', downloadId),
  onMediaDetected: (callback) => {
    ipcRenderer.on('media-detected', (event, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, data) => callback(data));
  },

  // Mở thư mục tải về
  openDownloadFolder: () => ipcRenderer.send('open-download-folder'),
  showItemInFolder: (filePath) => ipcRenderer.send('show-item-in-folder', filePath),

  // Chế độ ban đêm (Dark Mode)
  toggleDarkMode: () => ipcRenderer.invoke('toggle-dark-mode'),

  // Tối ưu RAM & Xóa cache
  clearCache: () => ipcRenderer.invoke('clear-cache'),

  // Cài đặt hệ thống (Settings)
  getDownloadFolder: () => ipcRenderer.invoke('get-download-folder'),
  selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data')
});

// Giữ lại alias coccocAPI để tương thích ngược nếu cần
contextBridge.exposeInMainWorld('coccocAPI', {
  webviewPreloadPath: webviewPreloadUrl,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getAdblockStats: (host) => ipcRenderer.invoke('adblock-get-stats', host),
  toggleAdblock: (host) => ipcRenderer.invoke('adblock-toggle', host),
  recordAdBlock: (host, count) => ipcRenderer.invoke('adblock-record-block', { host, count }),
  getMediaList: (tabId) => ipcRenderer.invoke('media-get-list', tabId),
  clearMediaList: (tabId) => ipcRenderer.invoke('media-clear-list', tabId),
  downloadUrl: (url, filename, type) => ipcRenderer.send('download-media', { url, filename, type }),
  cancelDownload: (downloadId) => ipcRenderer.send('cancel-download', downloadId),
  onMediaDetected: (callback) => {
    ipcRenderer.on('media-detected', (event, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, data) => callback(data));
  },
  openDownloadFolder: () => ipcRenderer.send('open-download-folder'),
  showItemInFolder: (filePath) => ipcRenderer.send('show-item-in-folder', filePath),
  toggleDarkMode: () => ipcRenderer.invoke('toggle-dark-mode')
});
