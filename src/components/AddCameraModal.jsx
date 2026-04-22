import React from 'react';
import { Loader2, AlertCircle, Wifi, Video as VideoIcon, ShieldCheck, Database, FileUp, FileDown, CheckCircle2, Zap, Activity } from 'lucide-react';
import { Input, Button, Chip } from '@heroui/react';
import { SmartLabelInput } from './ui/SmartLabelInput';
import { Dialog } from './ui/Dialog';
import { MagicCard } from './ui/MagicCard';

export function AddCameraModal({
  isOpen,
  onOpenChange,
  form,
}) {
  const {
    formData, setFormData,
    formMetadata,
    isCheckingConn,
    connError,
    activeAddTab, setActiveAddTab,
    isDragging, setIsDragging,
    isBatchLoading,
    batchPreview, setBatchPreview,
    batchResults,
    fileInputRef,
    checkConnection,
    saveCamera,
    handleBatchImport,
    saveBatch,
    downloadTemplate
  } = form;

  // Blue color like "veil" in header is text-blue-500 / bg-blue-500
  const brandBlue = "blue-500";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title="Add New Camera"
      description="Register a single camera or upload batch data manifest."
      size="lg"
    >
      <div className="w-full flex flex-col pt-0">
        {/* Tab list: Aligned with px-0 since parent ModalBody has px-5 */}
        <div className="mb-2">
          <div className="p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-full flex gap-1 items-center">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveAddTab('tab-single'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${activeAddTab === 'tab-single' ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Single Device</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveAddTab('tab-batch'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${activeAddTab === 'tab-batch' ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Batch Import</span>
            </button>
          </div>
        </div>

        {/* Tab content area with min-height for stability */}
        <div className="min-h-[440px] flex flex-col">
          {activeAddTab === 'tab-single' && (
            <div className="mt-4 animate-in fade-in duration-300 mb-2 flex-1 flex flex-col justify-between">
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <label className="text-zinc-900 dark:text-zinc-100 font-bold text-[10px] uppercase tracking-wider block ml-1">Camera Name</label>
                  <Input
                    size="sm"
                    placeholder="e.g. Front Gate HQ"
                    value={formData.name}
                    onChange={e => setFormData({ name: e.target.value })}
                    variant="flat"
                    radius="xl"
                    required
                    className="w-full bg-zinc-50/50 dark:bg-zinc-900/30 border-none focus-within:ring-2 focus-within:ring-blue-500/20 transition-all rounded-xl overflow-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <div className="space-y-1">
                    <label className="text-zinc-900 dark:text-zinc-100 font-bold text-[10px] uppercase tracking-wider block ml-1">Stream Address</label>
                    <div className="relative flex items-center group/input">
                      <Input
                        size="sm"
                        placeholder="rtsp://your-camera-ip:554/stream"
                        value={formData.url}
                        onChange={e => setFormData({ url: e.target.value })}
                        variant="bordered"
                        radius="xl"
                        required
                        className="w-full bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 transition-colors rounded-xl pr-10 sm:pr-0"
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        variant="solid"
                        color="primary"
                        onPress={checkConnection}
                        disabled={!formData.url || isCheckingConn}
                        className="max-sm:flex hidden absolute right-1.5 h-7 w-7 min-w-0 bg-blue-500 text-white shadow-lg active:scale-95 transition-all z-30"
                      >
                        {isCheckingConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-500 pt-0.5 ml-1">RTSP and standard HTTP streams only.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider ml-1">Labels</label>
                  </div>
                  <SmartLabelInput
                    labels={formData.labels}
                    onChange={(newLabels) => setFormData({ labels: newLabels })}
                    variant="flat"
                    radius="xl"
                  />
                </div>

                <MagicCard className="bg-zinc-50/5 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-inner">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl transition-colors duration-500 ${formMetadata ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400'}`}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest leading-none">Stream Validation</span>
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">Automated Integrity Check</span>
                        </div>
                      </div>
                      {formMetadata ? (
                        <Chip
                          variant="flat"
                          color="success"
                          size="sm"
                          radius="lg"
                          classNames={{
                            base: "h-6 px-3 bg-emerald-500/10 border-none",
                            content: "text-[9px] font-black uppercase tracking-widest text-emerald-500"
                          }}
                          startContent={<div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1" />}
                        >
                          Valid
                        </Chip>
                      ) : (
                        <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-800/30 px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">Pending Test</span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <div className={`flex flex-col items-center p-2.5 rounded-xl transition-all duration-500 border ${formMetadata ? 'bg-blue-500/5 border-blue-500/10' : 'bg-zinc-50/50 dark:bg-zinc-900/50 border-transparent text-zinc-300 dark:text-zinc-600'}`}>
                        <span className="text-[8px] font-black uppercase tracking-widest mb-1.5 opacity-60">Res.</span>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100">{formMetadata?.resolution || '---'}</span>
                      </div>
                      <div className={`flex flex-col items-center p-2.5 rounded-xl transition-all duration-500 border ${formMetadata ? 'bg-blue-500/5 border-blue-500/10' : 'bg-zinc-50/50 dark:bg-zinc-900/50 border-transparent text-zinc-300 dark:text-zinc-600'}`}>
                        <span className="text-[8px] font-black uppercase tracking-widest mb-1.5 opacity-60">Codec</span>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase">{formMetadata?.codec || '---'}</span>
                      </div>
                      <div className={`flex flex-col items-center p-2.5 rounded-xl transition-all duration-500 border ${formMetadata ? 'bg-blue-500/5 border-blue-500/10' : 'bg-zinc-50/50 dark:bg-zinc-900/50 border-transparent text-zinc-300 dark:text-zinc-600'}`}>
                        <span className="text-[8px] font-black uppercase tracking-widest mb-1.5 opacity-60">FPS</span>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100">{formMetadata?.fps || '---'}</span>
                      </div>
                      <div className={`flex flex-col items-center p-2.5 rounded-xl transition-all duration-500 border ${formMetadata ? 'bg-blue-500/5 border-blue-500/10' : 'bg-zinc-50/50 dark:bg-zinc-900/50 border-transparent text-zinc-300 dark:text-zinc-600'}`}>
                        <span className="text-[8px] font-black uppercase tracking-widest mb-1.5 opacity-60">Protocol</span>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase">{formMetadata?.protocol || '---'}</span>
                      </div>
                    </div>
                  </div>
                </MagicCard>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 pb-1 border-t border-zinc-100 dark:border-zinc-800/50 mt-4 px-1">
                  <div className="flex items-center gap-2">
                    <Button
                      id="btn-test-connection"
                      type="button"
                      variant="flat"
                      color="secondary"
                      size="sm"
                      radius="xl"
                      onPress={checkConnection}
                      disabled={!formData.url || isCheckingConn}
                      startContent={isCheckingConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                      className="hidden sm:flex font-bold text-[10px] uppercase tracking-widest h-8 px-4"
                    >
                      Test Connection
                    </Button>
                    <Button
                      id="btn-cancel-single"
                      type="button"
                      variant="light"
                      size="sm"
                      radius="xl"
                      onPress={() => onOpenChange(false)}
                      className="font-bold text-[10px] uppercase tracking-widest text-zinc-500 h-8"
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button
                    id="btn-add-single"
                    type="button"
                    color="primary"
                    size="sm"
                    onPress={saveCamera}
                    radius="xl"
                    className="font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 px-6 h-9 bg-blue-500"
                    disabled={!formData.name || !formData.url || isCheckingConn}
                    startContent={!isCheckingConn && <VideoIcon className="w-3.5 h-3.5" />}
                  >
                    {isCheckingConn && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                    Add Source
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeAddTab === 'tab-batch' && (
            <div className="mt-4 animate-in fade-in duration-300 mb-2 flex-1 flex flex-col">
              <div className="flex flex-col items-center justify-center py-1 flex-1">
                {batchResults ? (
                  <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-500 w-full text-center px-4 flex-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
                      <div className="relative w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">Sync Established</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-bold uppercase tracking-[0.2em]">Registry Updated Successfully</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:border-emerald-500/30">
                        <span className="text-3xl font-black text-emerald-500 leading-none">{batchResults.added}</span>
                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mt-2">Ingested</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:border-amber-500/30">
                        <span className="text-3xl font-black text-amber-500 leading-none">{batchResults.skipped}</span>
                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mt-2">Skipped</p>
                      </div>
                    </div>
                    <Button
                      id="btn-back-registry"
                      type="button"
                      variant="flat"
                      fullWidth
                      radius="xl"
                      onPress={() => onOpenChange(false)}
                      className="font-bold uppercase tracking-widest text-[9px] h-10 mt-4 max-w-xs"
                    >
                      Back to Registry
                    </Button>
                  </div>
                ) : batchPreview.length > 0 ? (
                  <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <h4 className="text-[9px] font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-widest">Validation Queue</h4>
                      </div>
                      <button onClick={() => { setBatchPreview([]); }} className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase tracking-tighter transition-colors">Discard Draft</button>
                    </div>

                    {/* 3 cards stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-center transition-all hover:shadow-md">
                        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Ready</p>
                        <span className="text-lg font-black text-emerald-500">{batchPreview.filter(p => !p.isDuplicate && p.connectionStatus === 'online').length}</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-center transition-all hover:shadow-md">
                        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Failed</p>
                        <span className="text-lg font-black text-red-500">{batchPreview.filter(p => !p.isDuplicate && p.connectionStatus === 'offline').length}</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-center transition-all hover:shadow-md">
                        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Conflict</p>
                        <span className="text-lg font-black text-amber-500">{batchPreview.filter(p => p.isDuplicate).length}</span>
                      </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto w-full bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200/50 dark:divide-zinc-800/50 no-scrollbar">
                      {batchPreview.map((item, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <div className="flex-1 min-w-0 pr-4 text-left space-y-0.5">
                            <p className={`font-bold text-zinc-900 dark:text-zinc-100 truncate text-[13px] ${item.isDuplicate ? 'opacity-40' : ''}`}>
                              {item.name}
                            </p>
                            <p className={`text-[11px] text-zinc-500 font-mono truncate ${item.isDuplicate ? 'opacity-40' : ''}`}>
                              {item.url}
                            </p>
                          </div>
                          <div className="flex items-center shrink-0">
                            <Chip
                              size="md"
                              variant="flat"
                              color={
                                item.isDuplicate ? "warning" :
                                  item.connectionStatus === 'online' ? "success" :
                                    item.connectionStatus === 'testing' ? "primary" : "danger"
                              }
                              radius="lg"
                              className="h-6 text-[10px] font-black px-2.5 min-w-[65px] uppercase tracking-widest flex items-center justify-center border-none"
                            >
                              {item.isDuplicate ? "Conflict" : item.connectionStatus}
                            </Chip>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Batch Actions */}
                    <div className="flex flex-col gap-2 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          id="btn-import-healthy"
                          type="button"
                          variant="flat"
                          size="sm"
                          fullWidth
                          radius="xl"
                          onPress={() => saveBatch(false)}
                          className="font-bold text-[10px] uppercase tracking-widest h-9"
                          disabled={isBatchLoading || batchPreview.filter(p => !p.isDuplicate && p.connectionStatus === 'online').length === 0}
                        >
                          Import Healthy ({batchPreview.filter(p => !p.isDuplicate && p.connectionStatus === 'online').length})
                        </Button>
                        <Button
                          id="btn-import-all"
                          type="button"
                          color="primary"
                          size="sm"
                          fullWidth
                          onPress={() => saveBatch(true)}
                          radius="xl"
                          className="font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 h-9 bg-blue-500"
                          disabled={isBatchLoading || batchPreview.filter(p => !p.isDuplicate).length === 0}
                          startContent={!isBatchLoading && <Zap className="w-3.5 h-3.5" />}
                        >
                          {isBatchLoading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                          Override & Add All ({batchPreview.filter(p => !p.isDuplicate).length})
                        </Button>
                      </div>
                      <Button
                        id="btn-dismiss-draft"
                        type="button"
                        variant="light"
                        size="sm"
                        radius="xl"
                        onPress={() => onOpenChange(false)}
                        className="font-bold text-[10px] uppercase tracking-widest text-zinc-500 h-8 self-center"
                      >
                        Dismiss Draft
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex-col items-center justify-center p-4 w-full rounded-xl relative group overflow-hidden transition-all duration-300 border-2 border-dashed flex-1 flex my-auto ${isDragging ? 'bg-blue-500/5 border-blue-500 scale-[0.98] shadow-inner' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-900/10'}`}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
                      handleBatchImport(e);
                    }}
                  >
                    {isBatchLoading && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                        <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Scanning Manifest</p>
                      </div>
                    )}

                    <div className={`p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl mb-4 transition-all duration-500 ${isDragging ? 'bg-blue-600 border-blue-400 scale-110 rotate-3 shadow-xl shadow-blue-500/30' : 'shadow-sm group-hover:scale-105 group-hover:border-blue-500/30'}`}>
                      <FileUp className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className={`text-[14px] font-black tracking-tight ${isDragging ? 'text-blue-600' : 'text-zinc-900 dark:text-zinc-100 uppercase'}`}>Import Manager</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[240px] leading-tight font-medium">Drop your JSON or CSV manifest here to add multiple cameras at once.</p>
                    </div>
                    <Button
                      id="btn-browse-files"
                      type="button"
                      variant="flat"
                      color="primary"
                      size="sm"
                      radius="xl"
                      className="mt-6 font-bold h-9 text-[10px] uppercase tracking-widest px-8"
                      onPress={() => fileInputRef.current?.click()}
                      disabled={isBatchLoading}
                    >
                      Browse Files
                    </Button>
                  </div>
                )}

                <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv" onChange={handleBatchImport} />

                {!batchPreview.length && !batchResults && (
                  <div className="mt-4 w-full">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-center mb-2 italic">Sample Templates</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => downloadTemplate('csv')} className="group flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all">
                        <FileDown className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">CSV Template</span>
                      </button>
                      <button onClick={() => downloadTemplate('json')} className="group flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 transition-all">
                        <FileDown className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">JSON Template</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
