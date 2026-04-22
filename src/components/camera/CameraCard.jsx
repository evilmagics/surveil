import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Video, Monitor, Info, Edit, Trash2, Maximize } from 'lucide-react';
import { invokeTauri, cn } from '../../lib/utils';
import { LiveStreamVideo } from './LiveStreamVideo';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MagicCard } from '../ui/MagicCard';
import { AnimatedBeam } from '../ui/AnimatedBeam';
import { useCameraVolatileStore } from '../../store/cameraStore';

export const CameraCard = ({ camera, index = 0, onEdit, onDelete, onStateUpdate, onDetail, prefs, onTheater }) => {
    const globalStatus = useCameraVolatileStore(state => state.cameraStatuses[camera.id]);
    const status = globalStatus || camera.status;
    
    const [retryCount, setRetryCount] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHalted, setIsHalted] = useState(true);
    
    // refs for AnimatedBeam
    const containerRef = useRef(null);
    const sourceRef = useRef(null);
    const monitorRef = useRef(null);

    // streamKey forces LiveStreamVideo to fully unmount+remount on each reconnect,
    // ensuring a fresh WebRTC PeerConnection and stall-monitor closure.
    const [streamKey, setStreamKey] = useState(0);
    const cardRef = useRef(null);
    const videoRef = useRef(null);
    const haltTimerRef = useRef(null);
    const hasEverPlayedRef = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting) {
                    if (haltTimerRef.current) {
                        clearTimeout(haltTimerRef.current);
                        haltTimerRef.current = null;
                    }
                    setIsHalted(false);
                } else {
                    if (!haltTimerRef.current) {
                        haltTimerRef.current = setTimeout(() => {
                            setIsHalted(true);
                            setIsPlaying(false);
                            haltTimerRef.current = null;
                        }, 3000); // Hard Teardown 3 detik
                    }
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (haltTimerRef.current) clearTimeout(haltTimerRef.current);
            observer.disconnect();
        };
    }, []);

    const handleReconnect = useCallback(async (isManual = false) => {
        if (isReconnecting) return;
        setIsReconnecting(true);
        onStateUpdate(camera.id, 'reconnecting');
        if (isManual) {
            setRetryCount(0);
            hasEverPlayedRef.current = false;
        }

        try {
            await invokeTauri('check_connection', { url: camera.url });
            setStreamKey(prev => prev + 1); // force fresh WebRTC negotiation
            onStateUpdate(camera.id, 'connected');
        } catch (err) {
            if (!isManual) setRetryCount(prev => prev + 1);
            onStateUpdate(camera.id, 'disconnected');
        } finally {
            setIsReconnecting(false);
        }
    }, [camera.url, camera.id, isReconnecting, onStateUpdate]);

    useEffect(() => {
        if (!isHalted && status === 'disconnected' && retryCount < 5 && !isReconnecting) {
            // First time use staggered delay to prevent thundering herd of ffprobe checks.
            // Subsequent retries use 10s backoff.
            const delay = retryCount === 0 ? index * 300 : 10000;
            const timer = setTimeout(() => {
                handleReconnect();
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [isHalted, status, retryCount, isReconnecting, handleReconnect, index]);

    useEffect(() => {
        if (status !== 'connected') {
            setIsPlaying(false);
        }
    }, [status]);

    const handlePlaying = useCallback(() => {
        hasEverPlayedRef.current = true;
        setIsPlaying(true);
        setRetryCount(0);
    }, []);

    // Called by LiveStreamVideo when stream stalls or WebRTC fails
    const handleTimeout = useCallback(() => {
        if (status !== 'disconnected') {
            onStateUpdate(camera.id, 'disconnected');
            // Only count a retry if the stream had previously worked
            if (hasEverPlayedRef.current) {
                setRetryCount(prev => prev + 1);
            } else {
                // First-time failure — still count, but reset so we retry from scratch
                setRetryCount(prev => prev + 1);
            }
        }
    }, [status, camera.id, onStateUpdate]);

    const handleFullscreen = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            videoRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <MagicCard
            className={cn(
                "flex flex-col shadow-sm group transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
                prefs.monitoringMode ? 'rounded-md' : 'rounded-xl'
            )}
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <div ref={cardRef} className="flex flex-col w-full h-full">
            {/* Video Area */}
            <div ref={videoRef} className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {status === 'connected' ? (
                    <>
                        {isHalted ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500 text-xs font-mono">
                                VIEWPORT HALTED (Zzz...)
                            </div>
                        ) : (
                            <LiveStreamVideo
                                index={index}
                                key={streamKey}
                                camera={camera}
                                className={`w-full h-full object-cover opacity-90 ${isPlaying ? 'visible' : 'invisible'}`}
                                onTimeout={handleTimeout}
                                onPlaying={handlePlaying}
                            />
                        )}

                        {!isPlaying && !isHalted && (
                            /* ── Buffering state overlay (while connected but no frames yet) ── */
                            <div ref={containerRef} className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-20">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_100%)] opacity-20 animate-pulse transition-all duration-1000"></div>

                                <div className="flex items-center space-x-12 z-10 mb-4 transition-all duration-500">
                                    <div ref={sourceRef} className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl relative">
                                        <Video className="w-6 h-6 text-zinc-400 opacity-80" />
                                        <div className="absolute inset-0 border-2 border-blue-400 rounded-xl animate-ping opacity-20"></div>
                                    </div>

                                    <div ref={monitorRef} className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl">
                                        <Monitor className="w-6 h-6 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    </div>
                                </div>
                                <AnimatedBeam 
                                    containerRef={containerRef}
                                    fromRef={sourceRef}
                                    toRef={monitorRef}
                                    duration={2}
                                    pathColor="#3b82f6"
                                    gradientStartColor="#60a5fa"
                                    gradientEndColor="#3b82f6"
                                />
                                <div className="z-10 flex flex-col items-center transition-all duration-500">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] drop-shadow-md mb-1 animate-pulse">
                                        RECEIVING VIDEO FRAME
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Top Left Badges (REC & Protocol) */}
                        <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 z-10">
                            <div className="inline-flex items-center rounded bg-black/60 backdrop-blur-md border border-zinc-800/50 text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold tracking-wider shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span> REC
                            </div>
                            {!prefs.monitoringMode && (
                                <div className="inline-flex items-center rounded bg-black/60 backdrop-blur-md border border-zinc-700/50 text-zinc-300 px-1.5 py-0.5 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    {camera.protocol}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* ── Offline / Reconnecting overlay ─────────────────────────────── */
                    <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950/90 backdrop-blur-md relative overflow-hidden">

                        {/* Animated signal wave background */}
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${status === 'reconnecting' || status === 'connecting' ? 'opacity-30' : 'opacity-20'}`}>
                            <svg className="w-full h-24" viewBox="0 0 200 50" preserveAspectRatio="none">
                                <path className="animate-[dash_1.5s_linear_infinite]" stroke="url(#sigGrad)" strokeWidth="1" fill="none" strokeDasharray="10 5" strokeDashoffset="0" d="M 0 25 Q 50 5 100 25 T 200 25" />
                                <defs>
                                    <linearGradient id="sigGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={status === 'reconnecting' || status === 'connecting' ? "#3b82f6" : "#ef4444"} stopOpacity="0" />
                                        <stop offset="50%" stopColor={status === 'reconnecting' || status === 'connecting' ? "#60a5fa" : "#f87171"} stopOpacity="1" />
                                        <stop offset="100%" stopColor={status === 'reconnecting' || status === 'connecting' ? "#3b82f6" : "#ef4444"} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        {/* Animated grid lines */}
                        <div className={`absolute inset-0 bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_100%)] transition-all duration-1000 ${status === 'reconnecting' || status === 'connecting' ? 'bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] opacity-20 animate-pulse' : 'bg-[linear-gradient(rgba(239,68,68,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.1)_1px,transparent_1px)] opacity-10'}`}></div>

                        {status === 'reconnecting' || status === 'connecting' ? (
                            /* ── Reconnecting state: same animated nodes as before ── */
                            <>
                                <div className="flex items-center space-x-5 z-10 mb-4 transition-all duration-500">
                                    <div className="relative">
                                        <Video className="w-6 h-6 text-zinc-400 opacity-50" />
                                        <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-30"></div>
                                    </div>
                                    <div className="flex space-x-1.5 w-16 justify-center">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"></div>
                                    </div>
                                    <Monitor className="w-6 h-6 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                </div>
                                <div className="z-10 flex flex-col items-center transition-all duration-500">
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest drop-shadow-md mb-1">
                                        {status === 'connecting' ? 'Establishing Context' : 'Restoring Signal'}
                                    </span>
                                    {status === 'reconnecting' && <span className="text-[10px] text-blue-200/70 font-mono">Attempt {retryCount}/5</span>}
                                </div>
                            </>
                        ) : (
                            /* ── Disconnected state ───────────────────────────────────── */
                            <>
                                <div className="flex items-center space-x-5 z-10 mb-4 transition-all duration-500">
                                    <div className="relative">
                                        <Video className="w-6 h-6 text-zinc-500 opacity-50" />
                                    </div>
                                    <div className="flex justify-center items-center w-16">
                                        <WifiOff className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-500" />
                                    </div>
                                    <Monitor className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] opacity-80" />
                                </div>
                                <div className="z-10 flex flex-col items-center transition-all duration-500">
                                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest drop-shadow-md mb-2">
                                        DISCONNECTED
                                    </span>
                                    {retryCount >= 5 && (
                                        <span className="text-[10px] text-red-400/50 mb-3 font-mono">Max retries reached</span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Action Buttons Overlay (Top Right) */}
                <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onDetail(camera); }} title="Detail Source">
                        <Info className="w-4 h-4" />
                    </Button>
                    {!prefs.monitoringMode && (
                        <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onEdit(camera); }} title="Edit Camera">
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onDelete(camera); }} title="Delete Camera">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Action Buttons Overlay (Bottom Right) */}
                <div className="absolute bottom-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleReconnect(true); }} disabled={isReconnecting} title="Reload Stream">
                        <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin text-blue-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onTheater(camera); }} title="Theater Mode">
                        <Monitor className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={handleFullscreen} title="Fullscreen">
                        <Maximize className="w-4 h-4" />
                    </Button>
                </div>

                {/* Bottom Gradient Overlay */}
                {!prefs.monitoringMode && (
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0"></div>
                )}

                {/* Metadata Overlay (Bottom Left) */}
                {!prefs.monitoringMode && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm text-[9px] text-zinc-200 font-mono shadow-sm">{camera.resolution}</span>
                        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm text-[9px] text-zinc-200 font-mono shadow-sm">{camera.fps} FPS</span>
                        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm text-[9px] text-zinc-200 font-mono shadow-sm">{camera.codec}</span>
                    </div>
                )}
            </div>

            {/* Info Area */}
            <AnimatePresence mode="popLayout" initial={false}>
                {(prefs.showName || prefs.showSource || prefs.showTags) && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="p-4 flex-1 flex flex-col justify-between overflow-hidden"
                    >
                        <div>
                            <AnimatePresence mode="popLayout">
                                {prefs.showName && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="flex items-start justify-between"
                                    >
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">{camera.name}</h3>
                                        <div className="flex items-center space-x-1">
                                            {(status === 'disconnected' || status === 'reconnecting') && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" onClick={() => handleReconnect(true)} disabled={isReconnecting} title="Manual Reconnect">
                                                    <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="popLayout">
                                {prefs.showSource && (
                                    <motion.p 
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className={`text-xs text-zinc-500 truncate ${prefs.showName ? 'mt-1' : ''}`} 
                                        title={camera.url}
                                    >
                                        {camera.url}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="popLayout">
                                {prefs.showTags && camera.labels.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className={`flex flex-wrap gap-1 ${prefs.showName || prefs.showSource ? 'mt-3' : ''}`}
                                    >
                                        {camera.labels.map((lbl, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-[10px]">{lbl}</Badge>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </MagicCard>
    );
};
