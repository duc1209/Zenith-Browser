/**
 * Zenith Browser - Renderer Application Logic
 * Đa tab nổi, tối ưu RAM, chặn quảng cáo, bắt link tải video, PiP và chế độ tối
 */

// API wrapper tương thích
const api = window.zenithAPI || window.coccocAPI;

// ==========================================
// KHỞI TẠO BIẾN TOÀN CỤC & DOM
// ==========================================
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

// DOM Elements
const tabStrip = document.getElementById('tabStrip');
const newTabBtn = document.getElementById('newTabBtn');
const webviewContainer = document.getElementById('webviewContainer');
const omniboxInput = document.getElementById('omniboxInput');
const clearUrlBtn = document.getElementById('clearUrlBtn');
const btnBack = document.getElementById('btnBack');
const btnForward = document.getElementById('btnForward');
const btnReload = document.getElementById('btnReload');
const btnHome = document.getElementById('btnHome');
const pageProgressBar = document.getElementById('pageProgressBar');
const bookmarksBar = document.getElementById('bookmarksBar');

// Window Controls
const winMinimize = document.getElementById('winMinimize');
const winMaximize = document.getElementById('winMaximize');
const winClose = document.getElementById('winClose');

// Zenith Features
const adblockShieldBtn = document.getElementById('adblockShieldBtn');
const adblockBadge = document.getElementById('adblockBadge');
const adblockPopup = document.getElementById('adblockPopup');
const adblockToggleCheckbox = document.getElementById('adblockToggleCheckbox');
const popupBlockedCount = document.getElementById('popupBlockedCount');
const popupTotalBlocked = document.getElementById('popupTotalBlocked');

// Video Download Elements (Chỉ hiện khi có video)
const btnVideoDownload = document.getElementById('btnVideoDownload');
const videoBadge = document.getElementById('videoBadge');
const videoPopup = document.getElementById('videoPopup');
const videoListContainer = document.getElementById('videoListContainer');

// File Download Elements (Chỉ hiện khi tải file)
const btnFileDownloads = document.getElementById('btnFileDownloads');
const fileDlBadge = document.getElementById('fileDlBadge');
const fileDlPopup = document.getElementById('fileDlPopup');
const fileDownloadList = document.getElementById('fileDownloadList');
const openDownloadsFolderBtn = document.getElementById('openDownloadsFolderBtn');

// Media Hub Elements (Chuẩn Cốc Cốc / Chrome Global Media Controls & Ghim PiP)
const btnMediaHub = document.getElementById('btnMediaHub');
const mediaHubPopup = document.getElementById('mediaHubPopup');
const mediaHubEmpty = document.getElementById('mediaHubEmpty');
const mediaHubContent = document.getElementById('mediaHubContent');
const mediaHubCloseCardBtn = document.getElementById('mediaHubCloseCardBtn');
const mediaHubThumb = document.getElementById('mediaHubThumb');
const mediaHubDomain = document.getElementById('mediaHubDomain');
const mediaHubDomainText = document.getElementById('mediaHubDomainText');
const mediaHubTitle = document.getElementById('mediaHubTitle');
const mediaHubArtist = document.getElementById('mediaHubArtist');
const mediaHubPipBtn = document.getElementById('mediaHubPipBtn');
const mediaHubSeekBackBtn = document.getElementById('mediaHubSeekBackBtn');
const mediaHubPlayBtn = document.getElementById('mediaHubPlayBtn');
const mediaHubPlayIcon = document.getElementById('mediaHubPlayIcon');
const mediaHubSeekFwdBtn = document.getElementById('mediaHubSeekFwdBtn');
const mediaHubCurrentTime = document.getElementById('mediaHubCurrentTime');
const mediaHubProgressTrack = document.getElementById('mediaHubProgressTrack');
const mediaHubProgressFill = document.getElementById('mediaHubProgressFill');
const mediaHubDuration = document.getElementById('mediaHubDuration');

const btnDarkMode = document.getElementById('btnDarkMode');
const darkModeIcon = document.getElementById('darkModeIcon');
const btnBookmark = document.getElementById('btnBookmark');
const bookmarkIcon = document.getElementById('bookmarkIcon');
const btnMemorySaver = document.getElementById('btnMemorySaver');

const btnBrowserMenu = document.getElementById('btnBrowserMenu');
const mainMenuPopup = document.getElementById('mainMenuPopup');

