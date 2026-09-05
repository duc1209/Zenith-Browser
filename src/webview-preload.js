/**
 * Zenith Webview Preload Script
 * Chạy ngay tại document-start TRƯỚC KHI bất kỳ script nào của trang web chạy
 * Chặn 100% video ads YouTube, xóa sạch khung tài trợ Shopee/Google và quét video tải về
 */

(function() {
  function sendToEmbedder(channel, data) {
    console.log(`__ZENITH_IPC__:${channel}:${JSON.stringify(data)}`);
  }

  // 1. CHÈN CSS TRIỆT TIÊU MỌI KHUNG QUẢNG CÁO & SHOPEE SPONSORED TRÊN YOUTUBE & WEB
  const AD_CSS = `
    /* YouTube: Triệt tiêu toàn bộ thẻ quảng cáo Shopee, Banner tài trợ, Gợi ý */
    ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
    ytd-rich-section-renderer:has(ytd-ad-slot-renderer),
    ytd-rich-section-renderer:has(ytd-in-feed-ad-layout-renderer),
    ytd-banner-promo-renderer,
    #masthead-ad,
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-display-ad-renderer,
    #player-ads,
    .ytp-ad-module,
    .ytp-ad-overlay-container,
    .ytp-ad-player-overlay-layout,
    .ytp-ad-player-overlay,
    .video-ads,
    .sparkles-light-cta,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    #panels:has(ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]),
    #companion,
    ytd-action-companion-ad-renderer,
    ytd-compact-promoted-video-renderer,
    ytd-merch-shelf-renderer,
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
    ytd-enforcement-message-view-model,

    /* Banner web & Mạng quảng cáo phổ biến (Google Ads, DoubleClick, ABPVN) */
    .adsbygoogle,
    [id^="google_ads_"],
    [id^="div-gpt-ad"],
    .ad-container,
    .ad-wrapper,
    .banner-ads,
    .ads-banner,
    .advertisement,
    .ad-slot,
    .sponsored-post,
    .ad-box,
    .qc-container,
    .quang-cao,
    .box-quangcao,
    #ads,
    .ads-holder,
    .ad_wrapper,
    div[data-ad-unit],
    div[data-google-query-id],
    iframe[src*="doubleclick.net"],
    iframe[src*="googlesyndication.com"],
    iframe[src*="adnxs.com"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
      width: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;

  function injectCSS() {
    if (document.getElementById('__zenith_adblock_css')) return;
    const style = document.createElement('style');
    style.id = '__zenith_adblock_css';
    style.textContent = AD_CSS;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  // Chèn CSS ngay tức thì
  injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCSS);
  }

  // 2. VƯỢT QUA CHÍNH SÁCH TRUSTED TYPES CỦA CHROMIUM / YOUTUBE (Chuẩn Cốc Cốc)
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      window.trustedTypes.createPolicy('default', {
        createScript: function(s) { return s; },
        createScriptURL: function(s) { return s; },
        createHTML: function(s) { return s; }
      });
    }
  } catch (e) {}

  // 3. BỘ TRÍCH XUẤT VÀ XÓA BỎ QUẢNG CÁO YOUTUBE THEO CHUẨN CỐC CỐC ADGUARD SCRIPTLET
  function pruneAds(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    let blocked = 0;
    if (obj.adPlacements) { blocked += obj.adPlacements.length || 1; delete obj.adPlacements; }
    if (obj.adSlots) { blocked += obj.adSlots.length || 1; delete obj.adSlots; }
    if (obj.playerAds) { blocked += 1; delete obj.playerAds; }
    delete obj.adBreakHeartbeatParams;
    if (obj.streamingData && obj.streamingData.serverAbrStreamingUrl) {
      delete obj.streamingData.serverAbrStreamingUrl;
    }
    if (blocked > 0) {
      sendToEmbedder('adblock-count', { count: blocked });
    }
    return obj;
  }

  // A. Hook biến toàn cục ytInitialPlayerResponse & playerResponse
  let _ytPlayer = pruneAds(window.ytInitialPlayerResponse);
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: () => _ytPlayer,
      set: (val) => { _ytPlayer = pruneAds(val); },
      configurable: true
    });
  } catch (e) {}

  let _pResponse = pruneAds(window.playerResponse);
  try {
    Object.defineProperty(window, 'playerResponse', {
      get: () => _pResponse,
      set: (val) => { _pResponse = pruneAds(val); },
      configurable: true
    });
  } catch (e) {}

  // B. Hook JSON.parse toàn cục (Loại bỏ adPlacements trong mọi payload JSON trước khi player đọc)
  try {
    const origParse = JSON.parse;
    JSON.parse = function(...args) {
      const result = origParse.apply(this, args);
      if (result && typeof result === 'object') {
        if (result.adPlacements || result.adSlots || result.playerAds) {
          pruneAds(result);
        }
      }
      return result;
    };
  } catch (e) {}

  // C. Hook window.fetch
  try {
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';

      // Chặn request thống kê quảng cáo và DoubleClick
      if (url.includes('/api/stats/ads') || url.includes('/pagead/') || url.includes('ptracking') || 
          url.includes('doubleclick.net') || url.includes('/player/ad_break')) {
        sendToEmbedder('adblock-count', { count: 1 });
        return new Response('{}', { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
      }

      const response = await origFetch.apply(this, args);

      // Lọc dữ liệu /youtubei/v1/player
      if (url.includes('/youtubei/v1/player') || url.includes('/player?')) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          if (json && typeof json === 'object') {
            pruneAds(json);
            return new Response(JSON.stringify(json), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
        } catch (e) {}
      }

      return response;
    };
  } catch (e) {}

  // D. Hook XMLHttpRequest
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string') {
        if (url.includes('/api/stats/ads') || url.includes('/pagead/') || url.includes('ptracking') || 
            url.includes('doubleclick.net') || url.includes('/player/ad_break')) {
          sendToEmbedder('adblock-count', { count: 1 });
          return origOpen.call(this, method, 'data:application/json,{}', ...rest);
        }
      }
      return origOpen.call(this, method, url, ...rest);
    };
  } catch (e) {}

  // E. Bộ máy diệt video ads & Anti-Adblock buster (25ms loop)
  let lastAdReportTime = 0;
  function destroyVideoAds() {
    // 1. Tự động đóng popup cảnh báo chặn quảng cáo của YouTube
    const warnings = document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
    warnings.forEach(el => {
      el.remove();
      const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
      if (backdrop) backdrop.remove();
      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
      sendToEmbedder('adblock-count', { count: 1 });
    });

    // 2. Tự động bấm tất cả các nút Skip Ad
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.videoAdUiSkipButton',
      'button[id*="skip-button"]',
      '.ytp-ad-overlay-close-button'
    ];
    for (const sel of skipSelectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        sendToEmbedder('adblock-count', { count: 1 });
      }
    }

    // 3. Nếu video quảng cáo đang phát (Sensodyne, Shopee, v.v.) -> Tua ngay đến hết
    const video = document.querySelector('video');
    const adElement = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout');
    if (video && adElement) {
      video.muted = true;
      video.playbackRate = 16.0;
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
      video.dispatchEvent(new Event('timeupdate'));
      video.dispatchEvent(new Event('ended'));
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipBtn) skipBtn.click();

      const now = Date.now();
      if (now - lastAdReportTime > 1000) {
        lastAdReportTime = now;
        sendToEmbedder('adblock-count', { count: 1 });
      }
    }
  }

  setInterval(destroyVideoAds, 25);
  const observer = new MutationObserver(destroyVideoAds);
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // 4. BỘ BÓC TÁCH VIDEO & AUDIO CHUẨN XÁC TỪ CỐC CỐC SAVIOR (KHÔNG QUA LINK TRUNG GIAN .HTML)
  function scanPageMedia() {
    // A. Quét YouTube trực tiếp qua Savior Engine (yt-dlp + ffmpeg không bao giờ lỗi định dạng)
    if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be')) {
      if (window.location.pathname.includes('/watch') || window.location.pathname.includes('/shorts/') || window.location.search.includes('v=')) {
        let videoTitle = document.title ? document.title.replace(/ - YouTube$/, '').trim() : '';
        const titleH1 = document.querySelector('h1.ytd-watch-metadata, #title h1 yt-formatted-string, h1.title');
        if (titleH1 && titleH1.textContent.trim()) {
          videoTitle = titleH1.textContent.trim();
        }
        if (!videoTitle || videoTitle === 'YouTube') {
          videoTitle = 'YouTube Video';
        }

        const vidId = (window.location.search.match(/v=([^&]+)/) ? RegExp.$1 : (window.location.pathname.match(/\/shorts\/([^/?]+)/) ? RegExp.$1 : 'yt_video'));

        // 1. Tùy chọn Video MP4 Full HD / 720p có tiếng
        sendToEmbedder('media-detected', {
          media: {
            id: 'yt_video_' + vidId,
            url: window.location.href,
            title: videoTitle + ' (Full HD MP4)',
            type: 'video',
            ext: 'mp4',
            size: 0,
            formattedSize: 'Full HD / 720p'
          }
        });

        // 2. Tùy chọn Nhạc MP3 320kbps chất lượng cao
        sendToEmbedder('media-detected', {
          media: {
            id: 'yt_audio_' + vidId,
            url: window.location.href,
            title: videoTitle + ' (Nhạc MP3)',
            type: 'audio',
            ext: 'mp3',
            size: 0,
            formattedSize: 'MP3 320kbps'
          }
        });
      }
      return;
    }

    // B. Quét video trên các trang web thông thường (Facebook, TikTok, Web phim)
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((vid, idx) => {
      const src = vid.src || vid.currentSrc;
      if (src && !src.startsWith('blob:') && !src.startsWith('data:') && !src.includes('googlevideo.com')) {
        sendToEmbedder('media-detected', {
          media: {
            id: 'dom_vid_' + idx,
            url: src,
            title: (document.title || 'Video') + ' (MP4)',
            type: 'video',
            ext: 'mp4',
            size: 0,
            formattedSize: 'Video MP4'
          }
        });
      }
    });
  }

  setInterval(scanPageMedia, 1500);
  document.addEventListener('DOMContentLoaded', scanPageMedia);

  // ==========================================================
  // 5. THEO DÕI TRẠNG THÁI PHÁT CHO TRÌNH ĐIỀU KHIỂN ĐA PHƯƠNG TIỆN (GLOBAL MEDIA CONTROLS)
  // ==========================================================
  function reportMediaPlaybackState() {
    const isYouTube = window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be');
    const isYouTubeWatch = isYouTube && (window.location.pathname.includes('/watch') || window.location.pathname.includes('/shorts/') || window.location.search.includes('v='));

    // Lọc danh sách video hợp lệ (có nguồn, chưa kết thúc)
    const videos = Array.from(document.querySelectorAll('video')).filter(v => {
      if (!v.currentSrc && !v.src) return false;
      if (v.ended) return false;
      return true;
    });

    let video = null;
    if (isYouTube) {
      if (isYouTubeWatch) {
        // Đang xem video trên YouTube
        video = videos.find(v => !v.paused && v.duration > 0) || videos.find(v => v.duration > 0 && !v.ended) || videos[0];
      } else {
        // Đang ở trang chủ / tìm kiếm YouTube: Bỏ qua video xem trước tắt tiếng
        video = videos.find(v => !v.paused && !v.muted && v.duration > 0 && v.currentTime > 0);
      }
    } else {
      // Các trang web khác: chỉ nhận video đang phát hoặc đang tạm dừng nhưng chưa kết thúc
      video = videos.find(v => !v.paused && v.duration > 0) || videos.find(v => v.duration > 0 && !v.ended);
    }

    // Nếu không có video hoặc video đã tắt/kết thúc:
    if (!video || video.ended || (isYouTube && !isYouTubeWatch && video.paused)) {
      sendToEmbedder('media-playback-state', { hasMedia: false });
      return;
    }

    let title = document.title ? document.title.replace(/ - YouTube$/, '').trim() : '';
    let artist = '';
    let thumbnail = '';

    if (isYouTube) {
      const titleElem = document.querySelector('h1.ytd-watch-metadata, #title h1 yt-formatted-string, h1.title, .slim-video-metadata-title');
      if (titleElem && titleElem.textContent.trim()) title = titleElem.textContent.trim();
      const channelElem = document.querySelector('ytd-channel-name a, #channel-name a, #owner-name a, .slim-owner-channel-name');
      if (channelElem && channelElem.textContent.trim()) artist = channelElem.textContent.trim();
      const vidId = window.location.search.match(/v=([^&]+)/) ? RegExp.$1 : (window.location.pathname.match(/\/shorts\/([^/?]+)/) ? RegExp.$1 : '');
      if (vidId) thumbnail = `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
    }

    if (!thumbnail && video.poster) thumbnail = video.poster;
    if (!thumbnail) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) thumbnail = ogImg.getAttribute('content') || '';
    }
    if (!artist) artist = window.location.hostname.replace('www.', '');

    sendToEmbedder('media-playback-state', {
      hasMedia: true,
      title: title || 'Đang phát video',
      artist: artist,
      thumbnail: thumbnail,
      domain: window.location.hostname.replace('www.', ''),
      paused: video.paused,
      currentTime: Math.floor(video.currentTime || 0),
      duration: isFinite(video.duration) ? Math.floor(video.duration || 0) : 0,
      isPip: document.pictureInPictureElement === video
    });
  }

  setInterval(reportMediaPlaybackState, 1000);
  document.addEventListener('play', reportMediaPlaybackState, true);
  document.addEventListener('pause', reportMediaPlaybackState, true);
  document.addEventListener('seeked', reportMediaPlaybackState, true);
  document.addEventListener('ended', () => {
    sendToEmbedder('media-playback-state', { hasMedia: false });
  }, true);
  document.addEventListener('emptied', () => {
    sendToEmbedder('media-playback-state', { hasMedia: false });
  }, true);
  document.addEventListener('enterpictureinpicture', reportMediaPlaybackState);
  document.addEventListener('leavepictureinpicture', reportMediaPlaybackState);
  window.addEventListener('beforeunload', () => {
    sendToEmbedder('media-playback-state', { hasMedia: false });
  });
})();
