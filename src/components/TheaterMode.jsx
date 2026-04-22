import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Link as LinkIcon, Maximize2, Minimize2, Activity, Zap, Monitor, 
  Star, Play, Pause, Trash2, Edit, Info 
} from 'lucide-react';
import { LiveStreamVideo } from './camera/LiveStreamVideo';
import { cn } from '../lib/utils';
import { useCameraVolatileStore } from '../store/cameraStore';

export function TheaterMode({ camera, onClose, onDelete, onEdit, onDetails, onFavoriteToggle }) {
  const globalStatus = useCameraVolatileStore(state => state.cameraStatuses[camera.id]);
  const status = globalStatus || camera.status;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isFavorite = camera.labels?.some(l => ['favorite', 'favorites', 'star'].includes(l.toLowerCase()));

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isFullscreen, onClose]);

  if (!camera) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center transition-all duration-700 ease-in-out",
        isFullscreen ? "bg-black" : "bg-black/75 backdrop-blur-md p-4 md:p-8"
      )}
      onClick={onClose}
    >
      {/* Cinematic Frame */}
      <div
        className={cn(
          "relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden group transition-all duration-700 cubic-bezier(0.16,1,0.3,1)",
          isFullscreen
            ? "w-full h-full rounded-none"
            : "w-full max-w-5xl aspect-video rounded-2xl border border-white/10 ring-1 ring-white/10"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={e => e.stopPropagation()}
      >
        {/* The Stream Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <LiveStreamVideo
            camera={camera}
            paused={isPaused}
            className={cn(
              "w-full h-full transition-transform duration-1000",
              isFullscreen ? "object-contain" : "object-cover scale-105 group-hover:scale-100"
            )}
            layoutId={`video-${camera.id}`}
          />

          {/* Subtle Grain/Texture Overlay for Cinematic Feel */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        </div>

        {/* Dynamic Header: High Contrast for Metadata */}
        <div className={cn(
          "absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/95 via-black/80 to-transparent z-20 flex items-start justify-between p-5 transition-all duration-500",
          (isFullscreen && !isHovered) ? "translate-y-[-100%] opacity-0" : "translate-y-0 opacity-100"
        )}>
          <div className="flex flex-col">
            <div className="flex items-center space-x-3">
              {/* Status Indicator */}
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                status === 'disconnected' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              )}></div>

              {/* Favorite Toggle Button */}
              <button
                onClick={onFavoriteToggle}
                className={cn(
                  "p-1 rounded transition-all duration-300 active:scale-90",
                  isFavorite ? "text-yellow-400 fill-yellow-400" : "text-white/30 hover:text-white"
                )}
              >
                <Star className="w-4 h-4" />
              </button>

              <h2 className="text-white font-black text-lg tracking-tighter uppercase">
                {camera.name}
              </h2>
            </div>
            
            {/* Source URL */}
            <div className="flex items-center text-white/40 text-[9px] font-mono tracking-tight ml-5 mt-0.5">
              <LinkIcon className="w-2.5 h-2.5 mr-1.5 opacity-70" />
              {camera.url}
            </div>

            {/* Consolidated Technical Info Row - Reordered: PRO first */}
            <div className="flex items-center gap-2 mt-3 ml-5">
              {[
                { label: 'PRO', val: camera.protocol, icon: Monitor, color: 'text-zinc-400' },
                { label: 'FPS', val: `${camera.fps} FPS`, icon: Activity, color: 'text-emerald-400' },
                { label: 'ENC', val: camera.codec, icon: Zap, color: 'text-blue-400' },
                { label: 'RES', val: camera.resolution, icon: Maximize2, color: 'text-zinc-400' }
              ].map((item, i) => (
                <div key={i} className="flex items-center bg-zinc-950/60 border border-white/5 rounded-sm px-2 py-0.5 backdrop-blur-md">
                  <item.icon className={cn("w-2.5 h-2.5 mr-1.5", item.color)} />
                  <span className="text-[9px] font-mono font-bold text-white/80 uppercase tracking-wider">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white transition-all active:scale-90 hover:rotate-90 duration-300"
              title="Close Theater"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ambient Bottom Info */}
        <div className={cn(
          "absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-20 flex items-center justify-between transition-all duration-500",
          (isFullscreen && !isHovered) ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100"
        )}>
          {/* Bottom Left: Tags */}
          <div className="flex gap-1.5 flex-1">
            {camera.labels?.map((tag, i) => (
              <span key={i} className="text-[8px] font-bold uppercase tracking-widest text-blue-300/80 bg-blue-500/10 border border-blue-400/20 px-2 py-0.5 rounded backdrop-blur-md">
                {tag}
              </span>
            ))}
          </div>

          {/* Bottom Center: Pause/Play */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white backdrop-blur-xl transition-all active:scale-90 shadow-2xl group/play"
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              ) : (
                <Pause className="w-5 h-5 fill-current" />
              )}
            </button>
          </div>

          {/* Bottom Right: Actions & Fullscreen */}
          <div className="flex-1 flex items-center justify-end space-x-2">
            {/* Action Group: Delete, Edit, Info */}
            <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-1.5 py-1 mr-2">
              <button
                onClick={onDelete}
                className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                title="Delete Camera"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3 bg-white/10 mx-0.5"></div>
              <button
                onClick={onEdit}
                className="p-1.5 text-white/40 hover:text-blue-400 transition-colors"
                title="Edit Camera"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3 bg-white/10 mx-0.5"></div>
              <button
                onClick={onDetails}
                className="p-1.5 text-white/40 hover:text-emerald-400 transition-colors"
                title="Camera Info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/40 hover:text-white transition-all active:scale-90 duration-300 bg-white/5 rounded-full"
              title={isFullscreen ? "Minimize" : "Maximize"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Visual Decoration: Corner Brackets */}
        {!isFullscreen && (
          <>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/25 rounded-tl-2xl pointer-events-none transition-all group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/25 rounded-tr-2xl pointer-events-none transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/25 rounded-bl-2xl pointer-events-none transition-all group-hover:-translate-x-0.5 group-hover:translate-y-0.5"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/25 rounded-br-2xl pointer-events-none transition-all group-hover:translate-x-0.5 group-hover:translate-y-0.5"></div>
          </>
        )}
      </div>
    </motion.div>
  );
}

