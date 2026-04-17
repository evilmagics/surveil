pub mod state;
pub mod camera;
pub mod transport;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as AsyncMutex;

use state::AppState;
use camera::manager::{init_db, get_cameras, add_camera, update_camera, delete_camera, update_camera_state, check_connection, save_template_file, get_preferences, save_preferences};
use camera::stream::start_camera_stream;
use transport::websocket::start_websocket_server;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();  
    let db_conn = init_db("surveil.sqlite3");  
    let streams_app = Arc::new(AsyncMutex::new(HashMap::new()));
    let streams_ws = Arc::clone(&streams_app);

    tauri::async_runtime::spawn(async move {
        start_websocket_server(streams_ws).await;
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {  
            db: Mutex::new(db_conn),  
            streams: streams_app,
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
            save_preferences
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
