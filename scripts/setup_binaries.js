import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const BIN_DIR = path.join(ROOT_DIR, 'src-tauri', 'bin');

// Always use a stable release version of MediaMTX
const MEDIAMTX_VERSION = 'v1.11.0';

const targetMap = {
    'x86_64-pc-windows-msvc': { os: 'windows', arch: 'amd64', ext: 'zip', exeExt: '.exe' },
    'aarch64-pc-windows-msvc': { os: 'windows', arch: 'arm64', ext: 'zip', exeExt: '.exe' },
    'x86_64-apple-darwin': { os: 'darwin', arch: 'amd64', ext: 'tar.gz', exeExt: '' },
    'aarch64-apple-darwin': { os: 'darwin', arch: 'arm64', ext: 'tar.gz', exeExt: '' },
    'x86_64-unknown-linux-gnu': { os: 'linux', arch: 'amd64', ext: 'tar.gz', exeExt: '' },
    'aarch64-unknown-linux-gnu': { os: 'linux', arch: 'arm64', ext: 'tar.gz', exeExt: '' },
};

function getHostTarget() {
    // Attempt to get the target native to the current Rust installation
    try {
        const output = execSync('rustc -vV', { encoding: 'utf-8' });
        const match = output.match(/host: (.+)/);
        if (match && match[1]) {
            return match[1].trim();
        }
    } catch (e) {
        console.warn('Failed to detect target via rustc, using Node.js process info fallback.');
    }
    
    // Fallback using Node.js process variables
    const arch = process.arch === 'x64' ? 'x86_64' : (process.arch === 'arm64' ? 'aarch64' : process.arch);
    const platform = process.platform;
    if (platform === 'win32') return `${arch}-pc-windows-msvc`;
    if (platform === 'darwin') return `${arch}-apple-darwin`;
    if (platform === 'linux') return `${arch}-unknown-linux-gnu`;
    
    throw new Error(`Unsupported OS/Arch: ${platform} / ${arch}`);
}

async function downloadFile(url, destPath) {
    console.log(`Downloading ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    console.log(`Saved to ${destPath}`);
}

function extractFile(filePath, extractDir) {
    console.log(`Extracting ${filePath} to ${extractDir}...`);
    if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
    }
    // Using Windows 10+ / Linux / macOS built-in tar command 
    // Works for both .zip and .tar.gz in modern OSes
    execSync(`tar -xf "${filePath}" -C "${extractDir}"`, { stdio: 'inherit' });
}

async function main() {
    const args = process.argv.slice(2);
    let targetParamIndex = args.indexOf('--target');
    let targets = [];

    if (targetParamIndex !== -1 && args[targetParamIndex + 1]) {
        // e.g. "x86_64-pc-windows-msvc,aarch64-apple-darwin"
        targets = args[targetParamIndex + 1].split(',').map(t => t.trim());
    } else {
        targets = [getHostTarget()];
    }

    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    const tempDir = path.join(ROOT_DIR, 'temp', 'downloads');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    for (const target of targets) {
        console.log(`\n--- Setting up MediaMTX for target: ${target} ---`);
        const config = targetMap[target];
        if (!config) {
            console.error(`Unknown target triple: ${target}. Skipping.`);
            continue;
        }

        const fileName = `mediamtx_${MEDIAMTX_VERSION}_${config.os}_${config.arch}.${config.ext}`;
        const downloadUrl = `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/${fileName}`;
        const archivePath = path.join(tempDir, fileName);
        const extractPath = path.join(tempDir, `mediamtx_${target}`);

        try {
            if (!fs.existsSync(archivePath)) {
                await downloadFile(downloadUrl, archivePath);
            } else {
                console.log(`Archive already exists at ${archivePath}, skipping download.`);
            }

            extractFile(archivePath, extractPath);

            const sourceExe = path.join(extractPath, `mediamtx${config.exeExt}`);
            // Tauri sidecar naming convention: name-target_triple[.exe]
            const destExeName = `mediamtx-${target}${config.exeExt}`;
            const destExePath = path.join(BIN_DIR, destExeName);

            fs.copyFileSync(sourceExe, destExePath);
            fs.chmodSync(destExePath, 0o755); // Ensure executable permissions

            console.log(`✅ Successfully installed: ${destExePath}`);

        } catch (err) {
            console.error(`❌ Failed to setup target ${target}:`, err.message);
        }
    }

    console.log(`\nAll sidecar operations completed.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
