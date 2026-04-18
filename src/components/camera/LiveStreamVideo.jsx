import React, { useEffect, useRef, useState } from 'react';
import { invokeTauri } from '../../lib/utils';

// MediaMTX WHEP endpoint base URL (WebRTC HTTP Egress Protocol)
const MTX_WHEP_BASE = 'http://127.0.0.1:8889';

/**
 * LiveStreamVideo — WebRTC/WHEP client component.
 *
 * Flow:
 *  1. Calls `start_camera_stream` on Rust backend to register the camera URL
 *     in MediaMTX (idempotent, safe to call multiple times).
 *  2. Creates an RTCPeerConnection and negotiates SDP with the MediaMTX WHEP
 *     endpoint: POST http://127.0.0.1:8889/cam_{id}/whep
 *  3. Attaches incoming tracks to the <video> element for zero-latency playback.
 *  4. Monitors bytes received per second to detect stalls and call onTimeout.
 */
export const LiveStreamVideo = ({ camera, className, onTimeout }) => {
    const videoRef = useRef(null);
    const pcRef    = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isActive    = true;
        let stallTimer  = null;
        let lastBytes   = 0;
        let stallCount  = 0;

        // ── Stall monitor: if no new bytes for 5 consecutive seconds → timeout ──
        const checkStall = async (pc) => {
            if (!isActive || !pc || pc.connectionState !== 'connected') return;
            try {
                const stats = await pc.getStats();
                let bytes = 0;
                stats.forEach(r => {
                    if (r.type === 'inbound-rtp' && r.kind === 'video') bytes = r.bytesReceived;
                });
                if (bytes > 0 && bytes === lastBytes) {
                    if (++stallCount >= 5) {
                        console.warn(`[LiveStreamVideo] stream stalled for cam ${camera.id}`);
                        if (onTimeout) onTimeout();
                        stallCount = 0;
                    }
                } else {
                    stallCount = 0;
                }
                lastBytes = bytes;
            } catch (_) { /* ignore */ }
        };

        // ── Main WebRTC negotiation ───────────────────────────────────────────
        const startWebRTC = async () => {
            setError(null);
            try {
                // 1. Tell Rust/MTX to register the camera source (on-demand)
                await invokeTauri('start_camera_stream', {
                    cameraUrl: camera.url,
                    cameraId:  camera.id,
                }).catch(e => console.warn('[LiveStreamVideo] start_camera_stream:', e));

                if (!isActive) return;

                // 2. Create peer connection (no STUN/TURN needed — local loopback)
                const pc = new RTCPeerConnection({ iceServers: [] });
                pcRef.current = pc;

                // Request both video & audio (MTX will provide what the source has)
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                // 3. Attach tracks to the <video> element
                pc.ontrack = (event) => {
                    if (!videoRef.current) return;
                    // Manually build a MediaStream — some MTX versions don't
                    // populate event.streams reliably.
                    let stream = videoRef.current.srcObject;
                    if (!(stream instanceof MediaStream)) {
                        stream = new MediaStream();
                        videoRef.current.srcObject = stream;
                    }
                    if (!stream.getTracks().includes(event.track)) {
                        stream.addTrack(event.track);
                    }
                };

                // 4. React to connection drops
                pc.onconnectionstatechange = () => {
                    if (!isActive) return;
                    const s = pc.connectionState;
                    console.log(`[LiveStreamVideo] cam ${camera.id} state: ${s}`);
                    if (s === 'failed' || s === 'disconnected') {
                        if (onTimeout) onTimeout();
                    }
                };

                // 5. SDP offer → WHEP → SDP answer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // MTX path name matches what Rust registers: cam_{id}
                const whepUrl = `${MTX_WHEP_BASE}/cam_${camera.id}/whep`;
                const res = await fetch(whepUrl, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body:    offer.sdp,
                });

                if (!res.ok) {
                    throw new Error(`WHEP ${whepUrl} → HTTP ${res.status}`);
                }

                const sdpAnswer = await res.text();
                if (!isActive) return;

                await pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer });

                // 6. Start stall monitor
                stallTimer = setInterval(() => checkStall(pc), 1000);

            } catch (err) {
                console.error('[LiveStreamVideo] WebRTC error:', err);
                setError(err.message);
                if (onTimeout) onTimeout();
            }
        };

        startWebRTC();

        // ── Cleanup on unmount / camera change ───────────────────────────────
        return () => {
            isActive = false;
            if (stallTimer) clearInterval(stallTimer);
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            // Release the MediaStream so the browser frees GPU resources
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [camera.url, camera.id]); // intentionally omit onTimeout — use ref if needed

    return (
        <div className={`relative ${className ?? ''}`}>
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
            />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-red-400 text-xs p-2 text-center">
                    {error}
                </div>
            )}
        </div>
    );
};
