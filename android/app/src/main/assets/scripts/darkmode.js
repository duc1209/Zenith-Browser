(function() {
  if (window.__zenith_darkmode_active) {
    const existing = document.getElementById('__zenith_darkmode_style');
    if (existing) existing.remove();
    document.documentElement.classList.remove('zenith-dark-mode-applied');
    window.__zenith_darkmode_active = false;
    return;
  }
  window.__zenith_darkmode_active = true;

  let style = document.getElementById('__zenith_darkmode_style');
  if (!style) {
    style = document.createElement('style');
    style.id = '__zenith_darkmode_style';
    style.textContent = `
      html.zenith-dark-mode-applied {
        filter: invert(0.9) hue-rotate(180deg) !important;
        background-color: #121212 !important;
      }
      html.zenith-dark-mode-applied img,
      html.zenith-dark-mode-applied video,
      html.zenith-dark-mode-applied canvas,
      html.zenith-dark-mode-applied svg,
      html.zenith-dark-mode-applied iframe,
      html.zenith-dark-mode-applied [style*="background-image"],
      html.zenith-dark-mode-applied .player-poster,
      html.zenith-dark-mode-applied .ytp-chrome-bottom {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      html.zenith-dark-mode-applied body {
        background-color: #121212 !important;
      }
    `;
    document.head.appendChild(style);
  }
  document.documentElement.classList.add('zenith-dark-mode-applied');
})();
