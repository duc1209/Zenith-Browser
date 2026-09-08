/**
 * Zenith Browser - Preload Script
 * Cầu nối bảo mật an toàn giữa Electron Main và giao diện UI
 */

const { contextBridge, ipcRenderer } = require('electron');

let webviewPreloadUrl = '';
try {
  webviewPreloadUrl = ipcRenderer.sendSync('get-webview-preload');
} catch (e) {}

const zenithAPI = {
  // Đường dẫn nạp preload vào thẻ webview
  webviewPreloadPath: webviewPreloadUrl,

  // Điều khiển cửa sổ
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Quản lý Tiện ích mở rộng (Chrome Extensions)
  getAllExtensions: () => ipcRenderer.invoke('extension-get-all'),
  openExtensionsFolder: () => ipcRenderer.send('extension-open-folder'),
  pickAndInstallExtension: () => ipcRenderer.invoke('extension-pick-and-install'),
  installExtensionFromPath: (sourcePath) => ipcRenderer.invoke('extension-install-path', sourcePath),
  toggleExtension: (id, enabled) => ipcRenderer.invoke('extension-toggle', { id, enabled }),
  removeExtension: (id) => ipcRenderer.invoke('extension-remove', id),
  reloadExtensions: () => ipcRenderer.invoke('extension-reload-all'),

  // Tải file thông thường
  downloadUrl: (url, filename) => ipcRenderer.send('download-media', { url, filename }),
  cancelDownload: (downloadId) => ipcRenderer.send('cancel-download', downloadId),
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
};

contextBridge.exposeInMainWorld('zenithAPI', zenithAPI);
contextBridge.exposeInMainWorld('coccocAPI', zenithAPI);
