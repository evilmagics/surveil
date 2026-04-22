pub mod state;
pub mod camera;
pub mod transport;

use std::sync::Mutex;

use state::AppState;
use camera::manager::{
    init_db, get_cameras, add_camera, update_camera, delete_camera,
    update_camera_state, check_connection, save_template_file,
    get_preferences, save_preferences,
};
use camera::stream::start_camera_stream;
use camera::mediamtx::start_mediamtx;
use tauri::{Manager, Window};

#[tauri::command]
fn show_main_window(window: Window) {
    window.show().unwrap();
}

#[tauri::command]
fn set_theater_mode(window: Window, state: bool) {
    if state {
        // High-level window manipulation for Windows compatibility
        // 1. Hide window first to 'detach' from OS snap/maximize state
        let _ = window.hide();
        let _ = window.set_fullscreen(false);
        let _ = window.unmaximize();
        
        // 2. Kill frame while hidden
        let _ = window.set_resizable(false);
        let _ = window.set_decorations(false);
        
        // 3. Enter fullscreen and restore visibility
        let _ = window.set_fullscreen(true);
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = window.hide();
        let _ = window.set_fullscreen(false);
        let _ = window.set_decorations(true);
        let _ = window.set_resizable(true);
        let _ = window.show();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    let db_conn = init_db("surveil.sqlite3");

    // Bootstrap: start MediaMTX before the Tauri window opens.
    // We block on the async startup here so MTX is ready before the first frame.
    let mtx_handle = tauri::async_runtime::block_on(start_mediamtx());

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            db:  Mutex::new(db_conn),
            mtx: mtx_handle,
        })
        .invoke_handler(tauri::generate_handler![
            get_cameras,
            add_camera,
            update_camera,
            delete_camera,
            update_camera_state,
            check_connection,
            start_camera_stream,
            save_template_file,
            get_preferences,
            save_preferences,
            show_main_window,
            set_theater_mode,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            tracing::info!("Shutting down... Cleaning up background processes and states.");
            // Karena dipanggil di dalam sync context, kita bisa block_on child kill
            let state = app_handle.state::<AppState>();
            
            tauri::async_runtime::block_on(async {
                let mut guard = state.mtx.lock().await;
                if let Some(child) = guard.as_mut() {
                    let _ = child.kill().await;
                    tracing::info!("MediaMTX stopped gracefully.");
                }
            });

            let _ = state.db.lock().map(|conn| {
                let _ = conn.execute("UPDATE cameras SET status = 'disconnected'", []);
                tracing::info!("Semua sumber kamera diset menjadi disconnected pada saat exit.");
            });
        }
    });
}
