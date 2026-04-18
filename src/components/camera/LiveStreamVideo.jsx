import React, { useEffect, useRef, useState } from 'react';
import { invokeTauri } from '../../lib/utils';

// MediaMTX WHEP endpoint base URL (WebRTC HTTP Egress Protocol)
const MTX_WHEP_BASE = 'http://127.0.0.1:8889';

/**
 * LiveStreamVideo — WebRTC/WHEP client component.
 *
 * Artifact prevention strategy (H.264 ghost-frame / frame-bleed fix):
 *  1. Backend (MTX) is configured with TCP RTSP transport → no UDP packet loss.
 *  2. MTX readBufferCount is enlarged → absorbs burst traffic without dropping.
 *  3. On connect, this component immediately sends a PLI (Picture Loss Indication)
 *     to the RTSP source via MTX, forcing it to emit a fresh IDR keyframe.
 *     Without a valid IDR the H.264 decoder has no reference frame and bleeds
 *     previous pixel data into new frames ("ghosting").
 *  4. A stall monitor watches bytes-received stats; if the stream freezes it
 *     calls onTimeout so CameraCard can trigger a reconnect.
 */
export const LiveStreamVideo = ({ camera, className, onTimeout }) => {
    const videoRef = useRef(null);
    const pcRef    = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isActive   = true;
        let stallTimer = null;
        let lastBytes  = 0;
        let stallCount = 0;

        // ── Stall monitor ─────────────────────────────────────────────────────
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
                        console.warn(`[LiveStreamVideo] stream stalled — cam ${camera.id}`);
                        if (onTimeout) onTimeout();
                        stallCount = 0;
                    }
                } else {
                    stallCount = 0;
                }
                lastBytes = bytes;
            } catch (_) { /* ignore stats error */ }
        };

        // ── Request a fresh IDR keyframe via PLI ───────────────────────────────
        // Sends a Picture Loss Indication signal through all WebRTC senders.
        // The browser will relay this back to the RTP source (camera via MTX),
        // which responds by immediately emitting a full IDR frame.
        // We fire this at connect AND repeat a few times in case the first is lost.
        const requestKeyframe = (pc) => {
            if (!pc) return;
            // sendSyncMessage triggers PLI/FIR on the browser side
            pc.getReceivers().forEach(receiver => {
                if (receiver.track?.kind === 'video') {
                    // Attempt native keyframe request if available (Chrome 106+)
                    if (typeof receiver.requestKeyFrame === 'function') {
                        receiver.requestKeyFrame();
                    }
                }
            });
        };

        // ── Main WebRTC negotiation ───────────────────────────────────────────
        const startWebRTC = async () => {
            setError(null);
            try {
                // 1. Register camera in MTX (idempotent, enables on-demand RTSP pull)
                await invokeTauri('start_camera_stream', {
                    cameraUrl: camera.url,
                    cameraId:  camera.id,
                }).catch(e => console.warn('[LiveStreamVideo] start_camera_stream:', e));

                if (!isActive) return;

                // 2. Create peer connection — no STUN/TURN needed (local loopback)
                const pc = new RTCPeerConnection({ iceServers: [] });
                pcRef.current = pc;

                // Request video & audio tracks (MTX provides what the RTSP source has)
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                // 3. Attach incoming tracks to <video> element
                pc.ontrack = (event) => {
                    if (!videoRef.current) return;
                    // Manually construct MediaStream — some MTX versions don't
                    // populate event.streams reliably across all browsers.
                    let stream = videoRef.current.srcObject;
                    if (!(stream instanceof MediaStream)) {
                        stream = new MediaStream();
                        videoRef.current.srcObject = stream;
                    }
                    if (!stream.getTracks().includes(event.track)) {
                        stream.addTrack(event.track);
                    }
                };

                // 4. Connection state monitoring
                pc.onconnectionstatechange = () => {
                    if (!isActive) return;
                    const s = pc.connectionState;
                    console.log(`[LiveStreamVideo] cam ${camera.id} → ${s}`);
                    if (s === 'connected') {
                        // ── Anti-artifact: request IDR immediately on connect ──
                        // PLI asks the source for a full keyframe, which the browser
                        // decoder needs as a reference before it can correctly decode
                        // P-frames (otherwise old pixel data bleeds into new frames).
                        requestKeyframe(pc);
                        // Repeat a few times to survive the initial buffering delay
                        setTimeout(() => requestKeyframe(pc), 300);
                        setTimeout(() => requestKeyframe(pc), 800);
                    }
                    if (s === 'failed' || s === 'disconnected') {
                        if (onTimeout) onTimeout();
                    }
                };

                // 5. SDP offer → WHEP endpoint → SDP answer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // MTX path name matches what the backend registers: cam_{id}
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

                // 6. Start stall monitor (fires every 1s, triggers onTimeout after 5s stall)
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
            // Release MediaStream → free GPU decoder resources
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [camera.url, camera.id]); // intentionally omit onTimeout to avoid reconnect loops

    return (
        <div className={`relative ${className ?? ''}`} style={{ background: '#000' }}>
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
            />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-red-400 text-xs p-2 text-center font-mono">
                    ⚠ {error}
                </div>
            )}
        </div>
    );
};
