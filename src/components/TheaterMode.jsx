import React from 'react';
import { X, Monitor, Link as LinkIcon } from 'lucide-react';
import { LiveStreamVideo } from './camera/LiveStreamVideo';
import { Badge } from './ui/Badge';

export function TheaterMode({ camera, onClose }) {
  if (!camera) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 transition-opacity animate-in fade-in duration-300" onClick={onClose}>

      {/* The Dialog Card */}
      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden group animate-in zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" onClick={e => e.stopPropagation()}>

        {/* Stream Area */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <LiveStreamVideo camera={camera} className="w-full h-full object-contain" />
        </div>

        {/* Status Badges Always Visible */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
          <Badge variant="success" className="bg-black/50 backdrop-blur-md border-zinc-800/50 text-emerald-400 px-2 py-1 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> REC
          </Badge>
          {camera.status === 'connected' && (
            <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-emerald-500/30 text-emerald-300 px-2 py-1 shadow-md">
              LIVE
            </Badge>
          )}
        </div>

        {/* Gradient Bottom (For Text Readability) */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Hover Overlay: Close Button (Top Right) */}
        <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 scale-95 hover:scale-100 border border-white/10">
          <X className="w-5 h-5" />
        </button>

        {/* Hover Overlay: Camera Info (Bottom Left) */}
        <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div>
            <h3 className="text-xl font-bold text-white drop-shadow-md flex items-center">
              <Monitor className="w-5 h-5 mr-2 text-blue-400" /> {camera.name}
            </h3>
            <p className="text-sm text-zinc-300 font-mono mt-1 drop-shadow-md flex items-center">
              <LinkIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" /> {camera.url}
            </p>
            {camera.labels?.length > 0 && (
              <div className="flex space-x-1.5 mt-2">
                {camera.labels.map((lbl, idx) => (
                  <span key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 text-white/90 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide">
                    {lbl}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-1.5">
            <div className="flex items-center space-x-1.5 opacity-90">
              <span className="bg-black/60 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md text-xs text-zinc-100 font-mono shadow-sm">{camera.resolution}</span>
              <span className="bg-black/60 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md text-xs text-zinc-100 font-mono shadow-sm">{camera.fps} FPS</span>
              <span className="bg-black/60 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md text-xs text-zinc-100 font-mono shadow-sm">{camera.codec}</span>
              <span className="bg-blue-600/80 px-2 py-0.5 rounded border border-blue-500/30 backdrop-blur-md text-xs text-white font-mono shadow-sm font-bold">{camera.protocol}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
