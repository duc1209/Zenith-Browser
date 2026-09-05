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

  // 2.5 uBlock Origin Surrogates (Giả lập vô hại các tracker & Anti-Adblock Defusers)
  try {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.google_ad_client = "ca-pub-0000000000000000";
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.loaded = true;
    window.adsbygoogle.push = function() { return 1; };

    window.ga = window.ga || function() {};
    window.gtag = window.gtag || function() {};
    window.dataLayer = window.dataLayer || [];

    const noopDefuser = function() {
      this.check = function() {};
      this.clearEvent = function() {};
      this.on = function(a, b) { if (!a) setTimeout(b, 1); return this; };
      this.onDetected = function() { return this; };
      this.onNotDetected = function(fn) { if (typeof fn === 'function') setTimeout(fn, 1); return this; };
    };
    window.FuckAdBlock = noopDefuser;
    window.BlockAdBlock = noopDefuser;
  } catch (e) {}

  // 3. BỘ TRÍCH XUẤT VÀ XÓA BỎ QUẢNG CÁO YOUTUBE THEO CHUẨN UBLOCK ORIGIN SCRIPTLET
  let lastAdReportTime = 0;
  function reportBlockedAds(count = 1) {
    const now = Date.now();
    if (now - lastAdReportTime > 2000) {
      lastAdReportTime = now;
      sendToEmbedder('adblock-count', { count: Math.min(count, 3) });
    }
  }

  function deepPruneAds(obj, depth) {
    if (!obj || typeof obj !== 'object' || (depth || 0) > 8) return obj;
    const currentDepth = (depth || 0) + 1;
    let prunedCount = 0;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        deepPruneAds(obj[i], currentDepth);
      }
      return obj;
    }

    if ('adPlacements' in obj) {
      if (Array.isArray(obj.adPlacements)) prunedCount += obj.adPlacements.length;
      else prunedCount += 1;
      delete obj.adPlacements;
    }
    if ('adSlots' in obj) {
      if (Array.isArray(obj.adSlots)) prunedCount += obj.adSlots.length;
      else prunedCount += 1;
      delete obj.adSlots;
    }
    if ('playerAds' in obj) { prunedCount += 1; delete obj.playerAds; }
    if ('adBreakHeartbeatParams' in obj) delete obj.adBreakHeartbeatParams;
    if ('adFormat' in obj) delete obj.adFormat;
    if ('instreamAdPlayerConfig' in obj) delete obj.instreamAdPlayerConfig;
    if ('ad_break' in obj) delete obj.ad_break;

    if (obj.streamingData && obj.streamingData.serverAbrStreamingUrl) {
      delete obj.streamingData.serverAbrStreamingUrl;
    }

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string') {
        if ((key === 'playerResponse' || key === 'raw_player_response') && (val.includes('adPlacements') || val.includes('adSlots') || val.includes('playerAds'))) {
          try {
            const parsed = JSON.parse(val);
            deepPruneAds(parsed, currentDepth);
            obj[key] = JSON.stringify(parsed);
            prunedCount += 1;
          } catch (e) {}
        }
      } else if (typeof val === 'object' && val !== null) {
        deepPruneAds(val, currentDepth);
      }
    }

    if (prunedCount > 0) {
      reportBlockedAds(prunedCount);
    }
    return obj;
  }

  // Tắt bộ máy phân phối quảng cáo YouTube thông qua ytcfg EXPERIMENT_FLAGS
  function defuseYtcfg(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    const exp = cfg.EXPERIMENT_FLAGS || (cfg.data_ && cfg.data_.EXPERIMENT_FLAGS);
    if (exp) {
      exp.web_enable_ab_testing_on_player_ad_events = false;
      exp.all_web_enable_network_machine = false;
      exp.web_player_enable_ad_break_free = true;
      exp.html5_enable_ad_timeout = false;
      exp.disable_ad_filter = false;
      exp.web_player_touch_next_to_seek = true;
    }
  }

  try {
    if (window.ytcfg) {
      if (window.ytcfg.data_) defuseYtcfg(window.ytcfg.data_);
      if (typeof window.ytcfg.set === 'function') {
        const origSet = window.ytcfg.set;
        window.ytcfg.set = function(newCfg, ...args) {
          defuseYtcfg(newCfg);
          return origSet.call(this, newCfg, ...args);
        };
      }
    }
  } catch (e) {}

  // A. Hook biến toàn cục ytInitialPlayerResponse, playerResponse & ytplayer
  let _ytPlayer = window.ytInitialPlayerResponse ? deepPruneAds(window.ytInitialPlayerResponse) : undefined;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: () => _ytPlayer,
      set: (val) => { _ytPlayer = deepPruneAds(val); },
      configurable: true
    });
  } catch (e) {}

  let _pResponse = window.playerResponse ? deepPruneAds(window.playerResponse) : undefined;
  try {
    Object.defineProperty(window, 'playerResponse', {
      get: () => _pResponse,
      set: (val) => { _pResponse = deepPruneAds(val); },
      configurable: true
    });
  } catch (e) {}

  try {
    let _ytplayer = window.ytplayer;
    if (_ytplayer && _ytplayer.config && _ytplayer.config.args) {
      deepPruneAds(_ytplayer.config.args);
    }
    Object.defineProperty(window, 'ytplayer', {
      get: () => _ytplayer,
      set: (val) => {
        if (val && val.config && val.config.args) {
          deepPruneAds(val.config.args);
        }
        _ytplayer = val;
      },
      configurable: true
    });
  } catch (e) {}

  // B. Hook Response.prototype.json & Response.prototype.text (Chặn đứng mọi ad breaks trả về qua stream / fetch)
  try {
    const origRespJson = Response.prototype.json;
    Response.prototype.json = async function() {
      const data = await origRespJson.call(this);
      try {
        const url = (this.url || '').toLowerCase();
        if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next') || 
            url.includes('/youtubei/v1/browse') || url.includes('/get_video_info')) {
          deepPruneAds(data);
        }
      } catch (e) {}
      return data;
    };

    const origRespText = Response.prototype.text;
    Response.prototype.text = async function() {
      let text = await origRespText.call(this);
      try {
        const url = (this.url || '').toLowerCase();
        if (url.includes('/youtubei/v1/player') || url.includes('/player?') || url.includes('/get_video_info')) {
          if (text.includes('adPlacements') || text.includes('adSlots') || text.includes('playerAds')) {
            try {
              const data = JSON.parse(text);
              deepPruneAds(data);
              text = JSON.stringify(data);
            } catch (e) {}
          }
        }
      } catch (e) {}
      return text;
    };
  } catch (e) {}

  // C. Hook JSON.parse toàn cục
  try {
    const origParse = JSON.parse;
    JSON.parse = function(...args) {
      const result = origParse.apply(this, args);
      if (result && typeof result === 'object') {
        if ('adPlacements' in result || 'adSlots' in result || 'playerAds' in result || 'playerResponse' in result || 'raw_player_response' in result) {
          deepPruneAds(result);
        }
      }
      return result;
    };
  } catch (e) {}

  // D. Hook window.fetch
  try {
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      let url = '';
      if (args[0]) {
        if (typeof args[0] === 'string') url = args[0];
        else if (args[0].url) url = args[0].url;
        else if (args[0].href) url = args[0].href;
      }
      const lower = url.toLowerCase();

      // Chặn request thống kê quảng cáo và DoubleClick (trả về 200 OK rỗng để không bị retry liên tục)
      if (lower.includes('/api/stats/ads') || lower.includes('/pagead/') || lower.includes('ptracking') || 
          lower.includes('doubleclick.net') || lower.includes('/youtubei/v1/player/ad_break')) {
        return new Response('{}', { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
      }

      const response = await origFetch.apply(this, args);

      // Lọc dữ liệu player
      if (lower.includes('/youtubei/v1/player') || lower.includes('/player?') || lower.includes('/get_video_info')) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          if (json && typeof json === 'object') {
            deepPruneAds(json);
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

  // E. Hook XMLHttpRequest
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string') {
        const lower = url.toLowerCase();
        if (lower.includes('/api/stats/ads') || lower.includes('/pagead/') || lower.includes('ptracking') || 
            lower.includes('doubleclick.net') || lower.includes('/youtubei/v1/player/ad_break')) {
          return origOpen.call(this, method, 'data:application/json,{}', ...rest);
        }
      }
      return origOpen.call(this, method, url, ...rest);
    };
  } catch (e) {}

  // F. Bộ máy dập tắt video ads & Anti-Adblock (Tự động kích hoạt native skipAd)
  function destroyVideoAds() {
    // 1. Tự động đóng popup cảnh báo chặn quảng cáo của YouTube
    const warnings = document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
    if (warnings.length > 0) {
      warnings.forEach(el => {
        el.remove();
        const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
        if (backdrop) backdrop.remove();
        const video = document.querySelector('video');
        if (video && video.paused) {
          video.play().catch(() => {});
        }
      });
      reportBlockedAds(1);
    }

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const adElement = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout');

    // 2. Kích hoạt native skipAd() của YouTube player ngay lập tức
    if (moviePlayer && typeof moviePlayer.skipAd === 'function') {
      try {
        const adState = typeof moviePlayer.getAdState === 'function' ? moviePlayer.getAdState() : (adElement ? 1 : 0);
        if (adState > 0 || adElement) {
          moviePlayer.skipAd();
          reportBlockedAds(1);
        }
      } catch (e) {}
    }

    // 3. Bấm nút Skip Ad (chỉ khi nút hiển thị thật trên màn hình, tránh lặp vô tận)
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.videoAdUiSkipButton',
      '.ytp-ad-overlay-close-button',
      'button[id*="skip-button"]'
    ];
    for (const sel of skipSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        reportBlockedAds(1);
      }
    }

    // 4. Nếu video quảng cáo vẫn hiển thị -> Tua ngay đến hết
    const video = document.querySelector('video');
    if (video && adElement) {
      video.muted = true;
      video.playbackRate = 16.0;
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
      video.dispatchEvent(new Event('timeupdate'));
      video.dispatchEvent(new Event('ended'));
      reportBlockedAds(1);
    }
  }

  setInterval(destroyVideoAds, 35);
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
