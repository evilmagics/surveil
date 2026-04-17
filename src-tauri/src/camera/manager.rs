use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::info;
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]  
pub struct Camera {  
    pub id: Option<i32>,  
    pub name: String,  
    pub url: String,  
    pub labels: Vec<String>,  
    pub status: String,  
    pub resolution: String,  
    pub fps: i32,  
    pub codec: String,  
    pub protocol: String,  
    pub created_at: Option<String>,
    pub last_connected_at: Option<String>,
    pub updated_at: Option<String>,
}

pub fn init_db(db_path: &str) -> Connection {  
    let conn = Connection::open(db_path).expect("Gagal membuka SQLite");  
    conn.execute(  
        "CREATE TABLE IF NOT EXISTS cameras (  
            id INTEGER PRIMARY KEY,  
            name TEXT NOT NULL,  
            url TEXT NOT NULL,  
            labels TEXT,  
            status TEXT,  
            resolution TEXT,  
            fps INTEGER,  
            codec TEXT,  
            protocol TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_connected_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",  
        [],  
    ).expect("Gagal membuat tabel database");  
    
    // Auto migration (ignore errors if columns exist)
    let _ = conn.execute("ALTER TABLE cameras ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP", []);
    let _ = conn.execute("ALTER TABLE cameras ADD COLUMN last_connected_at TEXT", []);
    let _ = conn.execute("ALTER TABLE cameras ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS preferences (  
            key TEXT PRIMARY KEY,  
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",  
        [],  
    ).expect("Gagal membuat tabel preferences");
    
    let _ = conn.execute("ALTER TABLE preferences ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP", []);

    conn  
}

#[tauri::command]  
pub fn get_cameras(state: State<'_, AppState>) -> Result<Vec<Camera>, String> {  
    let conn = state.db.lock().map_err(|_| "Gagal mengunci database".to_string())?;  
      
    let mut stmt = conn.prepare("SELECT id, name, url, labels, status, resolution, fps, codec, protocol, created_at, last_connected_at, updated_at FROM cameras").map_err(|e| e.to_string())?;  
      
    let camera_iter = stmt.query_map([], |row| {  
        let labels_str: String = row.get(3)?;  
        let labels: Vec<String> = serde_json::from_str(&labels_str).unwrap_or_default();  
          
        Ok(Camera {  
            id: Some(row.get(0)?),  
            name: row.get(1)?,  
            url: row.get(2)?,  
            labels,  
            status: row.get(4)?,  
            resolution: row.get(5)?,  
            fps: row.get(6)?,  
            codec: row.get(7)?,  
            protocol: row.get(8)?,  
            created_at: row.get(9).ok(),
            last_connected_at: row.get(10).ok(),
            updated_at: row.get(11).ok(),
        })  
    }).map_err(|e| e.to_string())?;

    let mut cameras = Vec::new();  
    for cam in camera_iter {  
        cameras.push(cam.unwrap());  
    }  
      
    info!("Berhasil memuat {} kamera dari database", cameras.len());  
    Ok(cameras)  
}

#[tauri::command]  
pub fn add_camera(camera: Camera, state: State<'_, AppState>) -> Result<Camera, String> {  
    let conn = state.db.lock().map_err(|_| "Gagal mengunci database".to_string())?;  
    let labels_json = serde_json::to_string(&camera.labels).unwrap_or("[]".to_string());  
      
    conn.execute(  
        "INSERT INTO cameras (name, url, labels, status, resolution, fps, codec, protocol, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",  
        params![camera.name, camera.url, labels_json, camera.status, camera.resolution, camera.fps, camera.codec, camera.protocol],  
    ).map_err(|e| e.to_string())?;  
      
    Ok(camera)  
}

#[tauri::command]  
pub fn update_camera(id: i32, camera: Camera, state: State<'_, AppState>) -> Result<Camera, String> {  
    let conn = state.db.lock().map_err(|_| "Gagal mengunci database".to_string())?;  
    let labels_json = serde_json::to_string(&camera.labels).unwrap_or("[]".to_string());  
      
    conn.execute(  
        "UPDATE cameras SET name=?, url=?, labels=?, resolution=?, fps=?, codec=?, protocol=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",  
        params![camera.name, camera.url, labels_json, camera.resolution, camera.fps, camera.codec, camera.protocol, id],  
    ).map_err(|e| e.to_string())?;  
      
    Ok(camera)  
}

#[tauri::command]  
pub fn delete_camera(id: i32, state: State<'_, AppState>) -> Result<bool, String> {  
    let conn = state.db.lock().map_err(|_| "Gagal mengunci database".to_string())?;  
    conn.execute("DELETE FROM cameras WHERE id=?", params![id]).map_err(|e| e.to_string())?;  
    Ok(true)  
}

#[tauri::command]  
pub fn update_camera_state(id: i32, status: String, state: State<'_, AppState>) -> Result<bool, String> {  
    let conn = state.db.lock().map_err(|_| "Gagal mengunci database".to_string())?;  
    if status == "connected" {
        conn.execute("UPDATE cameras SET status=?, last_connected_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", params![status, id]).map_err(|e| e.to_string())?;  
    } else {
        conn.execute("UPDATE cameras SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", params![status, id]).map_err(|e| e.to_string())?;  
    }
    Ok(true)  
}