// Modal Elements
const zenithModalOverlay = document.getElementById('zenithModalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalBody = document.getElementById('modalBody');

// Toast
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

// URL trang Tab mới
const NEW_TAB_URL = new URL('../newtab/newtab.html', window.location.href).href;

// ==========================================
// QUẢN LÝ POPUP & ĐÓNG/MỞ THÔNG MINH (CLICK 1 LẦN MỞ, LẦN NỮA ĐÓNG)
// ==========================================
function closeAllPopups() {
  if (adblockPopup) adblockPopup.classList.remove('show');
  if (videoPopup) videoPopup.classList.remove('show');
  if (fileDlPopup) fileDlPopup.classList.remove('show');
  if (mediaHubPopup) mediaHubPopup.classList.remove('show');
  if (mainMenuPopup) mainMenuPopup.classList.remove('show');
}

function togglePopup(popup) {
  if (!popup) return;
  const isOpen = popup.classList.contains('show');
  closeAllPopups();
  if (!isOpen) {
    popup.classList.add('show');
  }
}

// ==========================================
// 1. WINDOW CONTROLS
// ==========================================
winMinimize.addEventListener('click', () => api && api.minimize && api.minimize());
winMaximize.addEventListener('click', () => api && api.maximize && api.maximize());
winClose.addEventListener('click', () => api && api.close && api.close());

// ==========================================
// 2. HỆ THỐNG ĐA TAB (FLOATING PILL TABS)
// ==========================================
function createTab(targetUrl = null) {
  tabCounter++;
  const tabId = 'tab_' + tabCounter;
  const isNewTab = !targetUrl || targetUrl === 'newtab' || targetUrl === NEW_TAB_URL;
  const initialUrl = isNewTab ? NEW_TAB_URL : targetUrl;

  // 1. Tạo tab trên tabstrip
  const tabElem = document.createElement('div');
  tabElem.className = 'tab-item';
  tabElem.id = 'tab_item_' + tabId;
  tabElem.innerHTML = `
    <div class="tab-favicon" id="favicon_${tabId}">⚡</div>
    <span class="tab-title" id="title_${tabId}">Tab mới</span>
    <button class="tab-close-btn" id="close_${tabId}" title="Đóng thẻ">✕</button>
  `;

  // 2. Tạo thẻ <webview> tràn viền
  const webview = document.createElement('webview');
  webview.id = 'webview_' + tabId;
  webview.className = 'tab-webview';
  webview.setAttribute('allowpopups', 'true');
  webview.setAttribute('webpreferences', 'contextIsolation=no, sandbox=no');

  // Gắn preload script chặn toàn bộ quảng cáo video YouTube & banner
  const preloadPath = (api && api.webviewPreloadPath) ? api.webviewPreloadPath : new URL('../webview-preload.js', window.location.href).href;
  webview.setAttribute('preload', preloadPath);
  webview.src = initialUrl;

  tabStrip.appendChild(tabElem);
  webviewContainer.appendChild(webview);

  const tabData = {
    id: tabId,
    tabElem: tabElem,
    webview: webview,
    url: initialUrl,
    title: 'Tab mới',
    favicon: '⚡',
    isNewTab: isNewTab,
    mediaList: [],
    darkModeActive: false,
    lastActive: Date.now()
  };

  tabs.push(tabData);

  // Sự kiện chọn tab
  tabElem.addEventListener('click', (e) => {
    if (e.target.closest('.tab-close-btn')) return;
    switchTab(tabId);
  });

  // Sự kiện đóng tab
  const closeBtn = tabElem.querySelector('.tab-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });

  // Gắn sự kiện webview
  setupWebviewEvents(tabData);

  // Kích hoạt tab
  switchTab(tabId);

  return tabData;
}

function switchTab(tabId) {
  const targetTab = tabs.find(t => t.id === tabId);
  if (!targetTab) return;

  activeTabId = tabId;
  targetTab.lastActive = Date.now();

  tabs.forEach(t => {
    const isActive = t.id === tabId;
    t.tabElem.classList.toggle('active', isActive);
    t.webview.classList.toggle('active', isActive);
    // Tự động tạm dừng âm thanh các tab ngầm nếu không xem
    if (!isActive) {
      try {
        if (t.webview.isAudioMuted && !t.webview.isAudioMuted()) {
          // Có thể mute nếu muốn
        }
      } catch (e) {}
    }
  });

  updateOmniboxForTab(targetTab);
  updateNavButtons(targetTab.webview);
  updateAdblockUI(targetTab);
  updateVideoUI(targetTab);
  updateMediaHubUI(targetTab);
  updateDarkModeButton(targetTab.darkModeActive);
  updateBookmarkButton(targetTab);
}

function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  const tabToRemove = tabs[index];
  tabToRemove.tabElem.remove();
  tabToRemove.webview.remove();

  if (api.clearMediaList && tabToRemove.webview.getWebContentsId) {
    try {
      api.clearMediaList(tabToRemove.webview.getWebContentsId());
    } catch (e) {}
  }

  tabs.splice(index, 1);

  if (tabs.length === 0) {
    createTab();
    return;
  }

  if (activeTabId === tabId) {
    const nextTab = tabs[Math.max(0, index - 1)];
    switchTab(nextTab.id);
  }
}

// ==========================================
// 3. THIẾT LẬP SỰ KIỆN WEBVIEW
// ==========================================
function setupWebviewEvents(tabData) {
  const webview = tabData.webview;

  webview.addEventListener('did-start-loading', () => {
    if (tabData.id === activeTabId) showProgressBar();
  });

  webview.addEventListener('did-stop-loading', () => {
    if (tabData.id === activeTabId) {
      hideProgressBar();
      updateNavButtons(webview);
    }
  });

  webview.addEventListener('page-title-updated', (e) => {
    tabData.title = e.title || 'Không có tiêu đề';
    const titleElem = document.getElementById('title_' + tabData.id);
    if (titleElem) {
      titleElem.textContent = tabData.title;
      titleElem.title = tabData.title;
    }
    if (tabData.id === activeTabId) {
      document.title = `${tabData.title} - Zenith`;
    }
  });

  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      tabData.favicon = e.favicons[0];
      const faviconElem = document.getElementById('favicon_' + tabData.id);
      if (faviconElem) {
        faviconElem.innerHTML = `<img src="${tabData.favicon}" width="16" height="16" onerror="this.src='../assets/zenith.png'">`;
      }
    }
  });

  webview.addEventListener('did-navigate', (e) => {
    tabData.url = e.url;
    tabData.isNewTab = e.url.includes('newtab.html');
    tabData.mediaList = [];
    tabData.mediaState = null;
    if (tabData.id === activeTabId) {
      updateOmniboxForTab(tabData);
      updateNavButtons(webview);
      updateAdblockUI(tabData);
      updateBookmarkButton(tabData);
      updateVideoUI(tabData);
      updateMediaHubUI(tabData);
    }
  });

  const ytAdSelectors = `
    ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
    ytd-rich-section-renderer:has(ytd-ad-slot-renderer),
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
    .adsbygoogle,
    [id^="google_ads_"],
    [id^="div-gpt-ad"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      pointer-events: none !important;
    }
  `;

  webview.addEventListener('dom-ready', () => {
    try {
      webview.insertCSS(ytAdSelectors).catch(() => {});
    } catch (e) {}
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    if (tabData.url !== e.url) {
      tabData.mediaList = [];
      tabData.mediaState = null;
    }
    tabData.url = e.url;
    if (tabData.id === activeTabId) {
      updateOmniboxForTab(tabData);
      updateNavButtons(webview);
      updateBookmarkButton(tabData);
      updateVideoUI(tabData);
      updateMediaHubUI(tabData);
    }
    // Tự động duy trì ẩn quảng cáo khi lướt video trên YouTube (SPA)
    try {
      webview.insertCSS(ytAdSelectors).catch(() => {});
    } catch (e) {}
  });

  function handleWebviewIPC(channel, data) {
    if (channel === 'adblock-count') {
      const count = (data && data.count) ? data.count : 1;
      tabData.blockedCount = (tabData.blockedCount || 0) + count;
      if (api && api.recordAdBlock) {
        api.recordAdBlock('youtube.com', count).then(stats => {
          if (tabData.id === activeTabId) {
            adblockBadge.textContent = tabData.blockedCount;
            popupBlockedCount.textContent = tabData.blockedCount;
            if (stats && stats.totalBlocked) {
              popupTotalBlocked.textContent = Math.max(stats.totalBlocked, tabData.blockedCount);
            }
          }
        }).catch(() => {});
      } else {
        if (tabData.id === activeTabId) {
          adblockBadge.textContent = tabData.blockedCount;
          popupBlockedCount.textContent = tabData.blockedCount;
        }
      }
    } else if (channel === 'media-detected') {
      if (!tabData.mediaList) tabData.mediaList = [];
      const media = data && data.media;
      if (media) {
        const exists = tabData.mediaList.some(m => m.id === media.id);
        if (!exists) {
          tabData.mediaList.push(media);
          if (tabData.id === activeTabId) {
            updateVideoUI(tabData);
            showToast(`🎬 Zenith phát hiện: ${media.title}`);
          }
        }
      }
    } else if (channel === 'media-playback-state') {
      tabData.mediaState = data;
      if (tabData.id === activeTabId) {
        updateMediaHubUI(tabData);
      }
    } else if (channel === 'open-video-popup') {
      if (videoPopup) togglePopup(videoPopup);
    }
  }

  webview.addEventListener('console-message', (e) => {
    if (e.message && e.message.startsWith('__ZENITH_IPC__:')) {
      try {
        const payload = e.message.substring('__ZENITH_IPC__:'.length);
        const firstColon = payload.indexOf(':');
        const channel = payload.substring(0, firstColon);
        const data = JSON.parse(payload.substring(firstColon + 1));
        handleWebviewIPC(channel, data);
      } catch (err) {}
    }
  });

  webview.addEventListener('ipc-message', (e) => {
    handleWebviewIPC(e.channel, e.args && e.args[0]);
  });

  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    createTab(e.url);
  });
}

