/**
 * Zenith Browser - uBlock Origin Core Ruleset
 * Được nâng cấp từ cơ chế chặn của uBlock Origin (gorhill/uBlock) & uAssets
 * Bao gồm:
 * 1. Danh mục domain quảng cáo, tracker, telemetry, pop-up từ uBlock filters, EasyList, EasyPrivacy, Peter Lowe, ABPVN
 * 2. Mẫu URL nhận diện luồng video ad YouTube
 * 3. Bộ lọc giao diện (Cosmetic Filters) triệt tiêu khung quảng cáo
 * 4. uBlock Origin Scriptlet: json-prune, surrogates (ga, gtag, adsbygoogle), defuser chống anti-adblock
 */

// 1. Danh sách domain quảng cáo, tracker, mạng lừa đảo & telemetry chuẩn uBlock Origin / EasyList / ABPVN
const AD_DOMAINS = [
  // --- Google & DoubleClick Ad Networks ---
  'doubleclick.net', 'g.doubleclick.net', 'googleads.g.doubleclick.net', 'ad.doubleclick.net',
  'pubads.g.doubleclick.net', 'securepubads.g.doubleclick.net', 'static.doubleclick.net',
  'googlesyndication.com', 'pagead2.googlesyndication.com', 'pagead-google.com',
  'googleadservices.com', 'adservice.google.com', 'adservice.google.com.vn',
  'google-analytics.com', 'analytics.google.com', 'googletagmanager.com', 'googletagservices.com',
  'admob.com', 'admob.google.com', '2mdn.net', 'invitemedia.com', 'admeld.com',

  // --- Mạng quảng cáo quốc tế lớn (uBlock / EasyList Core) ---
  'adnxs.com', 'ib.adnxs.com', 'secure.adnxs.com', 'adnxs-simple.com',
  'adform.net', 'adform.com', 'track.adform.net',
  'rubiconproject.com', 'optimized-by.rubiconproject.com', 'fastlane.rubiconproject.com',
  'pubmatic.com', 'ads.pubmatic.com', 'image2.pubmatic.com',
  'openx.net', 'us-u.openx.net', 'ox-d.openx.net', 'openx.com',
  'criteo.com', 'criteo.net', 'static.criteo.net', 'cas.criteo.com', 'bidder.criteo.com',
  'outbrain.com', 'widgets.outbrain.com', 'log.outbrain.com', 'traffic.outbrain.com',
  'taboola.com', 'cdn.taboola.com', 'trc.taboola.com', 'vid.taboola.com',
  'mgid.com', 'servserv.mgid.com', 'c.mgid.com', 'jsc.mgid.com',
  'revcontent.com', 'cdn.revcontent.com', 'trends.revcontent.com',
  'popads.net', 'serve.popads.net', 'c1.popads.net',
  'propellerads.com', 'propellerclick.com', 'monetag.com',
  'adcash.com', 'as.adcash.com',
  'zergnet.com', 'infolinks.com', 'resources.infolinks.com',
  'bidvertiser.com', 'trafficjunky.com', 'trafficjunky.net',
  'exoclick.com', 'syndication.exoclick.com', 'main.exoclick.com',
  'juicyads.com', 'adserver.juicyads.com',
  'adsterra.com', 'richaudience.com', 'smartadserver.com', 'diff.smartadserver.com',
  'yieldmo.com', 'teads.tv', 'media.net', 'contextual.media.net',
  'advertising.com', 'adcolony.com', 'applovin.com', 'oath.com',
  'chartboost.com', 'unityads.unity3d.com', 'vungle.com', 'ironsrc.com',
  'is.com', 'mintegral.com', 'liftoff.io', 'inmobi.com', 'smaato.net',
  'mopub.com', 'fyber.com', 'adfalcon.com', 'startapp.com', 'tapjoy.com',
  'adblade.com', 'adbutler.com', 'adkernel.com', 'adition.com', 'admixer.net',
  'adroll.com', 'd.adroll.com', 'adscale.de', 'adsrvr.org', 'adswizz.com',
  'adtech.de', 'adtechus.com', 'bidswitch.net', 'casalemedia.com',
  'contextweb.com', 'districtm.io', 'exponential.com', 'gumgum.com',
  'id5-sync.com', 'indexexchange.com', 'kargo.com', 'lijit.com',
  'liveintent.com', 'nativo.com', 'quantcast.com', 'sharethrough.com',
  'simpli.fi', 'sovrn.com', 'spotxchange.com', 'spotx.tv', 'triplelift.com',
  'undertone.com', 'unrulymedia.com', 'yieldlab.net', 'yieldoptimizer.com',
  'zemanta.com', 'connatix.com', 'aniview.com', 'primis.tech', 'springserve.com',
  'telaria.com', 'tremorhub.com',

  // --- Mạng quảng cáo và Tracker tại Việt Nam (ABPVN + Cốc Cốc Subscriptions) ---
  'admicro.vn', 'lg1.logging.admicro.vn', 'static.admicro.vn', 'admicro2.vcmedia.vn',
  'eclick.vn', 's.eclick.vn', 'eclick.mediacdn.vn',
  'ambientdigitalgroup.com', 'ambientplatform.vn', 'ambientdigital.vn',
  'adtima.vn', 'api.adtima.vn', 'ad.adtima.vn', 'static.adtima.vn',
  'novanet.vn', 'blueseed.tv', 'ants.vn', 'vietad.vn', 'cleverads.vn',
  'microad.vn', 'innity.com', 'innity.net', 'vn.innity.com',
  'adnet.vn', 'ringier.vn', 'adbro.me', 'adtrue.com', 'aanetwork.vn',
  'ads.shopee.vn', 's.shopee.vn', 'tracking.shopee.vn',
  'yomedia.vn', 'yodimedia.com', 'vidverto.io', 'zascdn.com',
  'zaloweb.vn', 'vclick.vn', 'catngu.com', 'adstir.com', 'v9banners.com',
  'adtiming.com', 'adpushup.com', 'vietnamnet.vn/adv', 'dantri.com.vn/adv',
  'vnexpress.net/ads', 'tuoitre.vn/adv', 'thanhnien.vn/adv', '24h.com.vn/adv',
  'kenh14.vn/adv', 'zing.vn/ad', 'baomoi.com/ad',

  // --- Trackers, Telemetry & Web Analytics (uBlock Privacy) ---
  'hotjar.com', 'hotjar.io', 'static.hotjar.com',
  'scorecardresearch.com', 'b.scorecardresearch.com',
  'quantserve.com', 'edge.quantserve.com',
  'histats.com', 's10.histats.com',
  'statcounter.com', 'c.statcounter.com',
  'mc.yandex.ru', 'an.yandex.ru', 'metrika.yandex.ru',
  'hm.baidu.com', 'clarity.ms', 'c.bing.com', 'bat.bing.com',
  'appsflyer.com', 'adjust.com', 'branch.io', 'braze.com',
  'mixpanel.com', 'api.mixpanel.com', 'amplitude.com', 'api.amplitude.com',
  'segment.io', 'segment.com', 'api.segment.io',
  'fullstory.com', 'crazyegg.com', 'inspectlet.com', 'luckyorange.com',
  'mouseflow.com', 'optimizely.com', 'vwo.com', 'newrelic.com', 'nr-data.net',
  'bugsnag.com', 'sentry.io', 'rollbar.com', 'datadoghq.com', 'logrocket.io',
  'pixel.facebook.com', 'an.facebook.com', 'analytics.tiktok.com',
  'ads-twitter.com', 't.co/i/adsct', 'analytics.twitter.com',

  // --- Anti-Adblock & Detection Bypass (uBlock Unbreak & Badware) ---
  'blockadblock.com', 'fuckadblock.com', 'antiblock.org',
  'pagefair.com', 'pagefair.net', 'admiral.com', 'getadmiral.com',
  'adblockanalytics.com', 'adikteev.com', 'detectadblock.com',
  'fwmrm.net', 'imasdk.googleapis.com',

  // --- Popups, URL Shortener Ads & Malvertising ---
  'popcash.net', 'popmyads.com', 'propellerclick.com', 'revenuehits.com',
  'shorte.st', 'adf.ly', 'bc.vc', 'linkvertise.com', 'ouo.io', 'clk.ink',
  'trafficforce.com', 'hilltopads.com', 'clickadu.com', 'evadav.com',
  'galaksion.com', 'richpush.co', 'rollerads.com', 'pushwoosh.com', 'onesignal.com'
];

