(function() {
  if (window.__zenith_adblock_injected) return;
  window.__zenith_adblock_injected = true;

  // 1. uBlock Origin Surrogates (Giả lập vô hại các tracker & Anti-Adblock Defusers)
  try {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.google_ad_client = "ca-pub-0000000000000000";
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.loaded = true;
    window.adsbygoogle.push = function() { return 1; };

    // Google Tag / Analytics Surrogate
    window.ga = window.ga || function() {};
    window.gtag = window.gtag || function() {};
    window.dataLayer = window.dataLayer || [];

    // Anti-Adblock Defusers (FuckAdBlock / BlockAdBlock)
    const noopDefuser = function() {
      this.check = function() {};
      this.clearEvent = function() {};
      this.on = function(a, b) { if (!a) setTimeout(b, 1); return this; };
      this.onDetected = function() { return this; };
      this.onNotDetected = function(fn) { if (typeof fn === 'function') setTimeout(fn, 1); return this; };
    };
    window.FuckAdBlock = noopDefuser;
    window.BlockAdBlock = noopDefuser;
    window.snackbars = { show: function() {} };
  } catch (e) {}

  // 2. uBlock Origin deepPruneAds: Bóc tách đệ quy triệt để mọi trường adPlacements, adSlots
  function deepPruneAds(obj, depth) {
    if (!obj || typeof obj !== 'object' || (depth || 0) > 8) return obj;
    const currentDepth = (depth || 0) + 1;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        deepPruneAds(obj[i], currentDepth);
      }
      return obj;
    }

    if ('adPlacements' in obj) delete obj.adPlacements;
    if ('adSlots' in obj) delete obj.adSlots;
    if ('playerAds' in obj) delete obj.playerAds;
    if ('adBreakHeartbeatParams' in obj) delete obj.adBreakHeartbeatParams;
    if ('instreamAdPlayerConfig' in obj) delete obj.instreamAdPlayerConfig;
    if ('ad_break' in obj) delete obj.ad_break;

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string') {
        if ((key === 'playerResponse' || key === 'raw_player_response') && (val.includes('adPlacements') || val.includes('adSlots') || val.includes('playerAds'))) {
          try {
            const parsed = JSON.parse(val);
            deepPruneAds(parsed, currentDepth);
            obj[key] = JSON.stringify(parsed);
          } catch (e) {}
        }
      } else if (typeof val === 'object' && val !== null) {
        deepPruneAds(val, currentDepth);
      }
    }
    return obj;
  }

  // 3. Tắt cờ thử nghiệm quảng cáo an toàn qua EXPERIMENT_FLAGS
  function defuseYtcfg(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    const exp = cfg.EXPERIMENT_FLAGS || (cfg.data_ && cfg.data_.EXPERIMENT_FLAGS);
    if (exp) {
      exp.web_enable_ab_testing_on_player_ad_events = false;
      exp.html5_enable_ad_timeout = false;
      exp.disable_ad_filter = false;
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

  // 4. Hook biến toàn cục ytInitialPlayerResponse & ytplayer
  try {
    let _ytInit = window.ytInitialPlayerResponse ? deepPruneAds(window.ytInitialPlayerResponse) : undefined;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: () => _ytInit,
      set: (val) => { _ytInit = deepPruneAds(val); },
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

  // 5. Hook Response.prototype.json & Response.prototype.text
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

  // 6. Hook JSON.parse toàn cục
  try {
    const origParse = JSON.parse;
    JSON.parse = function(...args) {
      const res = origParse.apply(this, args);
      if (res && typeof res === 'object') {
        if ('adPlacements' in res || 'adSlots' in res || 'playerAds' in res || 'playerResponse' in res || 'raw_player_response' in res) {
          deepPruneAds(res);
        }
      }
      return res;
    };
  } catch (e) {}

  // 7. Hook window.fetch
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

      if (lower.includes('/api/stats/ads') || lower.includes('/pagead/') || 
          lower.includes('ptracking') || lower.includes('doubleclick.net') || 
          lower.includes('/youtubei/v1/player/ad_break')) {
        return new Response('{}', { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
      }

      return await origFetch.apply(this, args);
    };
  } catch (e) {}

  // 8. Hook XMLHttpRequest
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string') {
        const lower = url.toLowerCase();
        if (lower.includes('/api/stats/ads') || lower.includes('/pagead/') || 
            lower.includes('ptracking') || lower.includes('doubleclick.net') || 
            lower.includes('/youtubei/v1/player/ad_break')) {
          return origOpen.call(this, method, 'data:application/json,{}', ...rest);
        }
      }
      return origOpen.call(this, method, url, ...rest);
    };
  } catch (e) {}

  // 9. Dập tắt quảng cáo tức thì & skip native qua movie_player
  function neutraliseAds() {
    // Không can thiệp nếu người dùng đang nhập liệu bàn phím
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
      return;
    }

    // A. Tự động đóng popup cảnh báo anti-adblock của YouTube
    const warnings = document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
    if (warnings.length > 0) {
      warnings.forEach(el => el.remove());
      const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
      if (backdrop) backdrop.remove();
      const video = document.querySelector('video');
      if (video && video.paused) video.play().catch(() => {});
    }

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting');

    // B. Sử dụng native API skipAd của chính YouTube player
    if (moviePlayer && typeof moviePlayer.skipAd === 'function') {
      try {
        const adState = typeof moviePlayer.getAdState === 'function' ? moviePlayer.getAdState() : (isAdShowing ? 1 : 0);
        if (adState > 0 || isAdShowing) {
          moviePlayer.skipAd();
        }
      } catch (e) {}
    }

    // C. Tự động click các nút Bỏ qua quảng cáo (chỉ khi nút hiển thị thật sự)
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
      }
    }

    // D. Nếu video quảng cáo vẫn hiển thị -> Tua ngay đến hết
    const video = document.querySelector('video');
    if (video && isAdShowing) {
      video.muted = true;
      video.playbackRate = 16.0;
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
      video.dispatchEvent(new Event('timeupdate'));
      video.dispatchEvent(new Event('ended'));
    }
  }

  setInterval(neutraliseAds, 60);

  // 10. Đảm bảo bật bàn phím khi người dùng chạm vào ô tìm kiếm hoặc nhập liệu trên YouTube & Web
  function triggerSoftKeyboard(el) {
    try {
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
      if (window.ZenithMobile && typeof window.ZenithMobile.requestSoftKeyboard === 'function') {
        window.ZenithMobile.requestSoftKeyboard();
      }
    } catch (err) {}
  }

  function handleInputTouch(e) {
    // Hỗ trợ cả composedPath cho Shadow DOM (như YouTube searchbox ytd-searchbox)
    const path = (typeof e.composedPath === 'function' && e.composedPath()) || [];
    for (let i = 0; i < path.length; i++) {
      const el = path[i];
      if (el && el.nodeType === 1 && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        triggerSoftKeyboard(el);
        return;
      }
    }
    let target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        triggerSoftKeyboard(target);
        break;
      }
      target = target.parentElement;
    }
  }

  document.addEventListener('click', handleInputTouch, true);
  document.addEventListener('touchend', handleInputTouch, true);
  document.addEventListener('focusin', function(e) {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      triggerSoftKeyboard(target);
    }
  }, true);
})();

