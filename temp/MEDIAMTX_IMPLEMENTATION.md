# Roadmap Implementasi MediaMTX (Optimasi Resource)

Dokumen ini menjelaskan langkah-langkah teknis untuk mengganti arsitektur streaming dari 1-FFmpeg-per-kamera menjadi 1-MediaMTX-proxy untuk efisiensi RAM dan CPU.

## 1. Persiapan Binary (Sidecar)
- [ ] Unduh binary MediaMTX untuk platform yang didukung:
  - `mediamtx-x86_64-pc-windows-msvc.exe` (Windows)
  - `mediamtx-x86_64-unknown-linux-gnu` (Linux)
  - `mediamtx-aarch64-apple-darwin` (macOS)
- [ ] Letakkan binary di `src-tauri/bin/` dengan penamaan sesuai standar Tauri sidecar.
- [ ] Update `src-tauri/tauri.conf.json` pada bagian `externalBin` untuk menyertakan `mediamtx`.

## 2. Backend Rust: Lifecycle & Config Manager
- [ ] **Config Generator**:
  - Buat modul `src-tauri/src/transport/mediamtx_config.rs`.
  - Implementasikan fungsi untuk men-generate `mediamtx.yml` berdasarkan daftar kamera di database.
  - Tambahkan opsi `sourceOnDemand: yes` untuk penghematan resource maksimal.
- [ ] **Process Manager**:
  - Buat modul `src-tauri/src/transport/mediamtx_runner.rs`.
  - Jalankan MediaMTX sebagai sidecar saat aplikasi start (`setup` di `main.rs`).
  - Pastikan proses MediaMTX di-kill saat aplikasi ditutup.
- [ ] **Hot Reload Integration**:
  - Saat kamera di-tambah/edit/hapus, panggil REST API MediaMTX (`/v3/config/paths/add` atau reload total) agar perubahan langsung aktif tanpa memutus stream lain.

## 3. Frontend React: Migrasi Player
- [ ] **WebRTC (WHEP) Integration**:
  - Ganti `LiveStreamCanvas` (WebSocket + Jpeg) dengan `LiveStreamVideo` (HTML5 Video Tag + RTCPeerConnection).
  - Lakukan negosiasi SDP menggunakan URL WebRTC API MediaMTX: `http://localhost:8889/{camera_id}/whep`.
  - Pasang object MediaStream ke `<video autoPlay muted playsInline />` untuk delay <0.5 detik dan Auto ICE Restart (anti-stalling).
- [ ] **Cleanup**:
  - Hapus logic WebSocket di frontend yang sudah tidak digunakan.
  - Hapus logic buffer/canvas draw yang memakan CPU di sisi klien.

## 4. Pembersihan Arsitektur Lama (Optional but Recommended)
- [ ] Nonaktifkan atau hapus API `start_camera_stream` di `stream.rs` jika semua kamera sudah bermigrasi ke MediaMTX.
- [ ] Hapus modul WebSocket di backend jika sudah tidak melayani client MJPEG.

## Alur Kerja Teknis (Flow)
1. **Startup**: Tauri memanggil `mediamtx` sidecar.
2. **Dynamic Paths**: MediaMTX membaca config awal.
3. **On-Demand Connection**: Saat user membuka tab monitoring, browser melakukan POST WHEP ke port 8889. MediaMTX mendeteksi 'demand' dan seketika membuka jalur RTSP ke WebRTC dengan Zero Transcoding (hemat memori) & Zero Latency.
4. **Efficiency**: RAM tetap stabil di kisaran <100MB meski kamera bertambah, karena tidak ada proses transcoding (decode/encode) di sisi server.
