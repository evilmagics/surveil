use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::{broadcast, Mutex as AsyncMutex};

pub struct AppState {  
    pub db: Mutex<Connection>,
    pub streams: Arc<AsyncMutex<HashMap<i32, broadcast::Sender<Arc<Vec<u8>>>>>>,
}
