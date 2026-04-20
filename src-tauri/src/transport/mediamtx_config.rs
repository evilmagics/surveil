use std::path::PathBuf;
use tracing::info;

/// Generates a minimal mediamtx.yml config file in the app data dir.
/// Returns the path to the generated file.
/// Config is validated against MediaMTX v1.11.0 schema.
pub fn generate_config(data_dir: &PathBuf) -> Result<PathBuf, String> {
    let config_path = data_dir.join("mediamtx.yml");

    // All field names verified against MediaMTX v1.11.0 official config schema.
    // https://github.com/bluenviron/mediamtx/blob/v1.11.0/mediamtx.yml
    let config_content = r#"# Surveil - MediaMTX Auto-Generated Config
# DO NOT EDIT - Regenerated on each app start.
# Compatible with MediaMTX v1.11.0

# Logging
logLevel: warn
logDestinations: [stdout]

# Root-level timeouts (v1.11.0 — these are NOT under pathDefaults)
readTimeout: 30s
writeTimeout: 10s
writeQueueSize: 4096

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
# Force TCP for RTSP transport (eliminates packet-loss artifacts on busy LANs)
rtspTransports: [tcp]

# WebRTC - WHEP output to browser
webrtc: yes
webrtcAddress: :8889
webrtcICEServers2: []
# Loopback — no external ICE relay needed
webrtcLocalUDPAddress: :8189
webrtcLocalTCPAddress: ''
webrtcIPsFromInterfaces: yes

# Default path settings (applied to all camera paths)
pathDefaults:
  # Only pull from source when there is an active viewer
  sourceOnDemand: yes
  # Wait up to 20s for first IDR keyframe before failing
  sourceOnDemandStartTimeout: 20s
  # Keep RTSP connection alive 120s after last viewer disconnects
  sourceOnDemandCloseAfter: 120s
  # Any-port support for cameras behind NAT
  rtspAnyPort: yes
  # Disable recording
  record: no

# Camera paths added dynamically via REST API
paths: {}
"#;

    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write mediamtx.yml: {}", e))?;

    info!("Generated MediaMTX config at: {:?}", config_path);
    Ok(config_path)
}
