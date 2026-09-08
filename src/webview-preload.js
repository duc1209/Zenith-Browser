/**
 * Zenith Webview Preload Script
 * Quản lý trạng thái phương tiện cho PiP và Điều khiển phương tiện toàn cục
 * (Quảng cáo được quản lý độc lập bởi Extension mà người dùng cài đặt)
 */

(function() {
  function sendToEmbedder(channel, data) {
    console.log(`__ZENITH_IPC__:${channel}:${JSON.stringify(data)}`);
  }

  // ==========================================================
  // THEO DÕI TRẠNG THÁI PHÁT CHO TRÌNH ĐIỀU KHIỂN ĐA PHƯƠNG TIỆN (GLOBAL MEDIA CONTROLS & PIP)
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
        video = videos.find(v => !v.paused && v.duration > 0) || videos.find(v => v.duration > 0 && !v.ended) || videos[0];
      } else {
        video = videos.find(v => !v.paused && !v.muted && v.duration > 0 && v.currentTime > 0);
      }
    } else {
      video = videos.find(v => !v.paused && v.duration > 0) || videos.find(v => v.duration > 0 && !v.ended);
    }

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
