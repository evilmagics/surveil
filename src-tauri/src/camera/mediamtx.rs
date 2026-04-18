use serde_json::json;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex as AsyncMutex;
use tracing::{error, info, warn};

use crate::transport::mediamtx_config::generate_config;

/// Finds the mediamtx binary path.
/// Checks the directory of the current executable first (bundled sidecar),
/// then falls back to the system PATH.
fn find_binary() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Tauri places sidecar binaries alongside the executable.
            // In dev mode, Tauri resolves them from src-tauri/bin with platform suffix.
            // In release, the suffix is stripped by the bundler.
            let candidates = if cfg!(target_os = "windows") {
                vec![
                    dir.join("mediamtx.exe"),
                    // Dev mode: Tauri resolves to target triple suffix
                    dir.join("mediamtx-x86_64-pc-windows-msvc.exe"),
                ]
            } else if cfg!(target_os = "macos") {
                vec![
                    dir.join("mediamtx"),
                    dir.join("mediamtx-aarch64-apple-darwin"),
                    dir.join("mediamtx-x86_64-apple-darwin"),
                ]
            } else {
                vec![
                    dir.join("mediamtx"),
                    dir.join("mediamtx-x86_64-unknown-linux-gnu"),
                ]
            };

            for candidate in &candidates {
                if candidate.exists() {
                    return candidate.clone();
                }
            }
        }
    }

    // Fallback: hope it's in system PATH
    PathBuf::from(if cfg!(target_os = "windows") { "mediamtx.exe" } else { "mediamtx" })
}

/// Resolves the app data directory where mediamtx.yml will be written.
pub fn get_data_dir() -> PathBuf {
    // Use the app's local data directory; fallback to cwd
    if let Some(data_dir) = dirs::data_local_dir() {
        let app_dir = data_dir.join("surveil");
        let _ = std::fs::create_dir_all(&app_dir);
        app_dir
    } else {
        std::env::current_dir().unwrap_or_default()
    }
}

/// Shared handle to the running MediaMTX child process.
/// Wrapped in Arc<Mutex> so it can be stored in AppState and killed on shutdown.
pub type MtxHandle = Arc<AsyncMutex<Option<Child>>>;

/// Starts the MediaMTX sidecar process with a generated config file.
/// Returns an Arc<Mutex<Option<Child>>> handle for lifecycle management.
pub async fn start_mediamtx() -> MtxHandle {
    let handle: MtxHandle = Arc::new(AsyncMutex::new(None));

    let data_dir = get_data_dir();
    let config_path = match generate_config(&data_dir) {
        Ok(p) => p,
        Err(e) => {
            error!("Failed to generate mediamtx config: {}", e);
            return handle;
        }
    };

    let bin = find_binary();
    info!("Starting MediaMTX: {:?} with config: {:?}", bin, config_path);

    let mut cmd = Command::new(&bin);
    cmd.arg(config_path.to_str().unwrap_or("mediamtx.yml"));
    cmd.stdout(std::process::Stdio::null());
    cmd.stderr(std::process::Stdio::null());
    cmd.kill_on_drop(true);

    match cmd.spawn() {
        Ok(child) => {
            info!("MediaMTX started (PID: {:?})", child.id());
            *handle.lock().await = Some(child);

            // Give MTX a moment to bind its ports before we send API calls
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
        }
        Err(e) => {
            error!(
                "Failed to start MediaMTX binary at {:?}: {}. \
                 Make sure 'bun run setup-bins' has been executed.",
                bin, e
            );
        }
    }

    handle
}

/// Stops the MediaMTX sidecar process gracefully.
pub async fn stop_mediamtx(handle: &MtxHandle) {
    let mut guard = handle.lock().await;
    if let Some(child) = guard.as_mut() {
        let _ = child.kill().await;
        info!("MediaMTX stopped.");
    }
    *guard = None;
}

// ─── MediaMTX REST API helpers ────────────────────────────────────────────────

const MTX_API: &str = "http://127.0.0.1:9997/v3";

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default()
}

fn path_name(camera_id: i32) -> String {
    format!("cam_{}", camera_id)
}

/// Adds or updates a camera path in MediaMTX via its REST API.
/// This is idempotent — safe to call multiple times.
pub async fn upsert_camera_path(camera_id: i32, camera_url: &str) -> Result<(), String> {
    let client = http_client();
    let name = path_name(camera_id);

    let payload = json!({
        "source":               camera_url,
        "sourceOnDemand":       true,
        // Force TCP transport for the RTSP pull.
        // UDP risks out-of-order / dropped RTP packets which corrupt H.264
        // reference frames and produce the "ghost frame" / frame bleed artifact.
        "sourceProtocol":       "tcp",
        // When a new WebRTC reader connects, MTX will wait until it has buffered
        // a complete GOP (Group of Pictures starting with an IDR keyframe) before
        // forwarding data. This eliminates the initial ghosting when joining mid-stream.
        "sourceAnyPortEnable":  false
    });

    // Try to add first
    let add_url = format!("{}/config/paths/add/{}", MTX_API, name);
    let res = client
        .post(&add_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("MTX API unreachable: {}", e))?;

    if res.status().is_success() {
        info!("MTX: added path '{}' (TCP, IDR-gated)", name);
        return Ok(());
    }

    // 400/409 → path already exists, patch it instead
    let patch_url = format!("{}/config/paths/patch/{}", MTX_API, name);
    let res2 = client
        .patch(&patch_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("MTX PATCH error: {}", e))?;

    if res2.status().is_success() {
        info!("MTX: patched path '{}'", name);
        Ok(())
    } else {
        warn!(
            "MTX could not add or patch path '{}': HTTP {}",
            name,
            res2.status()
        );
        Ok(())
    }
}

/// Removes a camera path from MediaMTX, stopping any active stream for that camera.
pub async fn remove_camera_path(camera_id: i32) -> Result<(), String> {
    let client = http_client();
    let name = path_name(camera_id);
    let url = format!("{}/config/paths/delete/{}", MTX_API, name);

    match client.delete(&url).send().await {
        Ok(res) if res.status().is_success() => {
            info!("MTX: removed path '{}'", name);
            Ok(())
        }
        Ok(res) => {
            warn!("MTX delete path '{}' returned {}", name, res.status());
            Ok(()) // Non-critical
        }
        Err(e) => {
            warn!("MTX delete path '{}' failed: {}", name, e);
            Ok(()) // Non-critical
        }
    }
}