#[tauri::command]
pub fn save_template_file(content: String, filename: String) -> Result<String, String> {
    use rfd::FileDialog;
    use std::io::Write;
    
    if let Some(path) = FileDialog::new()
        .set_file_name(&filename)
        .save_file() {
            let mut file = std::fs::File::create(path.as_path()).map_err(|e| e.to_string())?;
            file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
            return Ok(path.to_string_lossy().to_string());
        }
    Err("User cancelled template save.".to_string())
}

#[tauri::command]
pub fn get_preferences(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|_| "Gagal mengunci".to_string())?;
    let mut stmt = conn.prepare("SELECT key, value FROM preferences").unwrap();
    let mut prefs = serde_json::Map::new();
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).unwrap();
    for row in rows {
        if let Ok((k, v)) = row {
            if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&v) {
                prefs.insert(k, json_val);
            } else {
                prefs.insert(k, serde_json::Value::String(v));
            }
        }
    }
    let res = serde_json::Value::Object(prefs);
    if res.as_object().unwrap().is_empty() {
        // give defaults
        return Ok(serde_json::json!({
            "showName": false,
            "showSource": false,
            "showTags": false,
            "theme": "dark",
            "columns": "3",
            "monitoringMode": false,
            "autoRetry": true,
            "highQuality": false
        }));
    }
    Ok(res)
}

#[tauri::command]
pub fn save_preferences(prefs: serde_json::Value, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|_| "Gagal.".to_string())?;
    if let Some(map) = prefs.as_object() {
        for (k, v) in map {
            let val_str = if v.is_string() {
                v.as_str().unwrap().to_string()
            } else {
                v.to_string()
            };
            conn.execute(
                "INSERT INTO preferences (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=?2, updated_at=CURRENT_TIMESTAMP",
                params![k, val_str]
            ).map_err(|e| e.to_string())?;
        }
    }
    Ok(true)
}

#[tauri::command]  
pub async fn check_connection(url: String) -> Result<serde_json::Value, String> {  
    use tokio::time::{timeout, Duration};
    use tokio::process::Command;

    // Opsi ffprobe: quiet, json format, stream n format info, tcp rtsp
    let mut cmd = Command::new("ffprobe");
    
    if url.starts_with("rtsp") {
        cmd.arg("-rtsp_transport").arg("tcp");
    }
    
    cmd.arg("-v").arg("quiet")
       .arg("-print_format").arg("json")
       .arg("-show_streams")
       .arg("-show_format")
       // Agar tidak hang terlalu lama dari buffer RTSP:
       .arg("-timeout").arg("5000000") // 5 seconds microsecond timeout
       .arg("-probesize").arg("5000000") 
       .arg("-analyzeduration").arg("5000000") 
       .arg(&url);

    // Paksa hentikan proses jika macet lebih dari 8 detik (Network Dead)
    let output_result = timeout(Duration::from_secs(8), cmd.output()).await;

    let output = match output_result {
        Ok(Ok(out)) => out,
        Ok(Err(e)) => {
            return Err(format!("ffprobe gagal dijalankan (pastikan ffprobe sudah diinstal dan masuk ke environment PATH): {}", e));
        }
        Err(_) => {
            return Err("Koneksi timeout (8 detik tidak ada sambungan jaringan RTSP/HTTP).".to_string());
        }
    };

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Koneksi ditolak atau URL salah. Detail: {}", err_msg));
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout_str).map_err(|e| format!("Gagal mempasing JSON FFprobe: {}", e))?;

    let streams = parsed.get("streams").and_then(|s| s.as_array());
    if streams.is_none() || streams.unwrap().is_empty() {
        return Err("Kamera terhubung namun tidak memancarkan satupun stream video.".to_string());
    }

    let streams = streams.unwrap();
    // Prioritaskan mencari tipe video
    let mut video_stream = streams.iter().find(|s| s.get("codec_type").and_then(|c| c.as_str()) == Some("video"));
    
    // Fallback ambil stream apa saja jika tidak ada tag video
    if video_stream.is_none() {
        video_stream = Some(&streams[0]);
    }
    let vs = video_stream.unwrap();

    let width = vs.get("width").and_then(|v| v.as_i64()).unwrap_or(0);
    let height = vs.get("height").and_then(|v| v.as_i64()).unwrap_or(0);
    let codec = vs.get("codec_name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_uppercase();
    
    // FPS dari "r_frame_rate" bentuk pecahan misalnya "30/1" atau "60000/1001"
    let mut fps = 0;
    if let Some(r_fps) = vs.get("r_frame_rate").and_then(|v| v.as_str()) {
        let parts: Vec<&str> = r_fps.split('/').collect();
        if parts.len() == 2 {
            let num: i32 = parts[0].parse().unwrap_or(0);
            let den: i32 = parts[1].parse().unwrap_or(1);
            if den > 0 {
                fps = num / den;
            }
        }
    }

    let protocol = if url.starts_with("rtsp") { "RTSP" } else if url.starts_with("http") { "HTTP" } else { "Unknown" };

    Ok(serde_json::json!({
        "resolution": format!("{}x{}", width, height),
        "fps": fps,
        "codec": codec,
        "protocol": protocol,
        "status": "connected"
    }))
}
