import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { invokeTauri } from '../../lib/utils';
import { useCameraVolatileStore } from '../../store/cameraStore';

// MediaMTX WHEP endpoint base URL
const MTX_WHEP_BASE = 'http://127.0.0.1:8889';

const MAX_CONNECT_WAIT_S = 25;
const MAX_STALL_S = 12;

export const LiveStreamVideo = ({ camera, className, onTimeout, onPlaying, index = 0, layoutId, paused = false }) => {
    const videoRef = useRef(null);
    const [error, setError] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [isConnectingAfterPause, setIsConnectingAfterPause] = useState(false);
    const { acquireStream, releaseStream } = useCameraVolatileStore();

    // Effect for stream management (Active only when NOT paused)
    useEffect(() => {
        if (paused) return; // Fully disconnect when paused

        let isMounted = true;
        let streamData = null;

        const callbacks = {
            onPlaying: () => { 
                if (isMounted) {
                    onPlaying?.();
                    setSnapshot(null); // Clear snapshot only when new stream is ready
                    setIsConnectingAfterPause(false);
                }
            },
            onTimeout: () => { if (isMounted) onTimeout?.(); },
            onError: (err) => { if (isMounted) setError(err); }
        };

        const createStreamFn = (listeners) => {
            let isActive = true;
            let stallTimer = null;
            let lastBytes = 0;
            let stallCount = 0;
            let connectWaitCount = 0;
            let hasReceivedBytes = false;
            let playingNotified = false;
            let pc = null;
            const stream = new MediaStream();

            const notifyListeners = (key, val) => {
                listeners.forEach(l => l[key]?.(val));
            };

            const requestKeyframe = (p) => {
                if (!p) return;
                p.getReceivers().forEach(receiver => {
                    if (receiver.track?.kind === 'video' && typeof receiver.requestKeyFrame === 'function') {
                        receiver.requestKeyFrame();
                    }
                });
            };

            const checkStall = async (p) => {
                if (!isActive || !p || p.connectionState !== 'connected') return;
                try {
                    const stats = await p.getStats();
                    let bytes = 0;
                    let framesDecoded = 0;
                    stats.forEach(r => {
                        if (r.type === 'inbound-rtp' && r.kind === 'video') {
                            bytes = r.bytesReceived ?? 0;
                            framesDecoded = r.framesDecoded ?? 0;
                        }
                    });

                    if (framesDecoded > 0 && !playingNotified) {
                        playingNotified = true;
                        notifyListeners('onPlaying');
                    }

                    if (!hasReceivedBytes) {
                        if (bytes > 0) {
                            hasReceivedBytes = true;
                            lastBytes = bytes;
                            connectWaitCount = 0;
                        } else {
                            connectWaitCount++;
                            if (connectWaitCount >= MAX_CONNECT_WAIT_S) {
                                if (isActive) notifyListeners('onTimeout');
                                isActive = false;
                            }
                        }
                        return;
                    }

                    if (bytes === lastBytes) {
                        stallCount++;
                        if (stallCount === 3) requestKeyframe(p);
                        if (stallCount >= MAX_STALL_S) {
                            if (isActive) notifyListeners('onTimeout');
                            isActive = false;
                        }
                    } else {
                        stallCount = 0;
                    }
                    lastBytes = bytes;

                    const now = Date.now();
                    if (!p.lastKeyframeReq) p.lastKeyframeReq = now;
                    if (now - p.lastKeyframeReq > 19000) {
                        requestKeyframe(p);
                        p.lastKeyframeReq = now;
                    }
                } catch (_) {}
            };

            const start = async () => {
                try {
                    await invokeTauri('start_camera_stream', {
                        cameraUrl: camera.url,
                        cameraId: camera.id,
                    }).catch(() => {});

                    if (!isActive) return;

                    pc = new RTCPeerConnection({ iceServers: [] });
                    pc.addTransceiver('video', { direction: 'recvonly' });
                    pc.addTransceiver('audio', { direction: 'recvonly' });

                    pc.ontrack = (event) => {
                        if (!stream.getTracks().includes(event.track)) {
                            stream.addTrack(event.track);
                        }
                    };

                    pc.onconnectionstatechange = () => {
                        if (!isActive) return;
                        if (pc.connectionState === 'connected') {
                            requestKeyframe(pc);
                        } else if (pc.connectionState === 'failed') {
                            notifyListeners('onTimeout');
                            isActive = false;
                        }
                    };

                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    const res = await fetch(`${MTX_WHEP_BASE}/cam_${camera.id}/whep`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/sdp' },
                        body: offer.sdp,
                    });

                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const sdpAnswer = await res.text();
                    if (!isActive) return;
                    await pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer });

                    const schedule = () => {
                        if (!isActive) return;
                        const interval = (playingNotified && stallCount === 0) ? 10000 : 1000;
                        stallTimer = setTimeout(async () => {
                            await checkStall(pc);
                            schedule();
                        }, interval);
                    };
                    schedule();

                } catch (err) {
                    notifyListeners('onError', err.message);
                    notifyListeners('onTimeout');
                }
            };

            start();

            return {
                pc,
                stream,
                cleanup: () => {
                    isActive = false;
                    if (stallTimer) clearTimeout(stallTimer);
                    if (pc) pc.close();
                }
            };
        };

        // Acquire stream from store (shared)
        streamData = acquireStream(camera.id, createStreamFn, callbacks);

        // Attach stream to video element
        if (videoRef.current && streamData.stream) {
            videoRef.current.srcObject = streamData.stream;
        }

        return () => {
            isMounted = false;
            releaseStream(camera.id, callbacks);
        };
    }, [camera.id, camera.url, paused, acquireStream, releaseStream]);

    // Snapshot logic: Capture frame before disconnecting
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (paused && videoRef.current) {
            try {
                const video = videoRef.current;
                if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setSnapshot(dataUrl);
                }
            } catch (e) {
                console.warn("Failed to take snapshot:", e);
            }
        } else if (!paused && !isFirstRender.current) {
            // Only show "Resuming" if we were previously paused
            setIsConnectingAfterPause(true);
        }
        
        isFirstRender.current = false;
    }, [paused]);

    return (
        <motion.div 
            layoutId={layoutId}
            className={`relative group ${className ?? ''}`} 
            style={{ background: '#000' }}
        >
            {/* The actual video element */}
            <video
                ref={videoRef}
                className={`w-full h-full object-cover transition-opacity duration-500 ${snapshot ? 'opacity-0' : 'opacity-100'}`}
                autoPlay={!paused}
                playsInline
                muted
            />

            {/* Snapshot Overlay (Shown when paused or reconnecting) */}
            {(snapshot) && (
                <div className="absolute inset-0">
                    <img 
                        src={snapshot} 
                        alt="Paused snapshot" 
                        className="w-full h-full object-cover"
                    />
                    {/* Visual indicator that it's paused/idle */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-black/60 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                            <div className="w-2 h-2 bg-zinc-400 rounded-full"></div>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">PAUSED • IDLE</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconnecting Loader (Shown only after unpausing until first frame) */}
            {isConnectingAfterPause && !snapshot && !error && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">Resuming...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-red-400 text-xs p-2 text-center font-mono">
                    ⚠ {error}
                </div>
            )}
        </motion.div>
    );
};
