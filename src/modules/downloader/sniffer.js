/**
 * Zenith Video Sniffer - Bộ phát hiện luồng video thực thụ
 * Lọc bỏ toàn bộ âm thanh thông báo nhỏ (< 1MB) và chỉ bắt các video thực tế (.mp4, .webm, .m3u8)
 */

const path = require('path');

class MediaSniffer {
  constructor() {
    this.mediaMap = new Map();
  }

  initTab(tabId) {
    this.mediaMap.set(tabId, []);
  }

  clearTab(tabId) {
    this.mediaMap.set(tabId, []);
  }

  getMediaList(tabId) {
    return this.mediaMap.get(tabId) || [];
  }

  inspectResponse(tabId, details) {
    if (!tabId) return null;

    const url = details.url;
    // Bỏ qua các file ảnh, icon, font, analytics
    if (url.includes('.svg') || url.includes('.png') || url.includes('.jpg') || 
        url.includes('.webp') || url.includes('.woff') || url.includes('.css') || url.includes('.js')) {
      return null;
    }

    const headers = details.responseHeaders || {};
    let contentType = '';
    let contentLength = 0;

    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (lower === 'content-type') {
        contentType = (headers[key][0] || '').toLowerCase();
      } else if (lower === 'content-length') {
        contentLength = parseInt(headers[key][0] || '0', 10);
      }
    }

    // 0. Bỏ qua các đoạn phát trực tiếp phân mảnh của YouTube (MSE chunks) vì chúng không thể chạy độc lập
    if (url.includes('googlevideo.com')) {
      return null;
    }

    // 1. Kiểm tra nếu là VIDEO thực thụ trên các website thông thường
    const isVideoType = contentType.startsWith('video/') ||
      url.includes('.mp4') ||
      url.includes('.m3u8') ||
      url.includes('.webm') ||
      url.includes('.flv') ||
      url.includes('.ts') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('application/vnd.apple.mpegurl');

    // 2. Lọc bỏ âm thanh hiệu ứng giao diện (UI sound effects nhỏ như failure.mp3, click.mp3)
    // CHỈ chấp nhận file âm thanh dài / bài hát thực sự (> 1.5MB)
    const isRealAudioTrack = (contentType.startsWith('audio/') || url.includes('.mp3')) && contentLength > 1.5 * 1024 * 1024;

    // Bỏ qua các file dưới 400KB (trừ m3u8 playlist)
    if (!url.includes('.m3u8') && contentLength > 0 && contentLength < 400 * 1024) {
      return null;
    }

    // Bỏ qua các từ khóa âm thanh UI
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('failure.mp3') || lowerUrl.includes('success.mp3') ||
        lowerUrl.includes('open.mp3') || lowerUrl.includes('no_input.mp3') ||
        lowerUrl.includes('notification') || lowerUrl.includes('beep') || lowerUrl.includes('alert')) {
      return null;
    }

    if (isVideoType || isRealAudioTrack) {
      let ext = 'mp4';
      if (url.includes('.m3u8') || contentType.includes('mpegurl')) ext = 'm3u8';
      else if (url.includes('.webm') || contentType.includes('webm')) ext = 'webm';
      else if (url.includes('.mp3') || contentType.includes('mp3')) ext = 'mp3';

      let fileName = 'video_' + Date.now() + '.' + ext;
      try {
        const urlObj = new URL(url);
        const baseName = path.basename(urlObj.pathname);
        if (baseName && baseName.length > 3 && baseName.includes('.')) {
          fileName = baseName.split('?')[0];
        }
      } catch (e) {}

      const mediaItem = {
        id: 'video_' + Math.random().toString(36).substr(2, 9),
        url: url,
        title: fileName,
        type: isVideoType ? 'video' : 'audio',
        ext: ext,
        size: contentLength,
        formattedSize: this.formatBytes(contentLength)
      };

      const currentList = this.mediaMap.get(tabId) || [];
      const exists = currentList.some(item => item.url === url || (item.size > 0 && item.size === contentLength));
      if (!exists) {
        currentList.push(mediaItem);
        this.mediaMap.set(tabId, currentList);
        return mediaItem;
      }
    }

    return null;
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return 'Luồng trực tiếp';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  attachToSession(electronSession, onMediaDetected) {
    const filter = { urls: ['*://*/*'] };
    electronSession.webRequest.onResponseStarted(filter, (details) => {
      const tabId = details.webContentsId;
      if (!tabId) return;

      const mediaItem = this.inspectResponse(tabId, details);
      if (mediaItem && onMediaDetected) {
        onMediaDetected(tabId, mediaItem);
      }
    });
  }
}

module.exports = MediaSniffer;
