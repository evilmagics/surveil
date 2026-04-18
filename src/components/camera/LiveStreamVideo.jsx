import React, { useEffect, useRef } from 'react';
import { invokeTauri } from '../../lib/utils';

export const LiveStreamVideo = ({ camera, className, onTimeout }) => {
    const videoRef = useRef(null);
    const pcRef = useRef(null);

    useEffect(() => {
        let isActive = true;
        let isReconnecting = false;
        
        // Timeout tracking logic
        let timeoutTimer = null;
        let lastBytesReceived = 0;
        let stallCount = 0;

        const checkStall = async (pc) => {
            if (!isActive || !pc || pc.connectionState !== 'connected') return;
            try {
                const stats = await pc.getStats();
                let bytes = 0;
                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        bytes = report.bytesReceived;
                    }
                });
                
                if (bytes === lastBytesReceived && bytes > 0) {
                    stallCount++;
                    if (stallCount > 5) {
                        // Stalled for 5 seconds
                        console.warn(`Stream stalled for camera ${camera.id}`);
                        if (onTimeout) onTimeout();
                        stallCount = 0;
                    }
                } else {
                    stallCount = 0;
                }
                lastBytesReceived = bytes;
            } catch (e) {
                // Ignore stats error
            }
        };

        const startWebRTC = async () => {
            try {
                // Ensure the proxy is started on the backend (even if it's MTX now).
                // Wait, if backend is handled by MTX config, we might not need "start_camera_stream" anymore wait.
                // We shouldn't remove it without backend changes, so keep it for compatibility.
                await invokeTauri('start_camera_stream', { cameraUrl: camera.url, cameraId: camera.id }).catch(() => {});
                
                if (!isActive) return;

                const pc = new RTCPeerConnection({
                    iceServers: [] // MediaMTX is local, ICE servers are generally not needed
                });
                pcRef.current = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                pc.ontrack = (event) => {
                    if (videoRef.current && event.streams[0]) {
                        if (videoRef.current.srcObject !== event.streams[0]) {
                            videoRef.current.srcObject = event.streams[0];
                            // Once track starts playing, ensure timeout monitor runs
                        }
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (!isActive) return;
                    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                        if (onTimeout && !isReconnecting) onTimeout();
                    }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const whepUrl = `http://127.0.0.1:8889/${camera.id}/whep`;
                const response = await fetch(whepUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: offer.sdp
                });

                if (!response.ok) {
                    throw new Error(`WHEP server responded with ${response.status}`);
                }

                const sdpAnswer = await response.text();
                if (!isActive) return;

                await pc.setRemoteDescription({
                    type: 'answer',
                    sdp: sdpAnswer
                });
                
                // Start stall checking interval
                timeoutTimer = setInterval(() => checkStall(pc), 1000);

            } catch (e) {
                console.error("WebRTC initialization error:", e);
                if (onTimeout && !isReconnecting) onTimeout();
            }
        };
        
        startWebRTC();

        return () => {
            isActive = false;
            if (timeoutTimer) clearInterval(timeoutTimer);
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };
    }, [camera.url, camera.id, onTimeout]);

    return (
        <video 
            ref={videoRef} 
            className={className} 
            autoPlay 
            playsInline 
            muted 
        />
    );
};