function updateOmniboxForTab(tabData) {
  if (tabData.isNewTab) {
    omniboxInput.value = '';
    omniboxInput.placeholder = 'Tìm kiếm trên web hoặc nhập địa chỉ URL...';
  } else {
    omniboxInput.value = tabData.url;
  }
}

function updateNavButtons(webview) {
  if (!webview) return;
  try {
    btnBack.disabled = !webview.canGoBack();
    btnForward.disabled = !webview.canGoForward();
  } catch (e) {}
}

function showProgressBar() {
  pageProgressBar.style.opacity = '1';
  pageProgressBar.style.width = '70%';
}

function hideProgressBar() {
  pageProgressBar.style.width = '100%';
  setTimeout(() => {
    pageProgressBar.style.opacity = '0';
    setTimeout(() => { pageProgressBar.style.width = '0%'; }, 250);
  }, 200);
}

// ==========================================
// 4. ĐIỀU HƯỚNG OMNIBOX
// ==========================================
function navigateTo(url) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;

  const target = normalizeUrl(url);
  currentTab.webview.loadURL(target);
}

function normalizeUrl(input) {
  input = input.trim();
  if (!input) return NEW_TAB_URL;

  const isUrl = /^https?:\/\//i.test(input) ||
                /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(input) ||
                input.startsWith('localhost') ||
                input.startsWith('file://');

  if (isUrl) {
    if (!/^https?:\/\//i.test(input) && !input.startsWith('file://')) {
      return 'https://' + input;
    }
    return input;
  }

  // Tìm kiếm với công cụ tìm kiếm được cài đặt (Google, Cốc Cốc, Bing, DuckDuckGo)
  const engine = localStorage.getItem('zenith_search_engine') || 'google';
  switch (engine) {
    case 'coccoc':
      return `https://coccoc.com/search?query=${encodeURIComponent(input)}`;
    case 'bing':
      return `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${encodeURIComponent(input)}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }
}

omniboxInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigateTo(omniboxInput.value);
    omniboxInput.blur();
  }
});

btnBack.addEventListener('click', () => {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab && currentTab.webview.canGoBack()) currentTab.webview.goBack();
});

btnForward.addEventListener('click', () => {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab && currentTab.webview.canGoForward()) currentTab.webview.goForward();
});

btnReload.addEventListener('click', () => {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab) currentTab.webview.reload();
});

btnHome.addEventListener('click', () => {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab) currentTab.webview.loadURL(NEW_TAB_URL);
});

newTabBtn.addEventListener('click', () => createTab());

// ==========================================
// 5. KHIÊN CHẶN QUẢNG CÁO (ZENITH SHIELD)
// ==========================================
async function updateAdblockUI(tabData) {
  if (!tabData || tabData.isNewTab) {
    adblockBadge.textContent = '0';
    popupBlockedCount.textContent = '0';
    return;
  }

  try {
    const host = new URL(tabData.url).hostname;
    const stats = (api && api.getAdblockStats) ? await api.getAdblockStats(host) : {};
    const count = tabData.blockedCount || stats.blockedCount || 0;

    adblockBadge.textContent = count;
    popupBlockedCount.textContent = count;
    popupTotalBlocked.textContent = Math.max(stats.totalBlocked || 0, count);
    adblockToggleCheckbox.checked = stats.enabled !== undefined ? stats.enabled : true;

    const statusText = document.getElementById('adblockStatusText');
    if (statusText) {
      statusText.textContent = (stats.enabled !== false) ? 'Đang bảo vệ' : 'Đã tạm tắt';
      statusText.style.color = (stats.enabled !== false) ? '#10b981' : '#f59e0b';
    }
  } catch (e) {
    adblockBadge.textContent = tabData.blockedCount || '0';
  }
}

adblockShieldBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePopup(adblockPopup);
});

adblockToggleCheckbox.addEventListener('change', async () => {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.isNewTab) return;

  try {
    const host = new URL(currentTab.url).hostname;
    const res = await api.toggleAdblock(host);
    showToast(res.enabled ? '🛡️ Đã bật Zenith Shield cho trang này' : '⚠️ Đã tắt Chặn quảng cáo cho trang này');
    updateAdblockUI(currentTab);
    currentTab.webview.reload();
  } catch (e) {}
});

// ==========================================
// 6A. TẢI VIDEO (CHỈ HIỆN KHI PHÁT HIỆN VIDEO TRÊN TRANG)
// ==========================================
function updateVideoUI(tabData) {
  if (!tabData || !btnVideoDownload) return;

  const count = tabData.mediaList ? tabData.mediaList.length : 0;
  if (count > 0) {
    btnVideoDownload.style.display = 'flex';
    videoBadge.textContent = count;
  } else {
    btnVideoDownload.style.display = 'none';
  }

  renderVideoList(tabData.mediaList || []);
}

function renderVideoList(list) {
  if (!videoListContainer) return;
  if (!list || list.length === 0) {
    videoListContainer.innerHTML = `<div class="empty-stream-msg">Chưa phát hiện video nào trên trang này.</div>`;
    return;
  }

  videoListContainer.innerHTML = '';
  list.forEach(item => {
    const itemElem = document.createElement('div');
    itemElem.className = 'stream-item';
    itemElem.innerHTML = `
      <div class="stream-info">
        <div class="stream-title" title="${item.title}">${item.type === 'audio' ? '🎵' : '🎬'} ${item.title}</div>
        <div class="stream-meta">${item.ext.toUpperCase()} • ${item.formattedSize}</div>
      </div>
      <button class="btn-stream-dl" data-url="${item.url}" data-title="${item.title}">Tải về</button>
    `;

    const dlBtn = itemElem.querySelector('.btn-stream-dl');
    dlBtn.addEventListener('click', () => {
      // Nếu là liên kết mở trang chuyển đổi Full HD / MP3 chuyên nghiệp
      if (item.url.includes('ssyoutube.com') || item.url.includes('y2mate')) {
        createTab(item.url);
        showToast('🚀 Đang mở giao diện chọn chất lượng 1080p / MP3...');
        if (videoPopup) videoPopup.classList.remove('show');
        return;
      }

      // Tải trực tiếp file media nhị phân chuẩn (MP4 / M4A)
      let filename = item.title.replace(/\.html?$/i, '').trim();
      const ext = item.ext || (item.type === 'audio' ? 'm4a' : 'mp4');
      if (!filename.endsWith('.' + ext)) {
        filename += '.' + ext;
      }

      api.downloadUrl(item.url, filename, item.type);
      showToast(`⚡ Đang tải về: ${filename}`);
      if (videoPopup) videoPopup.classList.remove('show');
    });

    videoListContainer.appendChild(itemElem);
  });
}

if (api && api.onMediaDetected) {
  api.onMediaDetected((data) => {
    let targetTab = null;
    if (data.tabId) {
      targetTab = tabs.find(t => {
        try {
          return t.webview && t.webview.getWebContentsId && t.webview.getWebContentsId() === data.tabId;
        } catch (e) {
          return false;
        }
      });
    }
    if (!targetTab) {
      targetTab = tabs.find(t => t.id === activeTabId);
    }
    if (!targetTab) return;

    if (!targetTab.mediaList) targetTab.mediaList = [];
    const media = data.media;
    const exists = targetTab.mediaList.some(m => m.id === media.id || m.url === media.url);
    if (!exists) {
      // Đặt tên đẹp theo tiêu đề tab nếu là video YouTube
      if (targetTab.title && targetTab.title !== 'Tab mới' && targetTab.title !== 'YouTube') {
        const cleanTitle = targetTab.title.replace(/ - YouTube$/, '').trim();
        if (media.title.includes('YouTube') || media.title.startsWith('video_')) {
          media.title = `${cleanTitle} (${media.type === 'audio' ? 'Audio' : 'Video'})`;
        }
      }

      targetTab.mediaList.push(media);
      if (targetTab.id === activeTabId) {
        updateVideoUI(targetTab);
        showToast(`🎬 Zenith phát hiện: ${media.title}`);
      }
    }
  });
}

if (btnVideoDownload) {
  btnVideoDownload.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopup(videoPopup);
  });
}

// ==========================================
// 6B. TRÌNH QUẢN LÝ TẢI FILE (CHỈ HIỆN KHI CÓ FILE ĐANG TẢI)
// ==========================================
let activeDownloads = [];

function renderFileDownloadList() {
  if (!fileDownloadList) return;
  if (activeDownloads.length === 0) {
    fileDownloadList.innerHTML = `<div class="empty-stream-msg">Chưa có tệp nào được tải xuống.</div>`;
    return;
  }

  fileDownloadList.innerHTML = '';
  activeDownloads.forEach(item => {
    const el = document.createElement('div');
    el.className = 'file-dl-item';
    const isDone = item.state === 'success';
    const isCancelled = item.state === 'cancelled';
    const isErr = item.state === 'failed';
    const isDownloading = item.state === 'downloading';

    let statusBadge = '';
    if (isDone) {
      statusBadge = `<span class="file-dl-status success">✓ Hoàn thành</span>`;
    } else if (isCancelled) {
      statusBadge = `<span class="file-dl-status cancelled">✕ Đã huỷ</span>`;
    } else if (isErr) {
      statusBadge = `<span class="file-dl-status failed">✕ Thất bại</span>`;
    } else {
      statusBadge = `<span class="file-dl-meta" style="color: var(--zenith-cyan); font-weight: 600;">${item.percent}%</span>`;
    }

    const sizeDisplay = item.sizeText || (isDone ? 'Đã tải xong' : 'Đang xử lý...');
    const speedDisplay = (isDownloading && item.speedText) ? ` • ⚡ ${item.speedText}` : '';

    el.innerHTML = `
      <div class="file-dl-header">
        <span class="file-dl-name" title="${item.fileName}">📄 ${item.fileName}</span>
        ${statusBadge}
      </div>
      <div class="file-dl-submeta">
        <span class="file-dl-size">📦 ${sizeDisplay}${speedDisplay}</span>
      </div>
      ${isDownloading ? `
        <div class="file-dl-progress-bg">
          <div class="file-dl-progress-bar" style="width: ${item.percent}%;"></div>
        </div>
      ` : ''}
      <div class="file-dl-actions">
        ${isDownloading ? `
          <button class="glass-action-btn cancel-dl-btn" data-id="${item.id}" title="Huỷ tải tệp này">✕ Huỷ tải</button>
        ` : ''}
        ${isDone ? `
          <button class="glass-action-btn open-file-action" data-path="${item.savePath}">▶ Mở</button>
          <button class="glass-action-btn open-folder-action" data-path="${item.savePath}">📁 Thư mục</button>
        ` : ''}
        ${!isDownloading ? `
          <button class="glass-action-btn remove-dl-action" data-id="${item.id}" title="Xoá khỏi danh sách">✕ Xoá</button>
        ` : ''}
      </div>
    `;

    // Sự kiện huỷ tải
    if (isDownloading) {
      const cancelBtn = el.querySelector('.cancel-dl-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (api.cancelDownload) api.cancelDownload(item.id);
          item.state = 'cancelled';
          item.sizeText = 'Đã huỷ tải';
          item.speedText = '';
          renderFileDownloadList();
          showToast(`🛑 Đã huỷ tải: ${item.fileName}`);
        });
      }
    }

    // Sự kiện mở file & thư mục
    if (isDone) {
      const openBtn = el.querySelector('.open-file-action');
      if (openBtn) {
        openBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (api.showItemInFolder) api.showItemInFolder(item.savePath);
        });
      }
      const folderBtn = el.querySelector('.open-folder-action');
      if (folderBtn) {
        folderBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (api.openDownloadFolder) api.openDownloadFolder();
        });
      }
    }

    // Xoá khỏi danh sách
    const removeBtn = el.querySelector('.remove-dl-action');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeDownloads = activeDownloads.filter(d => d.id !== item.id);
        renderFileDownloadList();
        if (activeDownloads.length === 0 && fileDlBadge) {
          fileDlBadge.style.display = 'none';
        }
      });
    }

    fileDownloadList.appendChild(el);
  });
}

// Khi bắt đầu có file tải xuống: hiện nút tải file lên thanh công cụ
if (api && api.onDownloadProgress) {
  api.onDownloadProgress((data) => {
    if (btnFileDownloads) btnFileDownloads.style.display = 'flex';
    if (fileDlBadge) {
      fileDlBadge.style.display = 'block';
      fileDlBadge.textContent = data.percent + '%';
    }

    // Tự động mở popup tải file nếu người dùng vừa mới bắt đầu tải
    const isNew = !activeDownloads.some(d => (data.id && d.id === data.id) || d.fileName === data.fileName);
    if (isNew && fileDlPopup && !fileDlPopup.classList.contains('show')) {
      fileDlPopup.classList.add('show');
    }

    const existing = activeDownloads.find(d => (data.id && d.id === data.id) || d.fileName === data.fileName);
    if (existing) {
      if (data.id) existing.id = data.id;
      existing.percent = data.percent;
      existing.sizeText = data.sizeText;
      existing.speedText = data.speedText;
      existing.savePath = data.savePath || existing.savePath;
      existing.state = 'downloading';
    } else {
      activeDownloads.unshift({
        id: data.id || ('dl_' + Date.now()),
        fileName: data.fileName,
        savePath: data.savePath,
        percent: data.percent,
        sizeText: data.sizeText,
        speedText: data.speedText,
        state: 'downloading'
      });
    }

    renderFileDownloadList();
  });
}

if (api && api.onDownloadComplete) {
  api.onDownloadComplete((data) => {
    if (btnFileDownloads) btnFileDownloads.style.display = 'flex';
    if (fileDlBadge) {
      fileDlBadge.textContent = data.state === 'success' ? '✓' : (data.state === 'cancelled' ? '—' : '✕');
    }

    const existing = activeDownloads.find(d => (data.id && d.id === data.id) || d.fileName === data.fileName);
    if (existing) {
      existing.state = data.state;
      if (data.state === 'success') {
        existing.percent = 100;
        if (data.sizeText) existing.sizeText = data.sizeText;
      } else if (data.state === 'cancelled') {
        existing.sizeText = 'Đã huỷ tải';
      }
      if (data.savePath) existing.savePath = data.savePath;
    } else {
      activeDownloads.unshift({
        id: data.id || ('dl_' + Date.now()),
        fileName: data.fileName,
        savePath: data.savePath,
        percent: data.state === 'success' ? 100 : 0,
        sizeText: data.sizeText || (data.state === 'success' ? 'Hoàn thành' : (data.state === 'cancelled' ? 'Đã huỷ tải' : 'Thất bại')),
        state: data.state
      });
    }

    renderFileDownloadList();

    if (data.state === 'success') {
      showToast(`✅ Đã tải xong: ${data.fileName}`);
    } else if (data.state === 'cancelled') {
      showToast(`🛑 Đã huỷ tải: ${data.fileName}`);
    } else {
      showToast(`❌ Tải thất bại: ${data.fileName}`);
    }
  });
}

if (btnFileDownloads) {
  btnFileDownloads.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopup(fileDlPopup);
  });
}

if (openDownloadsFolderBtn) {
  openDownloadsFolderBtn.addEventListener('click', () => {
    api.openDownloadFolder();
  });
}

/// ==========================================
// 7. TRÌNH ĐIỀU KHIỂN PHƯƠNG TIỆN & GHIM VIDEO (GLOBAL MEDIA CONTROLS & PIP)
// ==========================================
function formatMediaTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const sStr = s < 10 ? '0' + s : s;
  if (h > 0) {
    const mStr = m < 10 ? '0' + m : m;
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

function updateMediaHubUI(tabData) {
  if (!mediaHubPopup) return;
  const state = tabData && tabData.mediaState;
  const hasMedia = state && state.hasMedia === true && Boolean(state.title || state.duration > 0);

  if (!hasMedia) {
    if (btnMediaHub) {
      btnMediaHub.style.display = 'none';
      btnMediaHub.classList.remove('playing');
      btnMediaHub.title = 'Điều khiển phương tiện';
    }
    if (mediaHubPopup) {
      mediaHubPopup.classList.remove('show');
    }
    return;
  }

  // Khi có video: Hiển thị nút trên thanh công cụ
  if (btnMediaHub) {
    btnMediaHub.style.display = 'flex';
    if (!state.paused) {
      btnMediaHub.classList.add('playing');
      btnMediaHub.title = `Đang phát: ${state.title}`;
    } else {
      btnMediaHub.classList.remove('playing');
      btnMediaHub.title = `Tạm dừng: ${state.title}`;
    }
  }

  if (mediaHubEmpty) mediaHubEmpty.style.display = 'none';
  if (mediaHubContent) mediaHubContent.style.display = 'block';

  if (mediaHubThumb) {
    mediaHubThumb.src = state.thumbnail || '../assets/zenith.png';
  }
  if (mediaHubDomainText) {
    mediaHubDomainText.textContent = state.domain || (tabData.url ? new URL(tabData.url).hostname.replace('www.', '') : 'Web Video');
  }
  if (mediaHubTitle) {
    mediaHubTitle.textContent = state.title || 'Video';
    mediaHubTitle.title = state.title || '';
  }
  if (mediaHubArtist) {
    mediaHubArtist.textContent = state.artist || 'Trình phát đa phương tiện';
  }

  // Nút Play/Pause icon
  if (mediaHubPlayIcon) {
    mediaHubPlayIcon.textContent = state.paused ? '▶' : '⏸';
  }

  // Nút ghim Picture-in-Picture
  if (mediaHubPipBtn) {
    if (state.isPip) {
      mediaHubPipBtn.classList.add('active');
      mediaHubPipBtn.title = 'Đang ghim ra màn hình nổi (Bấm để quay lại thẻ)';
    } else {
      mediaHubPipBtn.classList.remove('active');
      mediaHubPipBtn.title = 'Ghim ra màn hình nhỏ (Picture-in-Picture)';
    }
  }

  // Thời gian và thanh tiến trình
  const cur = state.currentTime || 0;
  const dur = state.duration || 0;
  if (mediaHubCurrentTime) mediaHubCurrentTime.textContent = formatMediaTime(cur);
  if (mediaHubDuration) mediaHubDuration.textContent = formatMediaTime(dur);

  if (mediaHubProgressFill) {
    const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
    mediaHubProgressFill.style.width = pct + '%';
  }
}

// Bấm nút Media Hub trên thanh công cụ: Click 1 lần mở, click lần nữa tắt
if (btnMediaHub) {
  btnMediaHub.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopup(mediaHubPopup);
  });
}

// Nút đóng ✕ trên thẻ điều khiển Media Hub
if (mediaHubCloseCardBtn) {
  mediaHubCloseCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mediaHubPopup) mediaHubPopup.classList.remove('show');
  });
}

// Hàm hỗ trợ điều khiển video trên tab đang xem (với quyền userGesture = true)
async function executeActiveTabVideoAction(code) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.isNewTab || !currentTab.webview) return null;
  try {
    return await currentTab.webview.executeJavaScript(`
      (function() {
        const videos = Array.from(document.querySelectorAll('video'));
        const video = videos.find(v => !v.paused && v.duration > 0) || videos.find(v => v.duration > 0) || videos[0] || document.querySelector('video');
        if (!video) return { success: false, msg: 'Không tìm thấy video nào' };
        ${code}
      })();
    `, true);
  } catch (err) {
    console.error('Lỗi điều khiển video:', err);
    return null;
  }
}

// 1. Nút Play / Pause
if (mediaHubPlayBtn) {
  mediaHubPlayBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await executeActiveTabVideoAction(`
      if (video.paused) {
        video.play();
        return { success: true, paused: false };
      } else {
        video.pause();
        return { success: true, paused: true };
      }
    `);
    if (res && res.success !== false) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab && currentTab.mediaState) {
        currentTab.mediaState.paused = res.paused;
        updateMediaHubUI(currentTab);
      }
    }
  });
}

// 2. Nút tua lùi 10s
if (mediaHubSeekBackBtn) {
  mediaHubSeekBackBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await executeActiveTabVideoAction(`
      video.currentTime = Math.max(0, video.currentTime - 10);
      return { success: true, currentTime: Math.floor(video.currentTime) };
    `);
    if (res && res.success !== false) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab && currentTab.mediaState) {
        currentTab.mediaState.currentTime = res.currentTime;
        updateMediaHubUI(currentTab);
      }
    }
  });
}

// 3. Nút tua tới 10s
if (mediaHubSeekFwdBtn) {
  mediaHubSeekFwdBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await executeActiveTabVideoAction(`
      video.currentTime = Math.min(video.duration || 999999, video.currentTime + 10);
      return { success: true, currentTime: Math.floor(video.currentTime) };
    `);
    if (res && res.success !== false) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab && currentTab.mediaState) {
        currentTab.mediaState.currentTime = res.currentTime;
        updateMediaHubUI(currentTab);
      }
    }
  });
}

// 4. Click trên thanh tiến trình để tua video
if (mediaHubProgressTrack) {
  mediaHubProgressTrack.addEventListener('click', async (e) => {
    e.stopPropagation();
    const rect = mediaHubProgressTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const res = await executeActiveTabVideoAction(`
      if (video.duration && !isNaN(video.duration)) {
        video.currentTime = ${ratio} * video.duration;
        return { success: true, currentTime: Math.floor(video.currentTime), duration: Math.floor(video.duration) };
      }
      return { success: false };
    `);
    if (res && res.success) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab && currentTab.mediaState) {
        currentTab.mediaState.currentTime = res.currentTime;
        updateMediaHubUI(currentTab);
      }
    }
  });
}

// 5. Nút Ghim ra màn hình nhỏ (Picture-in-Picture)
async function toggleActiveTabPictureInPicture() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.isNewTab || !currentTab.webview) {
    showToast('Vui lòng mở trang web có video để ghim');
    return;
  }

  try {
    const res = await currentTab.webview.executeJavaScript(`
      (async function() {
        try {
          const videos = Array.from(document.querySelectorAll('video')).filter(v => v.offsetWidth > 50 || v.duration > 0);
          const video = videos.find(v => !v.paused && v.duration > 0) || videos.find(v => v.duration > 0) || videos[0] || document.querySelector('video');
          if (!video) return { success: false, msg: 'Không tìm thấy video nào trên trang này' };

          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            return { success: true, isPip: false, msg: 'Đã đóng màn hình nổi (Quay lại thẻ)' };
          } else {
            await video.requestPictureInPicture();
            return { success: true, isPip: true, msg: '📌 Đã xuất video ra màn hình nổi!' };
          }
        } catch (err) {
          return { success: false, msg: 'Không thể ghim video: ' + err.message };
        }
      })();
    `, true);

    if (res && res.msg) showToast(res.msg);
    if (res && res.success) {
      if (currentTab.mediaState) {
        currentTab.mediaState.isPip = res.isPip;
        updateMediaHubUI(currentTab);
      }
    }
  } catch (e) {
    showToast('Lỗi khi mở cửa sổ nổi');
  }
}

if (mediaHubPipBtn) {
  mediaHubPipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleActiveTabPictureInPicture();
  });
}

// ==========================================
// 8. CHẾ ĐỘ BAN ĐÊM (SMART DARK MODE)
// ==========================================
function updateDarkModeButton(isActive) {
  if (isActive) {
    btnDarkMode.classList.add('active');
    darkModeIcon.textContent = '☀️';
    btnDarkMode.title = 'Chế độ ban ngày';
  } else {
    btnDarkMode.classList.remove('active');
    darkModeIcon.textContent = '🌙';
    btnDarkMode.title = 'Chế độ ban đêm (Bảo vệ mắt)';
  }
}

btnDarkMode.addEventListener('click', async () => {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.isNewTab) {
    showToast('Mở một trang web để bật Chế độ ban đêm');
    return;
  }

  try {
    const darkmodeScript = await api.toggleDarkMode();
    const isActive = await currentTab.webview.executeJavaScript(darkmodeScript);
    currentTab.darkModeActive = !!isActive;
    updateDarkModeButton(currentTab.darkModeActive);
    showToast(isActive ? '🌙 Đã bật Chế độ ban đêm' : '☀️ Đã trở về Chế độ ban ngày');
  } catch (e) {
    showToast('Không thể kích hoạt Chế độ ban đêm');
  }
});

// ==========================================
// 9. TỐI ƯU HÓA BỘ NHỚ (MEMORY SAVER & SLEEP TABS)
// ==========================================
async function runMemoryClean() {
  if (api.clearCache) {
    await api.clearCache();
  }
  // Thao tác giải phóng bộ nhớ cho các background tab
  const now = Date.now();
  let sleepCount = 0;
  tabs.forEach(t => {
    if (t.id !== activeTabId && (now - t.lastActive > 180000)) { // 3 phút
      sleepCount++;
    }
  });

  showToast(`⚡ Đã giải phóng RAM & dọn dẹp bộ nhớ đệm!`);
}

btnMemorySaver.addEventListener('click', runMemoryClean);

// ==========================================
// 10. MODAL QUẢN LÝ TẢI XUỐNG & LỊCH SỬ
// ==========================================
function openModal(title, contentHtml) {
  modalTitle.textContent = title;
  modalBody.innerHTML = contentHtml;
  zenithModalOverlay.style.display = 'flex';
}

function closeModal() {
  zenithModalOverlay.style.display = 'none';
}

modalCloseBtn.addEventListener('click', closeModal);
zenithModalOverlay.addEventListener('click', (e) => {
  if (e.target === zenithModalOverlay) closeModal();
});

// ==========================================
// 11. MENU CHÍNH & PHÍM TẮT
// ==========================================
btnBrowserMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePopup(mainMenuPopup);
});

document.getElementById('menuItemNewTab').addEventListener('click', () => {
  createTab();
  closeAllPopups();
});

document.getElementById('menuItemDownloads').addEventListener('click', () => {
  closeAllPopups();
  openModal('Tệp đã tải xuống', `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <p style="font-size:13px; color:#94a3b8;">Các tệp được lưu trong thư mục Downloads của hệ thống.</p>
      <button id="modalOpenFolderBtn" class="btn-stream-dl">Mở thư mục</button>
    </div>
  `);
  document.getElementById('modalOpenFolderBtn').addEventListener('click', () => {
    api.openDownloadFolder();
  });
});

document.getElementById('menuItemHistory').addEventListener('click', () => {
  closeAllPopups();
  const historyHtml = tabs.map(t => `
    <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:8px; margin-bottom:8px;">
      <strong style="color:#ffffff; font-size:13px;">${t.title}</strong>
      <p style="color:#94a3b8; font-size:11px; margin-top:2px;">${t.url}</p>
    </div>
  `).join('');

  openModal('Lịch sử phiên làm việc', `
    <div style="display:flex; flex-direction:column; gap:6px;">
      ${historyHtml || '<p style="color:#64748b; font-size:13px;">Chưa có lịch sử.</p>'}
    </div>
  `);
});

document.getElementById('menuItemBookmarks').addEventListener('click', () => {
  bookmarksBar.style.display = bookmarksBar.style.display === 'none' ? 'flex' : 'none';
  closeAllPopups();
});

document.getElementById('menuItemCleanRam').addEventListener('click', () => {
  closeAllPopups();
  runMemoryClean();
});

document.getElementById('menuItemAbout').addEventListener('click', () => {
  closeAllPopups();
  openSettings('panelAbout');
});

// ==========================================
// 10. QUẢN LÝ DẤU TRANG GHIM (NGƯỜI DÙNG TỰ THÊM / XÓA)
// ==========================================
function getSavedBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('zenith_bookmarks') || '[]');
  } catch (e) {
    return [];
  }
}

function saveBookmarks(list) {
  localStorage.setItem('zenith_bookmarks', JSON.stringify(list));
}

function isBookmarked(url) {
  if (!url || url.includes('newtab.html')) return false;
  const list = getSavedBookmarks();
  return list.some(item => item.url === url);
}

function updateBookmarkButton(tabData) {
  if (!btnBookmark || !bookmarkIcon) return;
  if (!tabData || tabData.isNewTab) {
    btnBookmark.classList.remove('active');
    bookmarkIcon.textContent = '⭐';
    btnBookmark.title = 'Ghim trang này vào thanh Dấu trang';
    return;
  }

  const bookmarked = isBookmarked(tabData.url);
  if (bookmarked) {
    btnBookmark.classList.add('active');
    bookmarkIcon.textContent = '★';
    btnBookmark.title = 'Đã ghim (Bấm để gỡ ghim)';
  } else {
    btnBookmark.classList.remove('active');
    bookmarkIcon.textContent = '⭐';
    btnBookmark.title = 'Ghim trang này vào thanh Dấu trang';
  }
}

function renderBookmarksBar() {
  if (!bookmarksBar) return;
  const list = getSavedBookmarks();

  if (list.length === 0) {
    bookmarksBar.style.display = 'none';
    bookmarksBar.innerHTML = '';
    return;
  }

  bookmarksBar.style.display = 'flex';
  bookmarksBar.innerHTML = '';

  list.forEach((item, index) => {
    const chip = document.createElement('div');
    chip.className = 'bookmark-chip';
    chip.dataset.url = item.url;
    chip.title = item.title;

    chip.innerHTML = `
      <span class="chip-icon">${item.favicon && item.favicon.startsWith('http') ? `<img src="${item.favicon}" width="12" height="12" style="object-fit:contain;" onerror="this.src=''; this.parentElement.textContent='🌐'">` : '🌐'}</span>
      <span class="chip-text">${item.title}</span>
      <button class="chip-del-btn" title="Bỏ ghim dấu trang này" data-index="${index}">✕</button>
    `;

    chip.addEventListener('click', (e) => {
      if (e.target.closest('.chip-del-btn')) return;
      navigateTo(item.url);
    });

    const delBtn = chip.querySelector('.chip-del-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentList = getSavedBookmarks();
      currentList.splice(index, 1);
      saveBookmarks(currentList);
      renderBookmarksBar();
      const currentTab = tabs.find(t => t.id === activeTabId);
      if (currentTab) updateBookmarkButton(currentTab);
      showToast('Đã gỡ ghim dấu trang');
    });

    bookmarksBar.appendChild(chip);
  });
}

function toggleBookmarkCurrentTab() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.isNewTab) {
    showToast('Mở một trang web để ghim vào Dấu trang');
    return;
  }

  const list = getSavedBookmarks();
  const existingIndex = list.findIndex(item => item.url === currentTab.url);

  if (existingIndex !== -1) {
    list.splice(existingIndex, 1);
    saveBookmarks(list);
    showToast('Đã gỡ ghim khỏi Dấu trang');
  } else {
    list.push({
      title: currentTab.title || currentTab.url,
      url: currentTab.url,
      favicon: currentTab.favicon || ''
    });
    saveBookmarks(list);
    showToast(`⭐ Đã ghim: ${currentTab.title}`);
  }

  renderBookmarksBar();
  updateBookmarkButton(currentTab);
}

if (btnBookmark) {
  btnBookmark.addEventListener('click', toggleBookmarkCurrentTab);
}

// ==========================================
// 12. HỆ THỐNG CÀI ĐẶT TINH GỌN (SETTINGS MANAGER)
// ==========================================
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const settingsModalCloseBtn = document.getElementById('settingsModalCloseBtn');
const menuItemSettings = document.getElementById('menuItemSettings');

const settingSearchEngine = document.getElementById('settingSearchEngine');
const settingShieldToggle = document.getElementById('settingShieldToggle');
const settingTrackerToggle = document.getElementById('settingTrackerToggle');
const settingAutoClearData = document.getElementById('settingAutoClearData');
const btnSettingClearBrowsingData = document.getElementById('btnSettingClearBrowsingData');

const settingDownloadFolderPath = document.getElementById('settingDownloadFolderPath');
const btnSettingChangeFolder = document.getElementById('btnSettingChangeFolder');
const btnSettingOpenFolder = document.getElementById('btnSettingOpenFolder');
const settingAutoDetectMedia = document.getElementById('settingAutoDetectMedia');

const settingMemorySaverToggle = document.getElementById('settingMemorySaverToggle');
const btnSettingCleanRamNow = document.getElementById('btnSettingCleanRamNow');

const settingShowBookmarksBar = document.getElementById('settingShowBookmarksBar');
const settingDarkModeToggle = document.getElementById('settingDarkModeToggle');

async function openSettings(initialTab = 'panelSearch') {
  closeAllPopups();
  if (!settingsModalOverlay) return;

  // 1. Tải giá trị cài đặt đã lưu
  if (settingSearchEngine) {
    settingSearchEngine.value = localStorage.getItem('zenith_search_engine') || 'google';
  }
  if (settingShieldToggle) {
    settingShieldToggle.checked = localStorage.getItem('zenith_shield_enabled') !== 'false';
  }
  if (settingTrackerToggle) {
    settingTrackerToggle.checked = localStorage.getItem('zenith_trackers_blocked') !== 'false';
  }
  if (settingAutoClearData) {
    settingAutoClearData.checked = localStorage.getItem('zenith_auto_clear_data') === 'true';
  }
  if (settingAutoDetectMedia) {
    settingAutoDetectMedia.checked = localStorage.getItem('zenith_auto_detect_media') !== 'false';
  }
  if (settingMemorySaverToggle) {
    settingMemorySaverToggle.checked = localStorage.getItem('zenith_memory_saver') !== 'false';
  }
  if (settingShowBookmarksBar) {
    settingShowBookmarksBar.checked = bookmarksBar && bookmarksBar.style.display !== 'none';
  }
  if (settingDarkModeToggle) {
    const currentTab = tabs.find(t => t.id === activeTabId);
    settingDarkModeToggle.checked = currentTab ? Boolean(currentTab.darkModeActive) : false;
  }

  // 2. Tải đường dẫn thư mục Downloads
  if (api && api.getDownloadFolder && settingDownloadFolderPath) {
    try {
      const folder = await api.getDownloadFolder();
      if (folder) settingDownloadFolderPath.textContent = folder;
    } catch (e) {
      settingDownloadFolderPath.textContent = 'Downloads';
    }
  }

  // 3. Chuyển sang tab được chỉ định
  const navBtn = document.querySelector(`.settings-nav-item[data-target="${initialTab}"]`);
  if (navBtn) {
    document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    navBtn.classList.add('active');
    const targetPanel = document.getElementById(initialTab);
    if (targetPanel) targetPanel.classList.add('active');
  }

  settingsModalOverlay.style.display = 'flex';
}

function closeSettings() {
  if (settingsModalOverlay) {
    settingsModalOverlay.style.display = 'none';
  }
}

if (settingsModalCloseBtn) {
  settingsModalCloseBtn.addEventListener('click', closeSettings);
}
if (settingsModalOverlay) {
  settingsModalOverlay.addEventListener('click', (e) => {
    if (e.target === settingsModalOverlay) closeSettings();
  });
}
if (menuItemSettings) {
  menuItemSettings.addEventListener('click', () => openSettings('panelSearch'));
}

// Chuyển tab trong bảng cài đặt
const settingsNavItems = document.querySelectorAll('.settings-nav-item');
settingsNavItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetId = item.dataset.target;
    settingsNavItems.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));

    item.classList.add('active');
    const panel = document.getElementById(targetId);
    if (panel) panel.classList.add('active');
  });
});

// Xử lý các tương tác cài đặt
if (settingSearchEngine) {
  settingSearchEngine.addEventListener('change', () => {
    localStorage.setItem('zenith_search_engine', settingSearchEngine.value);
    showToast(`🔍 Đã đặt công cụ tìm kiếm: ${settingSearchEngine.options[settingSearchEngine.selectedIndex].text}`);
  });
}

if (settingShieldToggle) {
  settingShieldToggle.addEventListener('change', () => {
    localStorage.setItem('zenith_shield_enabled', settingShieldToggle.checked);
    showToast(settingShieldToggle.checked ? '🛡️ Đã bật Zenith Shield' : '⚠️ Đã tắt Zenith Shield');
  });
}

if (settingTrackerToggle) {
  settingTrackerToggle.addEventListener('change', () => {
    localStorage.setItem('zenith_trackers_blocked', settingTrackerToggle.checked);
    showToast(settingTrackerToggle.checked ? '🛡️ Đã bật Chặn theo dõi & quảng cáo' : 'Đã tắt Chặn theo dõi');
  });
}

if (settingAutoClearData) {
  settingAutoClearData.addEventListener('change', () => {
    localStorage.setItem('zenith_auto_clear_data', settingAutoClearData.checked);
    showToast(settingAutoClearData.checked ? '🔒 Sẽ xóa sạch dữ liệu khi tắt trình duyệt' : 'Dữ liệu duyệt web sẽ được giữ lại');
  });
}

if (btnSettingClearBrowsingData) {
  btnSettingClearBrowsingData.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử, cookies và bộ nhớ đệm cache?')) {
      if (api && api.clearBrowsingData) {
        await api.clearBrowsingData();
      }
      localStorage.removeItem('zenith_history');
      showToast('🗑️ Đã xóa sạch toàn bộ dữ liệu duyệt web!');
    }
  });
}

if (btnSettingChangeFolder) {
  btnSettingChangeFolder.addEventListener('click', async () => {
    if (api && api.selectDownloadFolder) {
      const newPath = await api.selectDownloadFolder();
      if (newPath) {
        settingDownloadFolderPath.textContent = newPath;
        showToast(`📁 Đã đổi thư mục tải về: ${newPath}`);
      }
    }
  });
}

if (btnSettingOpenFolder) {
  btnSettingOpenFolder.addEventListener('click', () => {
    if (api && api.openDownloadFolder) api.openDownloadFolder();
  });
}

if (settingAutoDetectMedia) {
  settingAutoDetectMedia.addEventListener('change', () => {
    localStorage.setItem('zenith_auto_detect_media', settingAutoDetectMedia.checked);
    showToast(settingAutoDetectMedia.checked ? '🎬 Đã bật Tự động bắt link video Savior' : 'Đã tắt Tự động bắt link');
  });
}

if (settingMemorySaverToggle) {
  settingMemorySaverToggle.addEventListener('change', () => {
    localStorage.setItem('zenith_memory_saver', settingMemorySaverToggle.checked);
    showToast(settingMemorySaverToggle.checked ? '⚡ Đã bật Tiết kiệm RAM' : 'Đã tắt Tiết kiệm RAM');
  });
}

if (btnSettingCleanRamNow) {
  btnSettingCleanRamNow.addEventListener('click', () => {
    runMemoryClean();
  });
}

if (settingShowBookmarksBar) {
  settingShowBookmarksBar.addEventListener('change', () => {
    if (bookmarksBar) {
      bookmarksBar.style.display = settingShowBookmarksBar.checked ? 'flex' : 'none';
    }
  });
}

if (settingDarkModeToggle) {
  settingDarkModeToggle.addEventListener('change', async () => {
    if (btnDarkMode) btnDarkMode.click();
  });
}

// Đóng popups khi click ngoài

document.addEventListener('click', (e) => {
  if (!e.target.closest('.feature-item')) {
    closeAllPopups();
  }
});

// Phím tắt bàn phím
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    createTab();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    if (activeTabId) closeTab(activeTabId);
  } else if (e.ctrlKey && e.key.toLowerCase() === 'r' || e.key === 'F5') {
    e.preventDefault();
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) currentTab.webview.reload();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    omniboxInput.focus();
    omniboxInput.select();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'j') {
    e.preventDefault();
    document.getElementById('menuItemDownloads').click();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    document.getElementById('menuItemHistory').click();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    toggleBookmarkCurrentTab();
  } else if (e.ctrlKey && (e.key === ',' || e.key.toLowerCase() === 'u')) {
    e.preventDefault();
    openSettings('panelSearch');
  } else if (e.key === 'Escape') {
    closeSettings();
    closeModal();
    closeAllPopups();
  }
});

// Toast notification
let toastTimer = null;
function showToast(msg) {
  toastMessage.textContent = msg;
  toastNotification.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastNotification.classList.remove('show');
  }, 3500);
}

// Khởi chạy thanh dấu trang & tab đầu tiên
renderBookmarksBar();
createTab();
