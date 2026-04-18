import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, Video, Monitor, Info, Edit, Trash2, Maximize } from 'lucide-react';
import { invokeTauri } from '../../lib/utils';
import { LiveStreamVideo } from './LiveStreamVideo';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const CameraCard = ({ camera, index = 0, onEdit, onDelete, onStateUpdate, onDetail, prefs, onTheater }) => {
    const [status, setStatus] = useState(camera.status);
    const [retryCount, setRetryCount] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const videoRef = useRef(null);

    const handleReconnect = useCallback(async (isManual = false) => {
        if (isReconnecting) return;
        setIsReconnecting(true);
        setStatus('reconnecting');

        try {
            await invokeTauri('check_connection', { url: camera.url });
            setStatus('connected');
            setRetryCount(0);
            onStateUpdate(camera.id, 'connected');
        } catch (err) {
            setStatus('disconnected');
            if (!isManual) setRetryCount(prev => prev + 1);
            onStateUpdate(camera.id, 'disconnected');
        } finally {
            setIsReconnecting(false);
        }
    }, [camera.url, camera.id, isReconnecting, onStateUpdate]);

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

    // Auto-reconnect Logic: 10s delay, max 5 retries
    useEffect(() => {
        let timer;
        if (status === 'disconnected' && retryCount < 5 && !isReconnecting) {
            timer = setTimeout(() => {
                handleReconnect(false);
            }, 10000);
        }
        return () => clearTimeout(timer);
    }, [status, retryCount, isReconnecting, handleReconnect]);

    return (
        <div
            className={`flex flex-col ${prefs.monitoringMode ? 'rounded-md' : 'rounded-xl'} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden group transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
            style={{ animationDelay: `${index * 40}ms` }}
        >
            {/* Video Area Mock */}
            <div ref={videoRef} className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {status === 'connected' ? (
                    <>
                        <LiveStreamVideo camera={camera} className="w-full h-full object-cover opacity-90" onTimeout={() => {
                            if (status !== 'disconnected') {
                                setStatus('disconnected');
                                onStateUpdate(camera.id, 'disconnected');
                            }
                        }} />
                        
                        {/* Top Left Badges (REC & Protocol) */}
                        <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 z-10">
                            <div className="inline-flex items-center rounded bg-black/60 backdrop-blur-md border border-zinc-800/50 text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold tracking-wider shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span> REC
                            </div>
                            {/* Protocol Badge - Only visible on hover */}
                            {!prefs.monitoringMode && (
                                <div className="inline-flex items-center rounded bg-black/60 backdrop-blur-md border border-zinc-700/50 text-zinc-300 px-1.5 py-0.5 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    {camera.protocol}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950/90 backdrop-blur-md relative overflow-hidden">
                        {/* Electric/Data Connection Animation Background */}
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${status === 'reconnecting' || status === 'connecting' ? 'opacity-30' : 'opacity-10'}`}>
                            <svg className="w-full h-24" viewBox="0 0 200 50" preserveAspectRatio="none">
                                <path className="animate-[dash_1.5s_linear_infinite]" stroke="url(#gradient)" strokeWidth="1" fill="none" strokeDasharray="10 5" strokeDashoffset="0" d="M 0 25 Q 50 5 100 25 T 200 25" />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={status === 'reconnecting' || status === 'connecting' ? "#3b82f6" : "#ef4444"} stopOpacity="0" />
                                        <stop offset="50%" stopColor={status === 'reconnecting' || status === 'connecting' ? "#60a5fa" : "#f87171"} stopOpacity="1" />
                                        <stop offset="100%" stopColor={status === 'reconnecting' || status === 'connecting' ? "#3b82f6" : "#ef4444"} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        
                        {/* Animated Grid lines */}
                        <div className={`absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_100%)] opacity-20 ${status === 'reconnecting' || status === 'connecting' ? 'animate-pulse' : ''} transition-all duration-1000`}></div>

                        {status === 'reconnecting' || status === 'connecting' ? (
                            <>
                                {/* Data Transfer Nodes */}
                                <div className="flex items-center space-x-5 z-10 mb-4">
                                    <div className="relative">
                                        <Video className="w-6 h-6 text-zinc-400 opacity-50" />
                                        <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-30"></div>
                                    </div>
                                    
                                    {/* Moving dots */}
                                    <div className="flex space-x-1.5 w-16 justify-center">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"></div>
                                    </div>

                                    <Monitor className="w-6 h-6 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                </div>
                                
                                <div className="z-10 flex flex-col items-center">
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest drop-shadow-md mb-1">{status === 'connecting' ? 'Establishing Context' : 'Restoring Signal'}</span>
                                    {status === 'reconnecting' && <span className="text-[10px] text-blue-200/70 font-mono">Attempt {retryCount}/5</span>}
                                </div>
                            </>
                        ) : (
                            <div className="z-10 flex flex-col items-center text-red-500 bg-black/40 p-4 rounded-xl backdrop-blur-md border border-red-500/20">
                                <WifiOff className="w-8 h-8 mb-2" />
                                <span className="text-xs font-medium">Disconnected</span>
                                {retryCount >= 5 && <span className="text-[10px] text-red-400 mt-1 mb-2">Max retries reached</span>}
                                <Button variant="outline" size="sm" className="mt-2 h-7 px-3 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 bg-black/50" onClick={() => handleReconnect(true)} disabled={isReconnecting}>
                                    <RefreshCw className="w-3 h-3 mr-1.5" /> Reconnect
                                </Button>
                            </div>
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

                {/* Action Buttons Overlay (Bottom Right) - Fullscreen & Theater */}
                <div className="absolute bottom-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onTheater(camera); }} title="Theater Mode">
                        <Monitor className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 !bg-transparent text-white/80 hover:text-blue-500 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={handleFullscreen} title="Fullscreen">
                        <Maximize className="w-4 h-4" />
                    </Button>
                </div>

                {/* Bottom Gradient Overlay (For Text Readability) */}
                {!prefs.monitoringMode && (
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0"></div>
                )}

                {/* Metadata Overlay (Bottom Left) aligned with buttons */}
                {!prefs.monitoringMode && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm text-[9px] text-zinc-200 font-mono shadow-sm">{camera.resolution}</span>
                        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm text-[9px] text-zinc-200 font-mono shadow-sm">{camera.fps} FPS</span>
                        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm text-[9px] text-zinc-200 font-mono shadow-sm">{camera.codec}</span>
                    </div>
                )}
            </div>

            {/* Info Area */}
            {(prefs.showName || prefs.showSource || prefs.showTags) && (
                <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        {prefs.showName && (
                            <div className="flex items-start justify-between">
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">{camera.name}</h3>
                                <div className="flex items-center space-x-1">
                                    {/* Manual Reconnect Button */}
                                    {(status === 'disconnected' || status === 'reconnecting') && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" onClick={() => handleReconnect(true)} disabled={isReconnecting} title="Manual Reconnect">
                                            <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {prefs.showSource && (
                            <p className={`text-xs text-zinc-500 truncate ${prefs.showName ? 'mt-1' : ''}`} title={camera.url}>{camera.url}</p>
                        )}

                        {prefs.showTags && camera.labels.length > 0 && (
                            <div className={`flex flex-wrap gap-1 ${prefs.showName || prefs.showSource ? 'mt-3' : ''}`}>
                                {camera.labels.map((lbl, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px]">{lbl}</Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
