# Hướng Dẫn Tự Sửa & Tùy Biến - Zenith Browser ⚡

Chào bạn! **Zenith Browser** đã được thiết kế lại theo phong cách hiện đại tối giản (Deep Space & Glassmorphism), loại bỏ hoàn toàn thanh bên để tối ưu 100% diện tích màn hình, đồng thời trang bị sẵn các cờ tối ưu hóa RAM và cơ chế giải phóng bộ nhớ.

---

## 1. Cấu Trúc Mã Nguồn Gọn Gàng

```
trình duyệt/
├── assets/
│   ├── zenith.png           # Icon ứng dụng Zenith
│   └── zenith.svg           # Logo vector Zenith ánh sáng cực quang
├── src/
│   ├── main.js              # Cấu hình cờ tối ưu RAM, V8 heap và tiến trình Chromium
│   ├── preload.js           # API bảo mật (Chặn quảng cáo, Tải video, Dọn dẹp RAM)
│   ├── modules/
│   │   ├── adblocker/       # Bộ chặn quảng cáo quốc tế + Việt Nam (ABPVN, YouTube)
│   │   ├── darkmode/        # Chế độ ban đêm thông minh (bảo vệ ảnh, video)
│   │   └── downloader/      # Bắt link video/audio (.mp4, .webm, .m3u8, .mp3)
│   ├── renderer/            # Giao diện chính (Tabs nổi, Kính mờ, Tràn viền)
│   │   ├── index.html       # Cấu trúc giao diện
│   │   ├── styles.css       # Toàn bộ CSS phong cách Deep Dark & Glassmorphism
│   │   └── app.js           # Xử lý logic tab, Memory Saver, bắt link video
│   └── newtab/              # Trang Tab mới (Start Page)
│       ├── newtab.html      # Giao diện trang khởi đầu
│       ├── newtab.css       # Hiệu ứng ánh sáng nền và thẻ kính mờ
│       └── newtab.js        # Lời chào theo buổi, đồng hồ, tìm kiếm
├── package.json             # Cấu hình dự án
├── README.md                # Giới thiệu nhanh
└── HUONG_DAN_TU_SUA.md      # Tài liệu này
```

---

## 2. Hướng Dẫn Tự Tùy Biến

### A. Tùy Biến Tông Màu & Hiệu Ứng (Theme Colors)
Mở file: `src/renderer/styles.css`
- Ngay đầu file tại `:root`:
  ```css
  :root {
    --zenith-bg: #090d16;             /* Màu nền tối sâu thẳm */
    --zenith-emerald: #10b981;        /* Màu nhấn xanh ngọc lục bảo */
    --zenith-cyan: #06b6d4;           /* Màu nhấn xanh cyan */
    --zenith-border-focus: rgba(16, 185, 129, 0.6);
  }
  ```
  Bạn có thể đổi sang các màu yêu thích như Tím Neon (`#8b5cf6`), Đỏ Ruby (`#f43f5e`), hoặc Vàng Hổ Phách (`#f59e0b`).

### B. Tùy Biến Cấu Hình Tối Ưu RAM
Mở file: `src/main.js`
- Bạn có thể điều chỉnh mức giới hạn Heap V8 tại:
  ```javascript
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512'); // 512MB hoặc 256MB nếu muốn siêu tiết kiệm
  app.commandLine.appendSwitch('renderer-process-limit', '4');           // Giới hạn số tiến trình
  ```

### C. Thêm Luật Chặn Quảng Cáo Mới
Mở file: `src/modules/adblocker/rules.js`
- Thêm domain vào mảng `AD_DOMAINS` hoặc thêm class banner cần ẩn vào `COSMETIC_FILTERS`.
- Tự động bỏ qua quảng cáo YouTube được quản lý trong `YOUTUBE_ADBLOCK_SCRIPT`.

### D. Thêm Lối Tắt Mặc Định Trên Trang New Tab
Mở file: `src/newtab/newtab.html`
- Thêm thẻ `<a href="..." class="glass-tile">` trong khối `<div class="shortcuts-grid">`.

---

## 3. Cách Chạy & Đóng Gói

### Chạy thử ngay:
```bash
npm start
```

### Đóng gói thành file `.exe` cài đặt độc lập:
```bash
npm install --save-dev electron-packager
npx electron-packager . "ZenithBrowser" --platform=win32 --arch=x64 --icon=assets/zenith.png --out=dist --overwrite
```
File `ZenithBrowser.exe` sẽ được tạo trong thư mục `dist/ZenithBrowser-win32-x64/`.
