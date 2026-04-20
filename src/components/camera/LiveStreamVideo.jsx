import React, { useEffect, useRef, useState, useCallback } from 'react';
import { invokeTauri } from '../../lib/utils';

// MediaMTX WHEP endpoint base URL (WebRTC HTTP Egress Protocol)
const MTX_WHEP_BASE = 'http://127.0.0.1:8889';

/**
 * LiveStreamVideo — WebRTC/WHEP client component.
 *
 * Props:
 *  - camera      : { id, url }
 *  - className   : CSS classes for the wrapper div
 *  - onTimeout   : called when stream stalls persistently or WebRTC fails
 *  - onPlaying   : called when the first decoded video frames are confirmed
 *
 * Reconnect-loop fix (root cause analysis):
 *  The previous version destructured { camera, className, onTimeout } — 
 *  onPlaying was MISSING from the props, so it was always undefined.
 *  The stall monitor checked `if (onPlaying) onPlaying()` which never fired,
 *  keeping isPlaying=false forever → video invisible → stall detected after 10s
 *  → onTimeout → disconnected → auto-reconnect → infinite loop.
 *
 * Stall-detection fix:
 *  Only start counting stall ticks AFTER the first non-zero bytesReceived.
 *  Before any data arrives, the stream is legitimately buffering (MTX pulls
 *  from the RTSP source which may take up to 20s for the first IDR frame).
 *  We give it MAX_CONNECT_WAIT_S seconds before declaring a timeout.
 */

// How many seconds to wait for the first data before giving up
const MAX_CONNECT_WAIT_S = 25;
// How many consecutive stall seconds to tolerate before triggering reconnect
const MAX_STALL_S = 12;

