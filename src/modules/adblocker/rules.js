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
  'youtube.com/api/stats/qoe?*adformat',
  'googlevideo.com/videoplayback?*&adformat='
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

// 4. uBlock Origin Core Scriptlet: json-prune + surrogates + anti-adblock defusers
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
    window.adsbygoogle.push = function(o) { return 1; };

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

  // B. uBlock Origin json-prune: Bóc tách loại bỏ sạch adPlacements, adSlots khỏi mọi response JSON của YouTube
  function pruneAdPayload(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.adPlacements) delete obj.adPlacements;
    if (obj.adSlots) delete obj.adSlots;
    if (obj.playerAds) delete obj.playerAds;
    if (obj.adBreakHeartbeatParams) delete obj.adBreakHeartbeatParams;
    if (obj.streamingData && obj.streamingData.serverAbrStreamingUrl) {
      delete obj.streamingData.serverAbrStreamingUrl;
    }
    if (obj.playerResponse) {
      pruneAdPayload(obj.playerResponse);
    }
    return obj;
  }

  // Hook biến toàn cục ytInitialPlayerResponse
  try {
    let _ytInit = pruneAdPayload(window.ytInitialPlayerResponse);
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: () => _ytInit,
      set: (val) => { _ytInit = pruneAdPayload(val); },
      configurable: true
    });
  } catch (e) {}

  // C. Hook JSON.parse toàn cục
  try {
    const origParse = JSON.parse;
    JSON.parse = function(...args) {
      const res = origParse.apply(this, args);
      if (res && typeof res === 'object') {
        if (res.adPlacements || res.adSlots || res.playerAds || res.playerResponse) {
          pruneAdPayload(res);
        }
      }
      return res;
    };
  } catch (e) {}

  // D. Hook window.fetch (json-prune-fetch-response uBlock scriptlet)
  try {
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';
      if (url.includes('/api/stats/ads') || url.includes('/pagead/') || url.includes('ptracking') || 
          url.includes('doubleclick.net') || url.includes('/player/ad_break')) {
        return new Response('{}', { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
      }

      const resp = await origFetch.apply(this, args);
      if (url.includes('/youtubei/v1/player') || url.includes('/player?') || url.includes('/get_watch?')) {
        try {
          const clone = resp.clone();
          const json = await clone.json();
          if (json && typeof json === 'object') {
            pruneAdPayload(json);
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

  // E. Hook XMLHttpRequest (json-prune-xhr-response uBlock scriptlet)
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string') {
        if (url.includes('/api/stats/ads') || url.includes('/pagead/') || url.includes('ptracking') || 
            url.includes('doubleclick.net') || url.includes('/player/ad_break')) {
          return origOpen.call(this, method, 'data:application/json,{}', ...rest);
        }
      }
      return origOpen.call(this, method, url, ...rest);
    };
  } catch (e) {}

  // F. Fast-forwarder & Anti-Adblock modal auto-remover
  function neutraliseAds() {
    // 1. Tự động đóng popup cảnh báo anti-adblock của YouTube
    const warnings = document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
    warnings.forEach(el => {
      el.remove();
      const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
      if (backdrop) backdrop.remove();
      const video = document.querySelector('video');
      if (video && video.paused) video.play().catch(() => {});
    });

    // 2. Tự động click các nút Bỏ qua quảng cáo (Skip Ad)
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
      if (btn) btn.click();
    }

    // 3. Nếu video quảng cáo đang phát -> Tua ngay đến hết
    const video = document.querySelector('video');
    const adPlayer = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout');
    if (video && adPlayer) {
      video.muted = true;
      video.playbackRate = 16.0;
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
      video.dispatchEvent(new Event('timeupdate'));
      video.dispatchEvent(new Event('ended'));
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipBtn) skipBtn.click();
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