// 2. Các mẫu URL liên quan đến quảng cáo video YouTube (Chuẩn uBlock uAssets quick-fixes)
const YOUTUBE_AD_PATTERNS = [
  '/api/stats/ads',
  '/pagead/',
  'ptracking',
  'doubleclick.net',
  'g.doubleclick.net',
  'googleads.g.doubleclick.net',
  'static.doubleclick.net',
  'ad.doubleclick.net',
  'pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net',
  '/youtubei/v1/player/ad_break',
  '/youtubei/v1/att/get',
  '/get_midroll_info',
  '/pagead/lvz',
  '/pagead/1p-user-list',
  '&adformat=',
  '&oad=',
  '&ad_type=',
  '&ctier=',
  'youtube.com/api/stats/qoe?*adformat'
];

// 3. Bộ lọc giao diện mở rộng (Cosmetic Filters - uBlock Origin / EasyList Syntax)
const COSMETIC_FILTERS = `
  /* YouTube - Ẩn triệt để toàn bộ banner, video ad slot, và pop-up cảnh báo anti-adblock */
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
  yt-playability-error-supported-renderers#error-screen:has(ytd-enforcement-message-view-model),
  .ytd-ad-slot-renderer,

  /* Web Banners & Khung quảng cáo thông dụng (Google Ads, Adsense, DoubleClick, ABPVN) */
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
  iframe[src*="adnxs.com"],
  iframe[src*="criteo.com"],
  iframe[src*="taboola.com"],
  iframe[src*="outbrain.com"] {
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

// 4. uBlock Origin Core Scriptlet: deep-prune + ytcfg defuser + surrogates + anti-adblock
const UBLOCK_SCRIPTLET = `
(function() {
  if (window.__zenith_ublock_scriptlet_injected) return;
  window.__zenith_ublock_scriptlet_injected = true;

  // A. uBlock Origin Surrogates (Giả lập vô hại các tracker để web không bị lỗi khi chặn mạng)
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

  // B. uBlock Origin deepPruneAds: Bóc tách đệ quy triệt để mọi trường adPlacements, adSlots
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
          } catch (e) {}
        }
      } else if (typeof val === 'object' && val !== null) {
        deepPruneAds(val, currentDepth);
      }
    }
    return obj;
  }

  // C. Tắt toàn bộ máy chủ phát quảng cáo của YouTube thông qua EXPERIMENT_FLAGS
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

  // D. Hook biến toàn cục ytInitialPlayerResponse & ytplayer
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

  // E. Hook Response.prototype.json & Response.prototype.text
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

  // F. Hook JSON.parse toàn cục
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

  // G. Hook window.fetch (trả về 200 OK rỗng cho tracker telemetry & lọc dữ liệu player)
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

      const resp = await origFetch.apply(this, args);
      if (lower.includes('/youtubei/v1/player') || lower.includes('/player?') || lower.includes('/get_video_info')) {
        try {
          const clone = resp.clone();
          const json = await clone.json();
          if (json && typeof json === 'object') {
            deepPruneAds(json);
            return new Response(JSON.stringify(json), {
              status: resp.status,
              statusText: resp.statusText,
              headers: resp.headers
            });
          }
        } catch (err) {}
      }
      return resp;
    };
  } catch (e) {}

  // H. Hook XMLHttpRequest
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

  // I. Trình dập tắt quảng cáo tức thì & skip native qua movie_player
  function neutraliseAds() {
    // 1. Tự động đóng popup cảnh báo anti-adblock
    const warnings = document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
    if (warnings.length > 0) {
      warnings.forEach(el => el.remove());
      const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
      if (backdrop) backdrop.remove();
      const video = document.querySelector('video');
      if (video && video.paused) video.play().catch(() => {});
    }

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout');

    // 2. Sử dụng native API skipAd của chính YouTube player
    if (moviePlayer && typeof moviePlayer.skipAd === 'function') {
      try {
        const adState = typeof moviePlayer.getAdState === 'function' ? moviePlayer.getAdState() : (isAdShowing ? 1 : 0);
        if (adState > 0 || isAdShowing) {
          moviePlayer.skipAd();
        }
      } catch (e) {}
    }

    // 3. Tự động bấm các nút Bỏ qua quảng cáo (chỉ khi nút hiển thị thật sự)
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

    // 4. Nếu video quảng cáo phát sinh ngoài dự kiến -> Tua ngay đến hết
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

  setInterval(neutraliseAds, 40);
})();
`;

module.exports = {
  AD_DOMAINS,
  YOUTUBE_AD_PATTERNS,
  COSMETIC_FILTERS,
  UBLOCK_SCRIPTLET
};

