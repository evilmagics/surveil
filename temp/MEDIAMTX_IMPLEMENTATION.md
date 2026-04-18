# Roadmap Implementasi MediaMTX (Optimasi Resource)

Dokumen ini menjelaskan langkah-langkah teknis untuk mengganti arsitektur streaming dari 1-FFmpeg-per-kamera menjadi 1-MediaMTX-proxy untuk efisiensi RAM dan CPU.

## 1. Persiapan Binary (Sidecar)
- [x] Unduh binary MediaMTX untuk platform yang didukung:
  - `mediamtx-x86_64-pc-windows-msvc.exe` (Windows)
  - `mediamtx-x86_64-unknown-linux-gnu` (Linux)
  - `mediamtx-aarch64-apple-darwin` (macOS)
- [x] Letakkan binary di `src-tauri/bin/` dengan penamaan sesuai standar Tauri sidecar.
- [x] Update `src-tauri/tauri.conf.json` pada bagian `externalBin` untuk menyertakan `mediamtx`.

## 2. Backend Rust: Lifecycle & Config Manager
- [x] **Config Generator**:
  - Modul `src-tauri/src/transport/mediamtx_config.rs`.
  - Generate `mediamtx.yml` ke app data dir saat startup.
  - Aktifkan `sourceOnDemand: yes` per path → penghematan resource maksimal.
  - Aktifkan REST API (`api: yes`) di port 9997.
  - Aktifkan WebRTC/WHEP di port 8889.
  - Nonaktifkan RTMP, HLS, SRT yang tidak dipakai.
- [x] **Process Manager**:
  - Modul `src-tauri/src/camera/mediamtx.rs`.
  - `start_mediamtx()` → binary dijalankan dengan config file, `kill_on_drop(true)`.
  - `MtxHandle` (Arc<Mutex<Option<Child>>>) disimpan di `AppState.mtx`.
  - Proses di-start dengan `block_on()` sebelum Tauri window muncul.
- [x] **Hot Reload Integration**:
  - `upsert_camera_path(camera_id, url)` → POST/PATCH `/v3/config/paths/add/{name}`.
  - `remove_camera_path(camera_id)` → DELETE `/v3/config/paths/delete/{name}`.
  - Dipanggil otomatis di `add_camera`, `update_camera`, `delete_camera`.
  - Path name convention: `cam_{id}` (matching frontend WHEP URL).

## 3. Frontend React: Migrasi Player
- [x] **WebRTC (WHEP) Integration**:
  - `LiveStreamVideo.jsx` menggunakan `RTCPeerConnection`.
  - SDP negotiation ke `http://127.0.0.1:8889/cam_{id}/whep`.
  - Track di-tambah manual ke `MediaStream` (workaround MTX streams array).
  - Error state overlay ditampilkan jika koneksi gagal.
  - Stall monitor: deteksi freeze via `getStats()` bytes counter.
  - Cleanup: `srcObject = null` saat unmount → bebaskan GPU resource.
- [x] **Cleanup**:
  - Logic WebSocket dihapus dari frontend sepenuhnya.
  - Logic buffer/canvas draw dihapus (`LiveStreamCanvas` → `LiveStreamVideo`).

## 4. Pembersihan Arsitektur Lama
- [x] `stream.rs` dibersihkan — tidak lagi spawn FFmpeg, hanya call `upsert_camera_path`.
- [x] `state.rs` dibersihkan — `streams: Arc<Mutex<HashMap>>` dihapus, diganti `mtx: MtxHandle`.
- [x] `transport/websocket.rs` dihapus dari lib.rs (modul masih ada tapi tidak digunakan).
- [x] CSP `tauri.conf.json` diupdate untuk mengizinkan `connect-src` ke port 8889 dan 9997.

## Alur Kerja Teknis (Flow)
1. **Startup**: `lib.rs` memanggil `start_mediamtx()` → generate `mediamtx.yml` → spawn binary.
2. **Dynamic Paths**: Saat kamera ditambah/diedit, Rust hit REST API MTX untuk register path.
3. **On-Demand Connection**: Browser POST WHEP → MTX buka jalur RTSP ke WebRTC.
4. **Zero Transcoding**: MTX hanya proxy paket RTP tanpa decode/encode → RAM tetap <100MB.
5. **Hot Reload**: Edit/hapus kamera langsung PATCH/DELETE path di MTX tanpa restart.
