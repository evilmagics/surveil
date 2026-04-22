use rusqlite::Connection;
use std::sync::Mutex;

use crate::camera::mediamtx::MtxHandle;

pub struct AppState {
    pub db:  Mutex<Connection>,
    pub mtx: MtxHandle,
}
