import React from 'react';
import { Loader2, AlertCircle, Wifi, Settings2, ShieldCheck } from 'lucide-react';
import { Input, Button, Chip } from '@heroui/react';
import { SmartLabelInput } from './ui/SmartLabelInput';
import { Dialog } from './ui/Dialog';
import { MagicCard } from './ui/MagicCard';

export function EditCameraModal({ 
  isOpen, 
  onOpenChange, 
  form,
}) {
  const {
    editingCamera,
    formData, setFormData,
    formMetadata,
    isCheckingConn,
    connError,
    checkConnection,
    saveCamera
  } = form;

  if (!editingCamera) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title="Edit Camera configuration"
      description="Review and update RTSP/HTTP stream details."
      footer={
        <div className="flex items-center justify-between w-full">
          <Button 
            variant="flat" 
            color="secondary" 
            size="sm"
            radius="xl"
            onPress={checkConnection} 
            disabled={!formData.url || isCheckingConn}
            startContent={isCheckingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            className="font-semibold"
          >
            Test Connection
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="light" radius="xl" onPress={() => onOpenChange(false)} className="font-medium text-zinc-500">
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={saveCamera} 
              radius="xl"
              className="font-bold shadow-lg shadow-blue-500/20 px-6"
              disabled={!formData.name || !formData.url || isCheckingConn}
              startContent={!isCheckingConn && <Settings2 className="w-4 h-4" />}
            >
              {isCheckingConn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Camera
            </Button>
          </div>
        </div>
      }
    >
      <div className="mt-2 space-y-6">
        <div className="space-y-1.5">
          <label className="text-zinc-900 dark:text-zinc-100 font-bold text-sm block">Camera Name</label>
          <Input 
            placeholder="e.g. Front Gate HQ" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            variant="bordered"
            radius="xl"
            required
            className="w-full bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 transition-colors rounded-xl overflow-hidden"
          />
        </div>

        <div className="space-y-1">
        <div className="space-y-1.5">
          <label className="text-zinc-900 dark:text-zinc-100 font-bold text-sm block">Stream Address</label>
          <Input 
            placeholder="rtsp://your-camera-ip:554/stream" 
            value={formData.url} 
            onChange={e => setFormData({ ...formData, url: e.target.value })}
            variant="bordered"
            radius="xl"
            required
            className="w-full bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 transition-colors rounded-xl overflow-hidden"
          />
          <p className="text-[11px] font-medium text-zinc-500 pt-1">Only RTSP and standard HTTP streams are supported.</p>
        </div>
          {connError && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-500/5 rounded-lg border border-red-500/10 mt-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-[11px] text-red-500 font-bold uppercase tracking-tight">{connError}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Metadata Labels</label>
          </div>
          <SmartLabelInput
            labels={formData.labels}
            onChange={(newLabels) => setFormData({ ...formData, labels: newLabels })}
          />
        </div>

        <MagicCard className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-200 uppercase tracking-widest">Stream Validation</span>
              </div>
              {formMetadata && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Connected</span>
                </div>
              )}
            </div>
            {formMetadata ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Resolution</span>
                  <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">{formMetadata.resolution}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Encoder</span>
                  <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">{formMetadata.codec}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Refresh Rate</span>
                  <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">{formMetadata.fps} FPS</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Transport</span>
                  <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">{formMetadata.protocol}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <p className="text-[11px] text-zinc-500 italic max-w-[200px]">Metadata is unavailable until connection is verified.</p>
              </div>
            )}
          </div>
        </MagicCard>
      </div>
    </Dialog>
  );
}
