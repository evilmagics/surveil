import React, { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { X, Minus, Square, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TitleBar() {
  const appWindow = getCurrentWindow();

  useEffect(() => {
    // Ensure window is shown once UI is ready
    appWindow.show();
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };
  const handleClose = () => appWindow.close();

  const handleDrag = (e) => {
    // Only drag if it's a left click on the drag region itself
    if (e.buttons === 1) {
      appWindow.startDragging();
    }
  };

  return (
    <div 
      onMouseDown={handleDrag}
      data-tauri-drag-region 
      className="h-9 w-full flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/30 select-none z-[100] transition-colors duration-500"
    >
      {/* App Logo & Title */}
      <div className="flex items-center px-4 space-x-2.5 pointer-events-none">
        <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Video className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
          Sur<span className="text-blue-500">veil</span>
        </span>
      </div>

      {/* Centered Drag Indicator (Optional Aesthetic) */}
      <div className="hidden md:block h-1 w-12 bg-zinc-300 dark:bg-zinc-800 rounded-full opacity-50 pointer-events-none" />

      {/* Control Buttons */}
      <div className="flex h-full relative z-[110]">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          title="Maximize"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:bg-red-500 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
