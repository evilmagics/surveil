use std::sync::Arc;
use tauri::State;
use tokio::sync::broadcast;
use tracing::{info, warn, error};
use crate::state::AppState;

#[tauri::command]  
pub async fn start_camera_stream(camera_url: String, camera_id: i32, fps_limit: Option<i32>, state: State<'_, AppState>) -> Result<(), String> {  
    let streams_ref = state.streams.clone();
    
    // 1. Cek apakah Stream Pipeline sudah aktif untuk kamera ini
    {
        let streams_lock = streams_ref.lock().await;
        if streams_lock.contains_key(&camera_id) {
            info!("Stream untuk camera ID {} sudah berjalan, menghubungkan ulang frontend ke sesi yang sama.", camera_id);
            return Ok(());
        }
    }

    info!("Memulai Sesi Baru: Binary MJPEG Pipeline untuk camera ID: {} dengan limit {} FPS", camera_id, fps_limit.unwrap_or(15));  
      
    let (tx, _) = broadcast::channel::<Arc<Vec<u8>>>(2); 
    
    {
        let mut streams = streams_ref.lock().await;
        streams.insert(camera_id, tx.clone());
    }

    let tx_task = tx.clone();
    
    tokio::spawn(async move {  
        loop {
            // Cross-platform sidecar logic for Tauri
            let mut ffmpeg_path = std::path::PathBuf::from("ffmpeg"); // Default to System PATH
            if let Ok(exe) = std::env::current_exe() {
                if let Some(dir) = exe.parent() {
                    let sidecar_name = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
                    let local_sidecar = dir.join(sidecar_name);
                    if local_sidecar.exists() {
                        ffmpeg_path = local_sidecar; // Tembak langsung file binary yang ter-bundle di app
                    }
                }
            }

            let fps_str = fps_limit.unwrap_or(15).to_string();

            let mut command = tokio::process::Command::new(ffmpeg_path);
            command.args([  
                "-hwaccel", "auto", // Gunakan GPU untuk decoding jika tersedia
                "-threads", "1",     // Batasi thread per proses agar tidak membebani CPU saat banyak kamera
                "-rtsp_transport", "tcp",  
                "-i", &camera_url,  
                "-vf", "scale=-1:480", // Gunakan resolusi 480p untuk penghematan resource (cukup untuk grid)
                "-c:v", "mjpeg",  
                "-r", &fps_str,
                "-q:v", "10", // Turunkan sedikit kualitas (5 -> 10) untuk menghemat bandwidth & CPU
                "-an",  
                "-f", "image2pipe",  
                "-"   
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true);

            let mut child = match command.spawn() {
                Ok(c) => c,
                Err(e) => {
                    error!("Gagal spawn ffmpeg (Kamera {}): {}", camera_id, e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    continue;
                }
            };
            
            let mut stdout = child.stdout.take().unwrap();
            let mut buffer = Vec::new();
            let mut chunk = vec![0u8; 8192 * 4];
            let mut idle_frames = 0; 

            use tokio::io::AsyncReadExt;

            loop {
                let read_res = tokio::time::timeout(tokio::time::Duration::from_secs(10), stdout.read(&mut chunk)).await;
                
                match read_res {
                    Ok(Ok(n)) if n == 0 => {
                        warn!("FFmpeg stream EOF untuk kamera ID {}", camera_id);
                        break; 
                    }
                    Ok(Ok(n)) => {  
                        buffer.extend_from_slice(&chunk[..n]);
                        
                        while let Some(start) = buffer.windows(2).position(|w| w == [0xFF, 0xD8]) {
                            if let Some(end) = buffer[start..].windows(2).position(|w| w == [0xFF, 0xD9]) {
                                let frame_end = start + end + 2;
                                let frame = buffer[start..frame_end].to_vec();
                                
                                let _ = tx_task.send(Arc::new(frame)); 
                                
                                buffer.drain(0..frame_end);

                                if tx_task.receiver_count() == 0 {
                                    idle_frames += 1;
                                    if idle_frames > 150 {
                                        info!("Garbage Collector Aktif: Kamera {} dihentikan.", camera_id);
                                        let mut s = streams_ref.lock().await;
                                        s.remove(&camera_id);
                                        return; 
                                    }
                                } else {
                                    idle_frames = 0; 
                                }
                            } else {
                                break;
                            }
                        }
                        
                        if buffer.len() > 5 * 1024 * 1024 {
                            warn!("Stream buffer terlalu rapuh/korup, membuang data..");
                            buffer.clear();
                        }
                    }
                    Ok(Err(e)) => {
                        error!("Gagal membaca paket IO dari kamera {}: {}", camera_id, e);
                        break;
                    }
                    Err(_) => {
                        warn!("Hard Timeout! Memaksa Restart Pipeline...");
                        break;
                    }
                }
            }
            
            let _ = child.kill().await;
            
            if tx_task.receiver_count() == 0 {
                info!("Kamera {} error dan tidak ada penonton lagi. Menghapus task.", camera_id);
                let mut s = streams_ref.lock().await;
                s.remove(&camera_id);
                return;
            }

            info!("Kamera {} Auto-Reconnect...", camera_id);
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
    });

    Ok(())  
}
