use tauri::State;
use tracing::info;
use crate::state::AppState;
use crate::camera::mediamtx::upsert_camera_path;

/// Called by the frontend when a camera card becomes visible.
/// Registers the RTSP source in MediaMTX so the WHEP endpoint becomes available.
#[tauri::command]
pub async fn start_camera_stream(
    camera_url: String,
    camera_id: i32,
    _state: State<'_, AppState>,
) -> Result<(), String> {
    info!(
        "Registering camera {} with MediaMTX (sourceOnDemand) → {}",
        camera_id, camera_url
    );
    upsert_camera_path(camera_id, &camera_url).await
}
