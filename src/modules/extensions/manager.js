/**
 * Zenith Browser - Extension Manager
 * Quản lý nạp, cài đặt, bật/tắt và gỡ bỏ Chrome Extensions (uBlock Origin, Adblock...)
 */

const { app, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class ExtensionManager {
  constructor(targetSession) {
    this.session = targetSession;
    this.extensionsDir = path.join(app.getPath('userData'), 'extensions');
    this.stateFile = path.join(app.getPath('userData'), 'extensions_state.json');
    this.state = {
      disabledExtensions: [], // array of folder names or IDs
      extensionIds: {} // folderName -> extension ID
    };

    // Đảm bảo thư mục lưu trữ tiện ích luôn tồn tại
    if (!fs.existsSync(this.extensionsDir)) {
      try {
        fs.mkdirSync(this.extensionsDir, { recursive: true });
      } catch (e) {
        console.error('[ExtensionManager] Error creating extensions dir:', e);
      }
    }

    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(raw);
        if (!Array.isArray(this.state.disabledExtensions)) {
          this.state.disabledExtensions = [];
        }
        if (!this.state.extensionIds || typeof this.state.extensionIds !== 'object') {
          this.state.extensionIds = {};
        }
      }
    } catch (e) {
      this.state = { disabledExtensions: [], extensionIds: {} };
    }
  }

  saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      console.error('[ExtensionManager] Error saving state:', e);
    }
  }

  /**
   * Khởi tạo và nạp tất cả extensions hiện có trong thư mục
   */
  async init() {
    await this.loadAll();
  }

  /**
   * Quét và nạp tất cả các tiện ích trong thư mục extensions
   */
  async loadAll() {
    if (!fs.existsSync(this.extensionsDir)) return;

    const entries = fs.readdirSync(this.extensionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const extFolderPath = path.join(this.extensionsDir, entry.name);
        // Kiểm tra xem tiện ích này có bị tắt hay không
        if (this.state.disabledExtensions.includes(entry.name)) {
          continue;
        }

        const manifestDir = this.findManifestDir(extFolderPath);
        if (manifestDir) {
          try {
            const ext = await this.session.loadExtension(manifestDir, { allowFileAccess: true });
            if (ext && ext.id) {
              this.state.extensionIds[entry.name] = ext.id;
              this.saveState();
            }
            console.log(`[ExtensionManager] Loaded extension from: ${manifestDir}`);
          } catch (err) {
            console.error(`[ExtensionManager] Failed to load extension ${entry.name}:`, err.message);
          }
        }
      }
    }
  }

  /**
   * Tìm thư mục chứa manifest.json (hỗ trợ cả trường hợp giải nén bị lồng thêm 1 thư mục con)
   */
  findManifestDir(dirPath) {
    if (!fs.existsSync(dirPath)) return null;

    if (fs.existsSync(path.join(dirPath, 'manifest.json'))) {
      return dirPath;
    }

    try {
      const subs = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const s of subs) {
        if (s.isDirectory()) {
          const subPath = path.join(dirPath, s.name);
          if (fs.existsSync(path.join(subPath, 'manifest.json'))) {
            return subPath;
          }
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Lấy danh sách tất cả các tiện ích đang được cài đặt
   */
  async getAllExtensions() {
    const activeExts = this.session.getAllExtensions ? this.session.getAllExtensions() : [];
    const activeMap = new Map();
    for (const ext of activeExts) {
      activeMap.set(ext.path, ext);
      activeMap.set(ext.id, ext);
    }

    const result = [];
    if (!fs.existsSync(this.extensionsDir)) return result;

    const entries = fs.readdirSync(this.extensionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderName = entry.name;
        const folderPath = path.join(this.extensionsDir, folderName);
        const manifestDir = this.findManifestDir(folderPath);

        if (manifestDir) {
          let manifest = {};
          try {
            const raw = fs.readFileSync(path.join(manifestDir, 'manifest.json'), 'utf8');
            manifest = JSON.parse(raw);
          } catch (e) {}

          const isCurrentlyDisabled = this.state.disabledExtensions.includes(folderName);
          let loadedExt = activeMap.get(manifestDir);

          // Tìm theo ID hoặc path tương đối
          if (!loadedExt) {
            for (const ext of activeExts) {
              if (path.normalize(ext.path) === path.normalize(manifestDir)) {
                loadedExt = ext;
                break;
              }
            }
          }

          const extId = loadedExt ? loadedExt.id : (this.state.extensionIds[folderName] || folderName);
          const name = (manifest && (manifest.name || manifest.short_name)) || folderName;
          const version = (manifest && manifest.version) || '1.0.0';
          const description = (manifest && manifest.description) || '';

          // Lấy icon nếu có
          let iconUrl = '';
          if (manifest && manifest.icons) {
            const iconKey = Object.keys(manifest.icons).sort((a, b) => Number(b) - Number(a))[0];
            if (iconKey && manifest.icons[iconKey]) {
              const iconRelPath = manifest.icons[iconKey];
              const absIconPath = path.join(manifestDir, iconRelPath);
              if (fs.existsSync(absIconPath)) {
                try {
                  const buf = fs.readFileSync(absIconPath);
                  const ext = path.extname(absIconPath).slice(1) || 'png';
                  iconUrl = `data:image/${ext};base64,${buf.toString('base64')}`;
                } catch (e) {}
              }
            }
          }

          // Options page
          let optionsUrl = '';
          if (manifest) {
            if (manifest.options_page) {
              optionsUrl = `chrome-extension://${extId}/${manifest.options_page}`;
            } else if (manifest.options_ui && manifest.options_ui.page) {
              optionsUrl = `chrome-extension://${extId}/${manifest.options_ui.page}`;
            }
          }

          result.push({
            id: extId,
            folderName: folderName,
            name: name,
            version: version,
            description: description,
            manifestDir: manifestDir,
            enabled: !isCurrentlyDisabled,
            iconUrl: iconUrl,
            optionsUrl: optionsUrl
          });
        }
      }
    }

    return result;
  }

  /**
   * Mở thư mục extensions trên Windows Explorer
   */
  openExtensionsFolder() {
    if (!fs.existsSync(this.extensionsDir)) {
      fs.mkdirSync(this.extensionsDir, { recursive: true });
    }
    shell.openPath(this.extensionsDir);
    return this.extensionsDir;
  }

  /**
   * Cài đặt tiện ích từ đường dẫn (thư mục, file .zip, file .crx)
   */
  async installFromPath(sourcePath) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Đường dẫn không tồn tại: ' + sourcePath);
    }

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      return await this.installFromFolder(sourcePath);
    } else if (stat.isFile()) {
      const ext = path.extname(sourcePath).toLowerCase();
      if (ext === '.zip' || ext === '.crx') {
        return await this.installFromArchive(sourcePath);
      } else {
        throw new Error('Định dạng tệp không được hỗ trợ. Vui lòng chọn thư mục extension, file .zip hoặc .crx.');
      }
    }
    throw new Error('Đường dẫn không hợp lệ');
  }

  /**
   * Cài đặt từ một thư mục extension đã giải nén
   */
  async installFromFolder(sourceFolder) {
    const manifestDir = this.findManifestDir(sourceFolder);
    if (!manifestDir) {
      throw new Error('Không tìm thấy tệp manifest.json trong thư mục được chọn.');
    }

    // Đọc thông tin manifest
    let extName = 'extension_' + Date.now();
    try {
      const raw = fs.readFileSync(path.join(manifestDir, 'manifest.json'), 'utf8');
      const manifest = JSON.parse(raw);
      if (manifest.name) {
        extName = manifest.name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
      }
    } catch (e) {}

    const targetFolder = path.join(this.extensionsDir, extName);
    if (fs.existsSync(targetFolder)) {
      // Nếu đã có, tạo tên duy nhất
      const uniqueName = extName + '_' + Date.now();
      return await this.copyAndLoad(manifestDir, path.join(this.extensionsDir, uniqueName), uniqueName);
    }

    return await this.copyAndLoad(manifestDir, targetFolder, extName);
  }

  /**
   * Cài đặt từ file .zip hoặc .crx
   */
  async installFromArchive(archivePath) {
    let zipPath = archivePath;
    let tempZipCreated = false;

    // Nếu là file .crx, tách header để lấy phần zip thuần túy
    const ext = path.extname(archivePath).toLowerCase();
    if (ext === '.crx') {
      const buffer = fs.readFileSync(archivePath);
      // Tìm chữ ký ZIP PK\x03\x04
      let zipOffset = -1;
      for (let i = 0; i < Math.min(buffer.length - 4, 100000); i++) {
        if (buffer[i] === 0x50 && buffer[i + 1] === 0x4B && buffer[i + 2] === 0x03 && buffer[i + 3] === 0x04) {
          zipOffset = i;
          break;
        }
      }

      if (zipOffset === -1) {
        throw new Error('Tệp .crx không đúng định dạng nén ZIP chuẩn.');
      }

      const zipBuf = buffer.slice(zipOffset);
      const tempZip = path.join(app.getPath('temp'), `zenith_ext_${Date.now()}.zip`);
      fs.writeFileSync(tempZip, zipBuf);
      zipPath = tempZip;
      tempZipCreated = true;
    }

    // Tạo thư mục tạm để giải nén
    const baseName = path.basename(archivePath, path.extname(archivePath)).replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
    const tempExtractDir = path.join(app.getPath('temp'), `zenith_extract_${Date.now()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    try {
      // Dùng PowerShell Expand-Archive (tích hợp sẵn trên mọi máy Windows 10/11)
      const psCommand = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tempExtractDir.replace(/'/g, "''")}' -Force"`;
      execSync(psCommand, { stdio: 'pipe' });

      // Tìm manifest.json trong thư mục đã giải nén
      const manifestDir = this.findManifestDir(tempExtractDir);
      if (!manifestDir) {
        throw new Error('Giải nén thành công nhưng không tìm thấy manifest.json bên trong tệp.');
      }

      let extName = baseName || ('ext_' + Date.now());
      try {
        const raw = fs.readFileSync(path.join(manifestDir, 'manifest.json'), 'utf8');
        const manifest = JSON.parse(raw);
        if (manifest.name) {
          extName = manifest.name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
        }
      } catch (e) {}

      let targetFolder = path.join(this.extensionsDir, extName);
      if (fs.existsSync(targetFolder)) {
        extName = extName + '_' + Date.now();
        targetFolder = path.join(this.extensionsDir, extName);
      }

      const result = await this.copyAndLoad(manifestDir, targetFolder, extName);
      return result;
    } finally {
      // Dọn dẹp tệp tạm
      try {
        if (tempZipCreated && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  async copyAndLoad(srcDir, destDir, folderName) {
    // Copy thư mục
    fs.cpSync(srcDir, destDir, { recursive: true });

    // Xóa khỏi danh sách disabled nếu có
    this.state.disabledExtensions = this.state.disabledExtensions.filter(f => f !== folderName);
    this.saveState();

    // Nạp vào session
    try {
      const ext = await this.session.loadExtension(destDir, { allowFileAccess: true });
      if (ext && ext.id) {
        this.state.extensionIds[folderName] = ext.id;
        this.saveState();
      }
      console.log(`[ExtensionManager] Successfully installed & loaded: ${ext.name} (${ext.id})`);
      return { success: true, name: ext.name, id: ext.id };
    } catch (err) {
      console.error(`[ExtensionManager] Error loading after copy:`, err);
      return { success: true, name: folderName, id: folderName, warning: err.message };
    }
  }

  /**
   * Bật hoặc tắt 1 extension
   */
  async toggleExtension(idOrFolderName, enable) {
    const all = await this.getAllExtensions();
    const target = all.find(e => 
      e.id === idOrFolderName || 
      e.folderName === idOrFolderName || 
      (this.state.extensionIds && this.state.extensionIds[e.folderName] === idOrFolderName)
    );
    if (!target) {
      throw new Error('Không tìm thấy tiện ích: ' + idOrFolderName);
    }

    if (enable) {
      // Bật lại
      this.state.disabledExtensions = this.state.disabledExtensions.filter(f => f !== target.folderName);
      this.saveState();

      try {
        const ext = await this.session.loadExtension(target.manifestDir, { allowFileAccess: true });
        if (ext && ext.id) {
          this.state.extensionIds[target.folderName] = ext.id;
          this.saveState();
        }
        return { success: true, enabled: true };
      } catch (err) {
        throw new Error('Lỗi khi nạp tiện ích: ' + err.message);
      }
    } else {
      // Tắt
      if (!this.state.disabledExtensions.includes(target.folderName)) {
        this.state.disabledExtensions.push(target.folderName);
        this.saveState();
      }

      try {
        if (this.session.removeExtension && target.id) {
          this.session.removeExtension(target.id);
        }
      } catch (e) {}

      return { success: true, enabled: false };
    }
  }

  /**
   * Xóa hoàn toàn 1 extension
   */
  async removeExtension(idOrFolderName) {
    const all = await this.getAllExtensions();
    const target = all.find(e => 
      e.id === idOrFolderName || 
      e.folderName === idOrFolderName || 
      (this.state.extensionIds && this.state.extensionIds[e.folderName] === idOrFolderName)
    );
    if (!target) {
      throw new Error('Không tìm thấy tiện ích cần xóa');
    }

    // Gỡ khỏi session
    try {
      if (this.session.removeExtension && target.id) {
        this.session.removeExtension(target.id);
      }
    } catch (e) {}

    // Xóa khỏi disabled state và extensionIds
    this.state.disabledExtensions = this.state.disabledExtensions.filter(f => f !== target.folderName);
    if (this.state.extensionIds) {
      delete this.state.extensionIds[target.folderName];
    }
    this.saveState();

    // Xóa thư mục trên ổ cứng
    const targetFolder = path.join(this.extensionsDir, target.folderName);
    if (fs.existsSync(targetFolder)) {
      try {
        fs.rmSync(targetFolder, { recursive: true, force: true });
      } catch (e) {
        console.error('[ExtensionManager] Error removing folder:', e);
      }
    }

    return { success: true };
  }

  /**
   * Tải lại tất cả tiện ích
   */
  async reloadAll() {
    const active = this.session.getAllExtensions ? this.session.getAllExtensions() : [];
    for (const ext of active) {
      try {
        this.session.removeExtension(ext.id);
      } catch (e) {}
    }
    await this.loadAll();
    return await this.getAllExtensions();
  }
}

module.exports = ExtensionManager;
