/**
 * Zenith Browser - Start Page Script
 * Lời chào thông minh, đồng hồ kỹ thuật số và tìm kiếm đa công cụ
 */

// Cập nhật lời chào và thời gian thực
function updateDateTime() {
  const now = new Date();
  const hour = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');

  // Lời chào theo buổi
  const greetingElem = document.getElementById('greetingText');
  if (greetingElem) {
    if (hour >= 5 && hour < 12) {
      greetingElem.textContent = 'Chào buổi sáng ☀️';
    } else if (hour >= 12 && hour < 18) {
      greetingElem.textContent = 'Chào buổi chiều 🌤️';
    } else {
      greetingElem.textContent = 'Chào buổi tối 🌙';
    }
  }

  // Cập nhật giờ
  const timeElem = document.getElementById('currentTime');
  if (timeElem) timeElem.textContent = `${String(hour).padStart(2, '0')}:${minutes}`;

  // Cập nhật ngày tháng
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateElem = document.getElementById('currentDate');
  if (dateElem) dateElem.textContent = `${dayName}, ${date}/${month}/${year}`;
}

setInterval(updateDateTime, 1000);
updateDateTime();

// Xử lý tìm kiếm
const searchInput = document.getElementById('newtabSearchInput');
const searchBtn = document.getElementById('newtabSearchBtn');
const engineSelect = document.getElementById('searchEngineSelect');

function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  const isUrl = /^https?:\/\//i.test(query) ||
                /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(query);

  if (isUrl) {
    let target = query;
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
    window.location.href = target;
    return;
  }

  const engine = engineSelect.value;
  let searchUrl = '';
  switch (engine) {
    case 'google':
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      break;
    case 'coccoc':
      searchUrl = `https://coccoc.com/search?query=${encodeURIComponent(query)}`;
      break;
    case 'bing':
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
      break;
    case 'duckduckgo':
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      break;
    default:
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  window.location.href = searchUrl;
}

if (searchBtn) searchBtn.addEventListener('click', performSearch);
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });
}

// ==========================================
// QUẢN LÝ LỐI TẮT GHIM (NGƯỜI DÙNG TỰ THÊM / XÓA)
// ==========================================
const addShortcutBtn = document.getElementById('addShortcutBtn');
const shortcutsGrid = document.getElementById('shortcutsGrid');

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

function renderShortcuts() {
  // Xóa các card cũ trước nút add
  const existingTiles = shortcutsGrid.querySelectorAll('.custom-shortcut-tile');
  existingTiles.forEach(t => t.remove());

  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem('zenith_shortcuts') || '[]');
  } catch (e) {
    saved = [];
  }

  saved.forEach((item, index) => {
    const domain = getDomain(item.url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    const tile = document.createElement('div');
    tile.className = 'glass-tile custom-shortcut-tile';
    tile.innerHTML = `
      <button class="del-shortcut-btn" title="Xóa lối tắt này" data-index="${index}">✕</button>
      <div class="tile-icon">
        <img src="${faviconUrl}" alt="" onerror="this.src=''; this.parentElement.textContent='🌐'">
      </div>
      <span class="tile-title" title="${item.title}">${item.title}</span>
    `;

    // Click vào card để chuyển trang
    tile.addEventListener('click', (e) => {
      if (e.target.closest('.del-shortcut-btn')) return;
      window.location.href = item.url;
    });

    // Click nút X để xóa lối tắt
    const delBtn = tile.querySelector('.del-shortcut-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saved.splice(index, 1);
      localStorage.setItem('zenith_shortcuts', JSON.stringify(saved));
      renderShortcuts();
    });

    shortcutsGrid.insertBefore(tile, addShortcutBtn);
  });
}

if (addShortcutBtn) {
  addShortcutBtn.addEventListener('click', () => {
    const title = prompt('Nhập tên trang web (Ví dụ: YouTube, Facebook...):');
    if (!title) return;
    let url = prompt('Nhập địa chỉ web (Ví dụ: https://youtube.com):');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try {
      const saved = JSON.parse(localStorage.getItem('zenith_shortcuts') || '[]');
      saved.push({ title: title.trim(), url: url.trim() });
      localStorage.setItem('zenith_shortcuts', JSON.stringify(saved));
      renderShortcuts();
    } catch (e) {}
  });
}

renderShortcuts();
