(function() {
  if (window.__zenith_sniffer_injected) return;
  window.__zenith_sniffer_injected = true;

  function reportMedia(title, url, type, quality, ext) {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
      // If blob on YouTube or Facebook, use page URL so downloader can process
      if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be')) {
        url = window.location.href;
      } else {
        return;
      }
    }
    if (window.ZenithMobile && window.ZenithMobile.onMediaFound) {
      window.ZenithMobile.onMediaFound(title || document.title || 'Video', url, type || 'video', quality || 'HD', ext || 'mp4');
    }
  }

  function scanMedia() {
    // 1. YouTube specific
    if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be')) {
      if (window.location.pathname.includes('/watch') || window.location.pathname.includes('/shorts/') || window.location.search.includes('v=')) {
        let title = document.title ? document.title.replace(/ - YouTube$/, '').trim() : 'YouTube Video';
        const h1 = document.querySelector('h1.title, h1.ytd-watch-metadata');
        if (h1 && h1.textContent.trim()) title = h1.textContent.trim();
        reportMedia(title, window.location.href, 'video', '1080p / 720p', 'mp4');
        return;
      }
    }

    // 2. Standard HTML5 Video elements
    const videos = document.querySelectorAll('video');
    for (const v of videos) {
      const src = v.currentSrc || v.src;
      if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        let title = document.title || 'Web Video';
        let ext = 'mp4';
        if (src.includes('.m3u8')) ext = 'm3u8';
        else if (src.includes('.webm')) ext = 'webm';
        reportMedia(title, src, 'video', 'HD', ext);
        return;
      }
    }

    // 3. Audio elements
    const audios = document.querySelectorAll('audio');
    for (const a of audios) {
      const src = a.currentSrc || a.src;
      if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        reportMedia(document.title || 'Audio', src, 'audio', 'Audio', 'mp3');
        return;
      }
    }
  }

  setInterval(scanMedia, 1500);
  scanMedia();
})();
