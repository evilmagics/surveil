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

# WebRTC (WHEP endpoint for browser playback)
webrtc: yes
webrtcAddress: :8889
# ICE servers not needed for local loopback connections
webrtcICEServers2: []

# RTSP (for receiving camera RTSP feeds)
rtsp: yes
rtspAddress: :8554
protocols: [tcp]

# Default path settings (applied to all paths)
pathDefaults:
  # Only pull from source when there's an active viewer (saves CPU/RAM)
  sourceOnDemand: yes
  sourceOnDemandStartTimeout: 10s
  sourceOnDemandCloseAfter: 60s

  # Disable recording
  record: no

# Camera paths will be added dynamically via the REST API
paths: {}
"#;

    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write mediamtx.yml: {}", e))?;

    info!("Generated MediaMTX config at: {:?}", config_path);
    Ok(config_path)
}
