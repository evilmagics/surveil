import React from 'react';
import { X, Info, Badge as BadgeIcon } from 'lucide-react';
import { Badge } from './ui/Badge';

export function CameraDetailsSidebar({ camera, isOpen, onClose }) {
  if (!camera) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 pt-10 sm:pt-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-500" /> Source Detail
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6 flex-1">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Camera Name</label>
              <p className="font-medium text-base text-zinc-900 dark:text-zinc-100 mt-1">{camera.name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">URL / Source</label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 font-mono">{camera.url}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</label>
                <div className="mt-1">
                  <Badge variant={camera.status === 'connected' ? 'success' : 'destructive'} className="uppercase text-[10px]">
                    {camera.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Data ID</label>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 font-mono text-[10px] truncate">{camera.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Resolution</label>
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{camera.resolution}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">FPS</label>
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{camera.fps}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Codec</label>
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{camera.codec}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Protocol</label>
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{camera.protocol}</p>
              </div>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase tracking-widest font-medium">Created At</span>
                <span className="text-zinc-400 font-mono uppercase text-[10px]">
                  {camera.created_at ? new Date(camera.created_at).toLocaleString('id-ID') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase tracking-widest font-medium">Last Updated</span>
                <span className="text-zinc-400 font-mono uppercase text-[10px]">
                  {camera.updated_at ? new Date(camera.updated_at).toLocaleString('id-ID') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase tracking-widest font-medium">Last Seen</span>
                <span className="text-zinc-400 font-mono uppercase text-[10px]">
                  {camera.last_connected_at ? new Date(camera.last_connected_at).toLocaleString('id-ID') : '-'}
                </span>
              </div>
            </div>
            {camera.labels.length > 0 && (
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">Labels (Tags)</label>
                <div className="flex flex-wrap gap-2">
                  {camera.labels.map((lbl, idx) => (
                    <Badge key={idx} variant="secondary">{lbl}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
