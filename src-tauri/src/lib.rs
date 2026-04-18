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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    let db_conn = init_db("surveil.sqlite3");

    // Bootstrap: start MediaMTX before the Tauri window opens.
    // We block on the async startup here so MTX is ready before the first frame.
    let mtx_handle = tauri::async_runtime::block_on(start_mediamtx());

    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
