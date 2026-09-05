/**
 * Cốc Cốc Dark Mode Engine - Chế độ ban đêm thông minh
 * Dựa trên thuật toán từ repo mã nguồn mở của Cốc Cốc (github.com/coccoc/darkmode)
 * Đảo ngược màu sắc trang web nhưng bảo toàn độ trung thực của ảnh, video, canvas và các thẻ đa phương tiện.
 */

const COCCOC_DARKMODE_SCRIPT = `
(function() {
  if (window.__coccoc_night_mode_active) {
    // Nếu đang bật thì tắt (hoàn nguyên)
    const existingStyle = document.getElementById('__coccoc_darkmode_style');
    if (existingStyle) existingStyle.remove();
    document.documentElement.classList.remove('coccoc-dark-mode-applied');
    window.__coccoc_night_mode_active = false;
    return false;
  }

  window.__coccoc_night_mode_active = true;

  // Thêm style chuyên biệt cho Dark Mode
  let style = document.getElementById('__coccoc_darkmode_style');
  if (!style) {
    style = document.createElement('style');
    style.id = '__coccoc_darkmode_style';
    style.textContent = \`
      html.coccoc-dark-mode-applied {
        filter: invert(0.9) hue-rotate(180deg) !important;
        background-color: #121212 !important;
      }

      /* Đảo ngược ngược lại (Back-inverse) cho ảnh, video, icon để không bị đổi màu */
      html.coccoc-dark-mode-applied img,
      html.coccoc-dark-mode-applied video,
      html.coccoc-dark-mode-applied canvas,
      html.coccoc-dark-mode-applied svg,
      html.coccoc-dark-mode-applied iframe,
      html.coccoc-dark-mode-applied [style*="background-image"],
      html.coccoc-dark-mode-applied .player-poster,
      html.coccoc-dark-mode-applied .ytp-chrome-bottom {
        filter: invert(1) hue-rotate(180deg) !important;
      }

      /* Giữ độ tương phản dịu mắt */
      html.coccoc-dark-mode-applied body {
        background-color: #1a1a1a !important;
      }
    \`;
    document.head.appendChild(style);
  }

  document.documentElement.classList.add('coccoc-dark-mode-applied');
  return true;
})();
`;

module.exports = {
  COCCOC_DARKMODE_SCRIPT
};