export const LiveStreamVideo = ({ camera, className, onTimeout, onPlaying, index = 0 }) => {
    const videoRef = useRef(null);
    const pcRef    = useRef(null);
    const [error, setError] = useState(null);

    // Stabilize callbacks with refs to prevent effect re-runs
    const onTimeoutRef = useRef(onTimeout);
    const onPlayingRef = useRef(onPlaying);
    useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);
    useEffect(() => { onPlayingRef.current = onPlaying; }, [onPlaying]);

    const startStream = useCallback(async () => {
        setError(null);

        let isActive          = true;
        let stallTimer        = null;
        let lastBytes         = 0;
        let stallCount        = 0;          // ticks since last byte change (once flowing)
        let connectWaitCount  = 0;          // ticks while waiting for first bytes
        let hasReceivedBytes  = false;      // true after first non-zero bytesReceived
        let playingNotified   = false;      // true after onPlaying has been fired

        // ── Request a fresh IDR keyframe via PLI ───────────────────────────────
        const requestKeyframe = (pc) => {
            if (!pc) return;
            pc.getReceivers().forEach(receiver => {
                if (receiver.track?.kind === 'video') {
                    if (typeof receiver.requestKeyFrame === 'function') {
                        receiver.requestKeyFrame();
                    }
                }
            });
        };

        // ── Stall monitor ─────────────────────────────────────────────────────
        // Runs every 1 second while the PeerConnection is alive.
        const checkStall = async (pc) => {
            if (!isActive || !pc || pc.connectionState !== 'connected') return;
            try {
                const stats = await pc.getStats();
                let bytes         = 0;
                let framesDecoded = 0;
                stats.forEach(r => {
                    if (r.type === 'inbound-rtp' && r.kind === 'video') {
                        bytes         = r.bytesReceived   ?? 0;
                        framesDecoded = r.framesDecoded   ?? 0;
                    }
                });

                // Notify parent once we have decoded frames
                if (framesDecoded > 0 && !playingNotified) {
                    playingNotified = true;
                    console.log(`[LiveStreamVideo] cam ${camera.id} — first frames decoded ✓`);
                    onPlayingRef.current?.();
                }

                if (!hasReceivedBytes) {
                    // ── Waiting for the FIRST bytes from MTX ──────────────────
                    if (bytes > 0) {
                        hasReceivedBytes = true;
                        lastBytes        = bytes;
                        connectWaitCount = 0;
                        console.log(`[LiveStreamVideo] cam ${camera.id} — first bytes received ✓`);
                        return; // Fresh start — no stall to evaluate yet
                    }
                    connectWaitCount++;
                    if (connectWaitCount >= MAX_CONNECT_WAIT_S) {
                        console.warn(`[LiveStreamVideo] cam ${camera.id} — no data after ${MAX_CONNECT_WAIT_S}s, giving up`);
                        if (isActive) onTimeoutRef.current?.();
                        isActive = false;
                    }
                    return;
                }

                // ── Normal stall detection (stream was flowing) ────────────────
                if (bytes === lastBytes) {
                    stallCount++;
                    if (stallCount === 3) {
                        console.log(`[LiveStreamVideo] cam ${camera.id} — stalled, requesting keyframe...`);
                        requestKeyframe(pc);
                    }
                    if (stallCount >= MAX_STALL_S) {
                        console.warn(`[LiveStreamVideo] cam ${camera.id} — persistent stall (${MAX_STALL_S}s), triggering reconnect`);
                        if (isActive) onTimeoutRef.current?.();
                        isActive = false;
                    }
                } else {
                    stallCount = 0; // data is flowing normally
                }
                lastBytes = bytes;

                // 20-second periodic keyframe keep-alive is handled outside checkStall now,
                // or we adapt it inside checkStall:
                if (isActive && stallCount === 0 && hasReceivedBytes) {
                    // if polling every 10s, every second poll is 20s
                    // we can just request keyframe on % 2 ticks since at 10s intervals
                    // For safety, Math.random() < 0.1? No.
                    const now = Date.now();
                    if (!pc.lastKeyframeReq) pc.lastKeyframeReq = now;
                    if (now - pc.lastKeyframeReq > 19000) {
                        requestKeyframe(pc);
                        pc.lastKeyframeReq = now;
                    }
                }

            } catch (_) { /* ignore transient stats errors */ }
        };

        // ── Main WebRTC / WHEP negotiation ───────────────────────────────────
        try {
            // 1. Register / refresh camera path in MediaMTX (idempotent)
            await invokeTauri('start_camera_stream', {
                cameraUrl: camera.url,
                cameraId:  camera.id,
            }).catch(e => console.warn('[LiveStreamVideo] start_camera_stream warn:', e));

            if (!isActive) return;

            // 2. Create PeerConnection (local loopback — no STUN/TURN needed)
            const pc = new RTCPeerConnection({ iceServers: [] });
            pcRef.current = pc;

            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            // 3. Attach incoming tracks to the <video> element
            pc.ontrack = (event) => {
                if (!videoRef.current) return;
                let stream = videoRef.current.srcObject;
                if (!(stream instanceof MediaStream)) {
                    stream = new MediaStream();
                    videoRef.current.srcObject = stream;
                }
                if (!stream.getTracks().includes(event.track)) {
                    stream.addTrack(event.track);
                }
            };

            // 4. Connection-state monitoring
            pc.onconnectionstatechange = () => {
                if (!isActive) return;
                const s = pc.connectionState;
                console.log(`[LiveStreamVideo] cam ${camera.id} → PeerConnection: ${s}`);
                if (s === 'connected') {
                    requestKeyframe(pc);
                    setTimeout(() => { if (isActive) requestKeyframe(pc); }, 400);
                    setTimeout(() => { if (isActive) requestKeyframe(pc); }, 1000);
                }
                if (s === 'failed') {
                    console.error(`[LiveStreamVideo] cam ${camera.id} — PeerConnection failed`);
                    if (isActive) onTimeoutRef.current?.();
                    isActive = false;
                }
                // 'disconnected' can recover on its own — let the stall monitor decide
            };

            // 5. SDP offer → WHEP → SDP answer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const whepUrl = `${MTX_WHEP_BASE}/cam_${camera.id}/whep`;
            console.log(`[LiveStreamVideo] Sending WHEP offer to ${whepUrl}`);

            const res = await fetch(whepUrl, {
                method:  'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body:     offer.sdp,
            });

            if (!res.ok) {
                throw new Error(`WHEP ${whepUrl} → HTTP ${res.status} ${res.statusText}`);
            }

            const sdpAnswer = await res.text();
            if (!isActive) return;

            await pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer });
            console.log(`[LiveStreamVideo] cam ${camera.id} — WHEP negotiation complete, waiting for stream...`);

            // 6. Start stall / connect-timeout monitor (Adaptive Polling)
            const scheduleNextCheck = () => {
                if (!isActive) return;
                // If it is stalled or waiting for data, poll fast (1s).
                // If stable and flowing smoothly, poll slow (10s) to save CPU.
                const nextInterval = (playingNotified && stallCount === 0) ? 10000 : 1000;
                
                stallTimer = setTimeout(async () => {
                    await checkStall(pc);
                    scheduleNextCheck();
                }, nextInterval);
            };
            scheduleNextCheck();

        } catch (err) {
            console.error('[LiveStreamVideo] WebRTC setup error:', err);
            setError(err.message);
            if (isActive) onTimeoutRef.current?.();
        }

        // Return a cleanup function
        return () => {
            isActive = false;
            if (stallTimer) clearTimeout(stallTimer);
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    // Only re-run when the camera changes — callbacks are stable via refs
    }, [camera.url, camera.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let cleanup;
        let startTimer;
        
        // Jitter / Staggered mount setup (Task 3.1)
        // Menambahkan jeda muat dinamis sebelum negosiasi WHEP
        startTimer = setTimeout(() => {
            startStream().then(fn => { cleanup = fn; });
        }, index * 150);

        return () => { 
            clearTimeout(startTimer);
            if (cleanup) cleanup(); 
        };
    }, [startStream, index]);

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
