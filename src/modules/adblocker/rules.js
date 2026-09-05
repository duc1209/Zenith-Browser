/**
 * Cốc Cốc AdBlocker Rules - Bộ quy tắc chặn quảng cáo
 * Bao gồm: Mạng quảng cáo quốc tế, bộ lọc Việt Nam (ABPVN), và quảng cáo YouTube
 */

// Danh sách các domain quảng cáo và tracker phổ biến
const AD_DOMAINS = [
  // Mạng quảng cáo quốc tế lớn
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'adnxs.com',
  'adform.net',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'criteo.net',
  'outbrain.com',
  'taboola.com',
  'mgid.com',
  'revcontent.com',
  'popads.net',
  'propellerads.com',
  'adcash.com',
  'zergnet.com',
  'infolinks.com',
  'bidvertiser.com',
  'trafficjunky.com',
  'exoclick.com',
  'juicyads.com',
  'adsterra.com',
  'richaudience.com',
  'smartadserver.com',
  'yieldmo.com',
  'teads.tv',
  'media.net',
  'advertising.com',
  'adcolony.com',
  'applovin.com',
  'chartboost.com',
  'unityads.unity3d.com',

  // Mạng quảng cáo tại Việt Nam (ABPVN Filter & Cốc Cốc Subscriptions)
  'admicro.vn',
  'eclick.vn',
  'ambientdigitalgroup.com',
  'ambientplatform.vn',
  'adtima.vn',
  'novanet.vn',
  'blueseed.tv',
  'ants.vn',
  'vietad.vn',
  'cleverads.vn',
  'microad.vn',
  'innity.com',
  'adnet.vn',
  'ringier.vn',
  'adbro.me',
  'adtrue.com',
  'aanetwork.vn',
  'ads.shopee.vn',
  's.shopee.vn',
  'yomedia.vn',
  'yodimedia.com',
  'vidverto.io',
  'zascdn.com',
  'zaloweb.vn',
  'vclick.vn',
  'catngu.com',
  'adstir.com',
  'v9banners.com',
  'adtiming.com',
  'adpushup.com',
  'yieldlab.net',
  'baomoi.com/ad/',
  'kenh14.vn/adv',
  'zing.vn/ad',

  // Trackers & Telemetry
  'google-analytics.com',
  'googletagmanager.com/gtag/js',
  'hotjar.com',
  'scorecardresearch.com',
  'quantserve.com',
  'histats.com',
  'statcounter.com'
];

// Các mẫu URL liên quan đến quảng cáo video YouTube (Chuẩn Cốc Cốc blockads_yt_rules.json & AdGuard)
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
  '&ctier='
];

// CSS ẩn các khung quảng cáo (Cosmetic Filtering)
const COSMETIC_FILTERS = `
  /* Ẩn triệt để toàn bộ khung quảng cáo tài trợ, gợi ý trên YouTube */
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

  /* Ẩn các banner và container quảng cáo phổ biến trên web */
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

// Script tự động bỏ qua và chặn quảng cáo trên YouTube video player
const YOUTUBE_ADBLOCK_SCRIPT = `
(function() {
  if (window.__zenith_yt_skip_injected) return;
  window.__zenith_yt_skip_injected = true;

  function skipYouTubeAds() {
    // 1. Tự động đóng popup cảnh báo chặn quảng cáo
    const warnings = document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
    warnings.forEach(el => {
      el.remove();
      const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
      if (backdrop) backdrop.remove();
      const vid = document.querySelector('video');
      if (vid && vid.paused) vid.play().catch(() => {});
    });

    // 2. Tự động click nút 'Skip Ad' (Bỏ qua quảng cáo)
    const skipButtons = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.videoAdUiSkipButton',
      '.ytp-ad-preview-container',
      'button[id*="skip-button"]',
      '.ytp-ad-overlay-close-button'
    ];

    for (const selector of skipButtons) {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.click();
      }
    }

    // 3. Nếu đang phát video quảng cáo, tua thẳng tới cuối video
    const video = document.querySelector('video');
    const adPlayer = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout');
    if (video && adPlayer) {
      video.muted = true;
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
      video.playbackRate = 16.0;
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
      if (skipBtn) skipBtn.click();
    }
  }

  // Chạy lặp kiểm tra liên tục mỗi 60ms
  setInterval(skipYouTubeAds, 60);
})();
`;

module.exports = {
  AD_DOMAINS,
  YOUTUBE_AD_PATTERNS,
  COSMETIC_FILTERS,
  YOUTUBE_ADBLOCK_SCRIPT
};
