# Troubleshooting & FAQ

Use this page if you encounter issues while running or using Surveil.

## 🛠️ Common Issues (Troubleshooting)

### 1. MediaMTX Fails to Run
**Symptom:** Cameras always show a "Disconnected" status and no stream appears.
**Solution:**
- Ensure you have run `bun run setup-bins` to download the sidecar binary.
- Check if default MediaMTX ports (such as 8554, 8888, 8889) are being used by another application.
- Check the terminal logs (while running `bun tauri dev`) to see error messages from the MediaMTX child process.

### 2. Error 999 (Internal Server Error)
**Symptom:** An error popup appears when attempting to register or add a camera.
**Solution:**
- This usually occurs because the SQLite database is locked or the data folder does not have write permissions.
- Ensure the application folder has sufficient Read/Write permissions.
- Try restarting the application to release any hanging database connections.

### 3. Stream Feels Laggy (High Latency)
**Symptom:** Video is delayed by several seconds from real-time events.
**Solution:**
- Use a wired (Ethernet) connection rather than Wi-Fi for both the cameras and the server computer.
- Check the CPU load; processing many simultaneous streams requires significant resources.
- Adjust the *buffer* settings on your IP camera if possible.

---

## ❓ FAQ (Frequently Asked Questions)

**Q: Where is my camera data stored?**
A: All data is stored locally in a SQLite file on your computer. We do not send camera credentials to any external servers.

**Q: Does Surveil support Cloud Recording?**
A: Currently, Surveil focuses on local management. However, since it uses MediaMTX, you can manually configure MediaMTX to forward streams to a cloud provider if needed.

**Q: How do I update the application?**
A: If running from source code, perform a `git pull` and run `bun install` and `bun run setup-bins` again to ensure all binaries and dependencies are updated.

**Q: Can I run Surveil without internet?**
A: Yes. Once the installation and binary setup phases are complete, the application can run entirely offline on your local network.

**Q: Which protocols are supported?**
A: Through MediaMTX, Surveil technically supports RTSP, RTMP, HLS, and WebRTC. However, the UI is currently optimized for RTSP input.
