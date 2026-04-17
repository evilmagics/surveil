use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex as AsyncMutex};
use tokio::net::TcpListener;  
use tokio_tungstenite::accept_async;  
use tokio_tungstenite::tungstenite::Message;
use futures_util::{StreamExt, SinkExt};
use tracing::info;

pub async fn start_websocket_server(streams: Arc<AsyncMutex<HashMap<i32, broadcast::Sender<Arc<Vec<u8>>>>>>) {  
    let addr = "127.0.0.1:8080";  
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind WebSocket server");  
    info!("Localhost Video WebSocket Server listening on: {}", addr);

    while let Ok((stream, _)) = listener.accept().await {  
        let streams_ref = streams.clone();
        tokio::spawn(async move {  
            if let Ok(ws_stream) = accept_async(stream).await {  
                let (mut sender, mut receiver) = ws_stream.split();
                
                if let Some(Ok(msg)) = receiver.next().await {
                    if let Message::Text(text) = msg {
                        if let Some(id_str) = text.strip_prefix("cam_id:") {
                            if let Ok(cam_id) = id_str.parse::<i32>() {
                                info!("WS Client connected to camera id: {}", cam_id);
                                let mut rx = {
                                    let streams_lock = streams_ref.lock().await;
                                    if let Some(tx) = streams_lock.get(&cam_id) {
                                        Some(tx.subscribe())
                                    } else {
                                        None
                                    }
                                };
                                
                                if let Some(mut rx) = rx {
                                    loop {
                                        match rx.recv().await {
                                            Ok(frame) => {
                                                if sender.send(Message::Binary(frame.to_vec())).await.is_err() {
                                                    info!("WS Client disconnected from camera id: {}", cam_id);
                                                    break;
                                                }
                                            }
                                            Err(broadcast::error::RecvError::Lagged(n)) => {
                                                tracing::warn!("Stream lagged for cam {}: skipping {} frames", cam_id, n);
                                                continue;
                                            }
                                            Err(broadcast::error::RecvError::Closed) => {
                                                info!("Stream closed for cam {}", cam_id);
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    let _ = sender.send(Message::Text("Error: Stream not found".into())).await;
                                }
                            }
                        }
                    }
                }
            }  
        });  
    }  
}
