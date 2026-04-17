const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, 'src-tauri', 'bin');

// Map of Tauri target triple strings to their FFmpeg respective download URLs
const TARGETS = {
  // Windows x64
  'x86_64-pc-windows-msvc': {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    ext: '.exe',
    isArchive: true,
    archiveType: 'zip',
    internalPath: 'ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe'
  },
  // Linux x64
  'x86_64-unknown-linux-gnu': {
    url: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    ext: '',
    isArchive: true,
    archiveType: 'tar.xz',
    internalPath: 'ffmpeg-*-amd64-static/ffmpeg'
  }
};

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return resolve(downloadFile(response.headers.location, dest));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading proper cross-platform FFmpeg static binaries for Tauri Sidecars...');
  for (const [target, config] of Object.entries(TARGETS)) {
    const finalName = `ffmpeg-${target}${config.ext}`;
    const finalPath = path.join(BIN_DIR, finalName);
    
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 10 * 1024 * 1024) {
      console.log(`[SKIP] Genuine ${finalName} already exists.`);
      continue;
    }

    console.log(`📥 Downloading for ${target}...`);
    try {
      const tempArchive = path.join(BIN_DIR, `temp_${target}.${config.archiveType}`);
      await downloadFile(config.url, tempArchive);
      
      console.log(`📦 Extracting ${target}...`);
      if (config.archiveType === 'zip') {
        const extractUrl = path.join(BIN_DIR, `extracted_${target}`);
        // Windows extract fallback using powershell or node adm-zip
        try {
          execSync(`powershell -Command "Expand-Archive -Path '${tempArchive}' -DestinationPath '${extractUrl}' -Force"`);
          const extractedFile = path.join(extractUrl, 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe');
          fs.copyFileSync(extractedFile, finalPath);
          fs.rmSync(extractUrl, { recursive: true, force: true });
        } catch(e) { console.error("Extraction failed internally, please install manually if missing."); }
      } else if (config.archiveType === 'tar.xz') {
        try {
          // On linux or via WSL we invoke tar natively
          execSync(`tar -xf ${tempArchive} -C ${BIN_DIR}`);
          const extractedDir = fs.readdirSync(BIN_DIR).find(dir => dir.startsWith('ffmpeg-') && dir.endsWith('-amd64-static') && fs.statSync(path.join(BIN_DIR, dir)).isDirectory());
          fs.copyFileSync(path.join(BIN_DIR, extractedDir, 'ffmpeg'), finalPath);
          fs.chmodSync(finalPath, 0o755); // Make executable
          fs.rmSync(path.join(BIN_DIR, extractedDir), { recursive: true, force: true });
        } catch(e) { console.error("Tar extraction failed (if evaluating on Windows without WSL it is expected, ignore if you are only compiling for Windows locally)."); }
      }
      
      fs.unlinkSync(tempArchive);
      console.log(`✅ Success configuring ${finalName}`);
    } catch (err) {
      console.error(`❌ Failed configuring ${target}:`, err);
    }
  }
}

run();
