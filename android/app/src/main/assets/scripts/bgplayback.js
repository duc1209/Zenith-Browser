(function() {
  if (window.__zenith_bg_installed) return;
  window.__zenith_bg_installed = true;

  // Cờ trạng thái chạy dưới nền
  window.__zenith_is_background = false;

  // Theo dõi tương tác người dùng thực sự (chạm, bấm, gõ phím)
  let lastUserInteractionTime = 0;
  const markUserInteraction = function() {
    lastUserInteractionTime = Date.now();
  };

  ['click', 'touchstart', 'touchend', 'pointerdown', 'pointerup', 'keydown'].forEach(function(evtName) {
    window.addEventListener(evtName, markUserInteraction, { capture: true, passive: true });
    document.addEventListener(evtName, markUserInteraction, { capture: true, passive: true });
  });

  // 1. Ghi đè triệt để Page Visibility API để giữ âm thanh chạy nền
  try {
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'webkitHidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'webkitVisibilityState', { get: () => 'visible', configurable: true });
  } catch (e) {}

  // 2. Chặn các thuộc tính onblur, onvisibilitychange trên window & document
  try {
    Object.defineProperty(window, 'onblur', { get: () => null, set: () => {}, configurable: true });
    Object.defineProperty(document, 'onvisibilitychange', { get: () => null, set: () => {}, configurable: true });
    Object.defineProperty(window, 'onpagehide', { get: () => null, set: () => {}, configurable: true });
  } catch (e) {}

  // 3. Chặn đăng ký event listener cho visibilitychange, webkitvisibilitychange, blur, pagehide, freeze
  try {
    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'visibilitychange' || type === 'webkitvisibilitychange' || type === 'pagehide' || type === 'freeze') {
        return;
      }
      if (type === 'blur' && (this === window || this === document)) {
        return;
      }
      return origAddEventListener.call(this, type, listener, options);
    };
  } catch (e) {}

  // 4. Chặn các sự kiện nổi nếu có script nào đã đăng ký trước đó
  const blockEvt = function(e) {
    if (e.type === 'visibilitychange' || e.type === 'webkitvisibilitychange' || e.type === 'pagehide' || e.type === 'freeze') {
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  };
  window.addEventListener('visibilitychange', blockEvt, true);
  document.addEventListener('visibilitychange', blockEvt, true);
  window.addEventListener('webkitvisibilitychange', blockEvt, true);
  document.addEventListener('webkitvisibilitychange', blockEvt, true);
  window.addEventListener('pagehide', blockEvt, true);

  // 5. Ghi đè IntersectionObserver để YouTube không tự pause khi video cuộn khuất hoặc cửa sổ ẩn
  try {
    const origIntersectionObserver = window.IntersectionObserver;
    if (origIntersectionObserver) {
      window.IntersectionObserver = function(callback, options) {
        const wrappedCallback = function(entries, observer) {
          const modified = entries.map(function(entry) {
            const isMedia = entry.target && (entry.target.tagName === 'VIDEO' || entry.target.tagName === 'AUDIO');
            if (isMedia || window.__zenith_is_background) {
              return new Proxy(entry, {
                get(target, prop) {
                  if (prop === 'isIntersecting') return true;
                  if (prop === 'intersectionRatio') return 1;
                  return Reflect.get(target, prop);
                }
              });
            }
            return entry;
          });
          return callback(modified, observer);
        };
        return new origIntersectionObserver(wrappedCallback, options);
      };
      window.IntersectionObserver.prototype = origIntersectionObserver.prototype;
    }
  } catch (e) {}

  // 6. Theo dõi trạng thái phát nhạc & thông tin đa phương tiện
  let isMediaCurrentlyPlaying = false;

  function getMediaDetails() {
    let title = '';
    const h1 = document.querySelector('h1.ytd-watch-metadata, #title h1 yt-formatted-string, h1.title');
    if (h1 && h1.textContent.trim()) {
      title = h1.textContent.trim();
    } else if (document.title) {
      title = document.title.replace(/ - YouTube$/, '').trim();
    }

    let artist = '';
    const channel = document.querySelector('ytm-channel-name .ytm-channel-name-content, .ytd-channel-name yt-formatted-string, .ytm-channel-name, ytd-video-owner-renderer #channel-name');
    if (channel && channel.textContent.trim()) {
      artist = channel.textContent.trim();
    } else {
      artist = 'YouTube';
    }

    // Trích xuất ảnh bìa/thumbnail video
    let artworkUrl = '';
    const match = location.href.match(/[?&]v=([^&#]+)/) || location.href.match(/\/shorts\/([^/?&#]+)/);
    if (match && match[1]) {
      artworkUrl = 'https://i.ytimg.com/vi/' + match[1] + '/hqdefault.jpg';
    }
    if (!artworkUrl) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.content) {
        artworkUrl = ogImg.content;
      }
    }
    if (!artworkUrl) {
      const video = document.querySelector('video');
      if (video && video.poster) {
        artworkUrl = video.poster;
      }
    }

    let positionMs = 0;
    let durationMs = 0;
    const video = document.querySelector('video') || document.querySelector('audio');
    if (video) {
      const cur = video.currentTime;
      const dur = video.duration;
      if (typeof cur === 'number' && isFinite(cur) && cur >= 0) {
        positionMs = Math.round(cur * 1000);
      }
      if (typeof dur === 'number' && isFinite(dur) && dur > 0) {
        durationMs = Math.round(dur * 1000);
      }
    }

    return {
      title: title || 'Zenith Browser',
      artist: artist || 'YouTube',
      artworkUrl: artworkUrl || '',
      positionMs: positionMs,
      durationMs: durationMs
    };
  }

  function checkIsAnyMediaPlaying() {
    const medias = document.querySelectorAll('video, audio');
    for (let i = 0; i < medias.length; i++) {
      const m = medias[i];
      if (!m.paused && !m.ended) {
        return true;
      }
    }
    return false;
  }

  let lastReportedState = { isPlaying: null, title: '', artworkUrl: '' };

  function reportPlaybackState(force) {
    const isPlaying = checkIsAnyMediaPlaying();
    isMediaCurrentlyPlaying = isPlaying;
    const details = getMediaDetails();

    const titleChanged = details.title !== lastReportedState.title;
    const playingChanged = isPlaying !== lastReportedState.isPlaying;
    const artworkChanged = details.artworkUrl !== lastReportedState.artworkUrl;

    if (force || titleChanged || playingChanged || artworkChanged) {
      lastReportedState = {
        isPlaying: isPlaying,
        title: details.title,
        artworkUrl: details.artworkUrl
      };

      if (window.ZenithMobile) {
        if (typeof window.ZenithMobile.onMediaPlaybackDetails === 'function') {
          window.ZenithMobile.onMediaPlaybackDetails(
            isPlaying,
            details.title,
            details.artist,
            details.artworkUrl,
            details.positionMs,
            details.durationMs
          );
        } else if (typeof window.ZenithMobile.onMediaPlaybackChanged === 'function') {
          window.ZenithMobile.onMediaPlaybackChanged(isPlaying, details.title);
        }
      }
    }
  }

  // Lắng nghe sự kiện play/playing/seeked/pause/ended của media
  document.addEventListener('play', function() {
    reportPlaybackState(true);
  }, true);

  document.addEventListener('playing', function() {
    reportPlaybackState(true);
  }, true);

  document.addEventListener('seeked', function() {
    reportPlaybackState(true);
  }, true);

  // timeupdate: CHỈ kiểm tra khi bài hát đổi sang bài mới (YouTube SPA navigation)
  // Tuyệt đối KHÔNG gửi cập nhật liên tục để tránh spam dịch vụ Android làm rung/kêu chuông!
  let lastCheckedTitle = '';
  document.addEventListener('timeupdate', function() {
    const currentTitle = getMediaDetails().title;
    if (currentTitle && currentTitle !== lastCheckedTitle) {
      lastCheckedTitle = currentTitle;
      reportPlaybackState(true);
    }
  }, true);

  document.addEventListener('pause', function(e) {
    if (!window.__zenith_is_background) {
      // Khi ở trong app: Người dùng CHỦ ĐỘNG bấm pause -> Cập nhật trạng thái DỪNG
      reportPlaybackState(true);
    } else {
      // Khi đang ở chế độ nền: Chỉ khôi phục NẾU trước khi ra nền media đang thực sự phát
      if (isMediaCurrentlyPlaying) {
        const target = e.target;
        if (target && target instanceof HTMLMediaElement && !target.ended) {
          setTimeout(function() {
            if (window.__zenith_is_background && isMediaCurrentlyPlaying && target.paused) {
              target.play().catch(function() {});
            }
          }, 100);
        }
      }
    }
  }, true);

  document.addEventListener('ended', function() {
    reportPlaybackState(true);
  }, true);

  // 7. Ghi đè HTMLMediaElement.prototype.pause: Chỉ chặn pause khi đang chạy ngầm và media ĐANG ĐƯỢC PHÁT
  const origPlay = HTMLMediaElement.prototype.play;
  const origPause = HTMLMediaElement.prototype.pause;

  HTMLMediaElement.prototype.pause = function() {
    if (window.__zenith_is_background && isMediaCurrentlyPlaying) {
      // Đang chạy dưới nền: Ngăn YouTube tự ngắt âm thanh
      return;
    }
    return origPause.apply(this, arguments);
  };

  // 8. Hàm điều khiển Play / Pause trực tiếp từ thanh thông báo Android
  window.__zenith_toggle_playback = function(play) {
    const medias = document.querySelectorAll('video, audio');
    medias.forEach(function(m) {
      try {
        if (play) {
          isMediaCurrentlyPlaying = true;
          m.play().catch(function() {});
        } else {
          isMediaCurrentlyPlaying = false;
          m.pause();
        }
      } catch (e) {}
    });
    reportPlaybackState(true);
  };

  // 9. Tua thời gian video trực tiếp từ Seek Bar của Android
  window.__zenith_seek_to = function(seconds) {
    const medias = document.querySelectorAll('video, audio');
    medias.forEach(function(m) {
      try {
        m.currentTime = seconds;
      } catch (e) {}
    });
    reportPlaybackState(true);
  };

  // 10. Chuyển sang video tiếp theo
  window.__zenith_skip_next = function() {
    const player = document.getElementById('movie_player');
    if (player && typeof player.nextVideo === 'function') {
      player.nextVideo();
      return;
    }
    const nextBtn = document.querySelector('.ytp-next-button, button.ytm-autonav-toggle-button, ytm-autonav-toggle-button');
    if (nextBtn) {
      nextBtn.click();
      return;
    }
    const nextItem = document.querySelector('ytm-video-with-context-renderer a, ytm-compact-video-renderer a, .ytm-autonav-endscreen-button, a.compact-media-item-image');
    if (nextItem) {
      nextItem.click();
      return;
    }
    const video = document.querySelector('video');
    if (video && video.duration) {
      video.currentTime = Math.max(0, video.duration - 0.5);
    }
  };

  // 11. Quay lại video trước đó (hoặc tua về đầu bài nếu đã nghe quá 4s)
  window.__zenith_skip_previous = function() {
    const video = document.querySelector('video');
    if (video && video.currentTime > 4) {
      video.currentTime = 0;
      return;
    }
    const player = document.getElementById('movie_player');
    if (player && typeof player.previousVideo === 'function') {
      player.previousVideo();
      return;
    }
    const prevBtn = document.querySelector('.ytp-prev-button');
    if (prevBtn) {
      prevBtn.click();
      return;
    }
    window.history.back();
  };

  // 12. Hàm nhận tín hiệu chuyển trạng thái nền từ MainActivity
  window.__zenith_set_background = function(isBg) {
    window.__zenith_is_background = isBg;
    if (isBg) {
      if (!isMediaCurrentlyPlaying) {
        return;
      }
      const medias = document.querySelectorAll('video, audio');
      medias.forEach(function(m) {
        if (m && m.paused && !m.ended && (m.currentTime > 0 || m.readyState >= 2)) {
          m.play().catch(function() {});
        }
      });
    }
    reportPlaybackState(true);
  };
})();

