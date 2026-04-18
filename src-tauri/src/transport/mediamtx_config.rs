use std::path::PathBuf;
use tracing::info;

/// Generates a minimal mediamtx.yml config file in the app data dir.
/// Returns the path to the generated file.
pub fn generate_config(data_dir: &PathBuf) -> Result<PathBuf, String> {
    let config_path = data_dir.join("mediamtx.yml");

    let config_content = r#"# Surveil - MediaMTX Auto-Generated Config
# DO NOT EDIT - This file is regenerated on each app start.

# Logging
logLevel: warn
logDestinations: [stdout]

# Metrics & API
metrics: no
pprof: no
api: yes
apiAddress: :9997

# Disable unused protocols to save resources
rtmp: no
hls: no
srt: no

# RTSP - input protocol from IP cameras
rtsp: yes
rtspAddress: :8554

# Force TCP for RTSP input.
# UDP is faster but causes packet loss on heavily loaded networks → frame artifacts.
# TCP guarantees ordered delivery → eliminates missing-packet-induced ghosting.
protocols: [tcp]

# WebRTC - WHEP output to browser
webrtc: yes
webrtcAddress: :8889

# Increase RTP buffer to handle burst traffic from high-resolution cameras.
# Default 512 is too small for 1080p+ streams, causing packet drops → artifacts.
# 4096 bufs = ~6MB at 1500B/packet — safe for multi-camera setups.
readBufferCount: 4096

# ICE servers not needed for local loopback connections
webrtcICEServers2: []

# Default path settings (applied to all paths)
pathDefaults:
  # Only pull from source when there is an active viewer (saves CPU/RAM)
  sourceOnDemand: yes
  # Allow up to 10s for the RTSP source to send the first IDR keyframe
  # before any WebRTC client receives data. This prevents initial ghosting.
  sourceOnDemandStartTimeout: 10s
  # Close RTSP connection 60s after the last viewer disconnects
  sourceOnDemandCloseAfter: 60s

  # Disable recording
  record: no

  # ── Optional: Enable FFmpeg re-encode for cameras with B-frame artifacts ──
  # If a specific camera produces ghosting, override its path in the app config
  # to use a re-encoded RTSP source piped through FFmpeg:
  #
  #   runOnPublish: >-
  #     ffmpeg -hide_banner -loglevel error
  #     -rtsp_transport tcp -i rtsp://CAMERA_IP:PORT/stream
  #     -c:v libx264 -profile:v baseline -level:v 3.1
  #     -g 30 -keyint_min 15 -sc_threshold 0
  #     -c:a aac -f rtsp rtsp://127.0.0.1:8554/$MTX_PATH
  #   runOnPublishRestart: yes
  #
  # This converts Main/High-profile H.264 (with B-frames) to Baseline (no B-frames)
  # at the cost of ~1 CPU core per camera. Use only for problematic cameras.

# Camera paths will be added dynamically via the REST API
paths: {}
"#;

    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write mediamtx.yml: {}", e))?;

    info!("Generated MediaMTX config at: {:?}", config_path);
    Ok(config_path)
}
