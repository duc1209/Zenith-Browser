const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const backupDir = path.join(rootDir, '_src_clean_backup');

// Obfuscator configuration
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  shuffleStringArray: true,
  splitStrings: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

// Helper: copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper: get all .js files recursively
function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getJsFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('====================================================');
console.log('🚀 Zenith Browser - Build & Obfuscation Pipeline');
console.log('====================================================');

let backupCreated = false;

try {
  // 1. Backup original src
  console.log('📦 1/4. Tạo bản sao lưu mã nguồn gốc: _src_clean_backup...');
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  copyDirSync(srcDir, backupDir);
  backupCreated = true;
  console.log('   ✅ Đã sao lưu thành công.');

  // 2. Obfuscate all JS files in src
  console.log('🔒 2/4. Đang mã hoá và làm rối mã nguồn JavaScript (Obfuscation)...');
  const jsFiles = getJsFiles(srcDir);
  let obfuscatedCount = 0;

  for (const file of jsFiles) {
    const relativePath = path.relative(srcDir, file);
    console.log(`   ⚙️ Đang làm rối: src/${relativePath}`);
    const code = fs.readFileSync(file, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions);
    fs.writeFileSync(file, obfuscationResult.getObfuscatedCode(), 'utf8');
    obfuscatedCount++;
  }
  console.log(`   ✅ Đã mã hoá thành công ${obfuscatedCount} tệp JavaScript trong src/!`);

  // 3. Run electron-builder
  console.log('📦 3/4. Đang đóng gói ứng dụng với Electron Builder...');
  execSync('npx electron-builder --win', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('   🎉 Đóng gói thành công!');

  // Dọn dẹp chỉ để lại DUY NHẤT 1 file Setup.exe cho người dùng gửi
  console.log('🧹 Dọn dẹp thư mục release để giữ đúng 1 file cài đặt duy nhất...');
  const releaseDir = path.join(rootDir, 'release');
  if (fs.existsSync(releaseDir)) {
    const entries = fs.readdirSync(releaseDir, { withFileTypes: true });
    for (const item of entries) {
      const fullPath = path.join(releaseDir, item.name);
      if (item.name === 'Zenith-Browser-Setup.exe') continue;
      try {
        if (item.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {}
    }
  }
  console.log('   ✅ Đã dọn dẹp sạch sẽ. Thư mục release/ chỉ còn DUY NHẤT 1 file Zenith-Browser-Setup.exe!');

} catch (err) {
  console.error('❌ LỖI TRONG QUÁ TRÌNH BUILD:', err);
  process.exitCode = 1;
} finally {
  // 4. Restore original src
  if (backupCreated && fs.existsSync(backupDir)) {
    console.log('🔄 4/4. Đang khôi phục mã nguồn gốc src/ để tiếp tục phát triển...');
    try {
      if (fs.existsSync(srcDir)) {
        fs.rmSync(srcDir, { recursive: true, force: true });
      }
      copyDirSync(backupDir, srcDir);
      fs.rmSync(backupDir, { recursive: true, force: true });
      console.log('   ✅ Mã nguồn gốc src/ đã được phục hồi nguyên vẹn 100%.');
    } catch (restoreErr) {
      console.error('⚠️ Lỗi khi khôi phục thư mục src từ bản sao lưu:', restoreErr);
      console.error(`Thư mục backup vẫn còn tại: ${backupDir}`);
    }
  }
  console.log('====================================================');
}
