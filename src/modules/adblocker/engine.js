/**
 * Cốc Cốc AdBlock Engine - Bộ xử lý chặn quảng cáo
 * Điều phối chặn request mạng, chèn CSS ẩn quảng cáo và script YouTube
 */

const { AD_DOMAINS, YOUTUBE_AD_PATTERNS, COSMETIC_FILTERS, YOUTUBE_ADBLOCK_SCRIPT } = require('./rules');

class AdBlockEngine {
  constructor() {
    this.enabled = true;
    this.whitelist = new Set(); // Danh sách domain người dùng cho phép quảng cáo
    this.stats = {
      totalBlocked: 0,
      perHost: {} // { 'example.com': 12 }
    };
  }

  // Bật / Tắt chặn quảng cáo toàn cục
  setEnabled(status) {
    this.enabled = !!status;
  }

  // Kiểm tra trạng thái cho 1 host
  isEnabledForHost(host) {
    if (!this.enabled) return false;
    if (!host) return true;
    const cleanHost = host.replace(/^www\./, '');
    return !this.whitelist.has(cleanHost);
  }

  // Bật / tắt cho 1 host cụ thể
  toggleForHost(host) {
    if (!host) return this.enabled;
    const cleanHost = host.replace(/^www\./, '');
    if (this.whitelist.has(cleanHost)) {
      this.whitelist.delete(cleanHost);
      return true; // Đã bật lại chặn quảng cáo
    } else {
      this.whitelist.add(cleanHost);
      return false; // Đã tắt chặn cho host này
    }
  }

  // Kiểm tra xem URL có bị chặn không
  shouldBlock(url, mainHost = '') {
    if (!this.enabled) return false;
    if (mainHost && !this.isEnabledForHost(mainHost)) return false;

    try {
      const parsedUrl = new URL(url);
      const urlHost = parsedUrl.hostname.toLowerCase();
      const fullUrl = url.toLowerCase();

      // 1. Kiểm tra domain quảng cáo
      for (const domain of AD_DOMAINS) {
        if (urlHost === domain || urlHost.endsWith('.' + domain) || fullUrl.includes(domain)) {
          this.recordBlock(mainHost || urlHost);
          return true;
        }
      }

      // 2. Kiểm tra quảng cáo video YouTube
      if (mainHost.includes('youtube.com') || urlHost.includes('youtube.com') || urlHost.includes('googlevideo.com')) {
        for (const pattern of YOUTUBE_AD_PATTERNS) {
          if (fullUrl.includes(pattern)) {
            this.recordBlock('youtube.com');
            return true;
          }
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  // Ghi nhận số lượng quảng cáo đã chặn
  recordBlock(host) {
    this.stats.totalBlocked++;
    if (host) {
      const cleanHost = host.replace(/^www\./, '');
      this.stats.perHost[cleanHost] = (this.stats.perHost[cleanHost] || 0) + 1;
    }
  }

  // Lấy thống kê số quảng cáo bị chặn cho 1 host
  getBlockedCount(host) {
    if (!host) return this.stats.totalBlocked;
    const cleanHost = host.replace(/^www\./, '');
    return this.stats.perHost[cleanHost] || 0;
  }

  // Thiết lập interceptor lên session của Electron
  attachToSession(electronSession) {
    const filter = { urls: ['*://*/*'] };

    // 1. Gỡ bỏ Content-Security-Policy & Trusted Types để cho phép scriptlet chặn quảng cáo hoạt động 100%
    electronSession.webRequest.onHeadersReceived(filter, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      for (const key of Object.keys(responseHeaders)) {
        const lower = key.toLowerCase();
        if (lower.startsWith('content-security-policy')) {
          delete responseHeaders[key];
        }
      }
      callback({ responseHeaders });
    });

    // 2. Chặn các request quảng cáo trước khi gửi
    electronSession.webRequest.onBeforeRequest(filter, (details, callback) => {
      let mainHost = '';
      try {
        if (details.webContents && !details.webContents.isDestroyed() && details.webContents.getURL()) {
          mainHost = new URL(details.webContents.getURL()).hostname;
        }
      } catch (e) {}

      if (!mainHost && details.referrer) {
        try { mainHost = new URL(details.referrer).hostname; } catch (e) {}
      }
      if (!mainHost && details.initiator) {
        try { mainHost = new URL(details.initiator).hostname; } catch (e) {}
      }

      if (this.shouldBlock(details.url, mainHost)) {
        callback({ cancel: true });
      } else {
        callback({ cancel: false });
      }
    });

    // 3. Chèn script và CSS chặn quảng cáo vào webContents
    electronSession.on('web-contents-created', (event, contents) => {
      const applyFilters = async () => {
        try {
          if (contents.isDestroyed()) return;
          const pageUrl = contents.getURL();
          if (!pageUrl || pageUrl.startsWith('chrome') || pageUrl.startsWith('file')) return;

          const host = new URL(pageUrl).hostname;
          if (!this.isEnabledForHost(host)) return;

          // Chèn CSS ẩn banner quảng cáo & Shopee/Sponsored
          await contents.insertCSS(COSMETIC_FILTERS);

          // Nếu là YouTube, chèn script tự động tua và diệt quảng cáo video
          if (host.includes('youtube.com')) {
            await contents.executeJavaScript(YOUTUBE_ADBLOCK_SCRIPT, true);
          }
        } catch (e) {
          // Bỏ qua nếu trang đã đóng hoặc webContents bị hủy
        }
      };

      contents.on('did-start-navigation', (e, url) => {
        if (url && url.includes('youtube.com')) {
          contents.executeJavaScript(YOUTUBE_ADBLOCK_SCRIPT, true).catch(() => {});
        }
      });
      contents.on('dom-ready', applyFilters);
      contents.on('did-finish-load', applyFilters);
      contents.on('did-navigate-in-page', applyFilters);
    });
  }
}

module.exports = AdBlockEngine;
