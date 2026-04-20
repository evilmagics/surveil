import React from 'react';
import { Loader2, AlertCircle, Info, Activity, FileUp, FileDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SmartLabelInput } from './ui/SmartLabelInput';
import { Badge } from './ui/Badge';
import { Dialog } from './ui/Dialog';

export function CameraModal({ 
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={editingCamera ? "Edit Camera Configuration" : "Add New Camera"}
      description={editingCamera ? "Modify camera details" : "Add a single camera or import multiple."}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{batchResults ? "Close" : "Cancel"}</Button>
          {(activeAddTab === 'single' || editingCamera) ? (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:hover:bg-blue-700" onClick={saveCamera} disabled={!formData.name || !formData.url || isCheckingConn}>
              {isCheckingConn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          ) : (
            batchPreview.length > 0 && !batchResults && (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:hover:bg-blue-700" onClick={saveBatch} disabled={isBatchLoading}>
                {isBatchLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save {batchPreview.filter(p => !p.isDuplicate).length} Cameras
              </Button>
            )
          )}
        </>
      }
    >
      {!editingCamera && (
        <div className="flex w-full mb-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg p-1">
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeAddTab === 'single' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`} 
            onClick={() => setActiveAddTab('single')}
          >
            Single Camera
          </button>
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeAddTab === 'batch' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`} 
            onClick={() => setActiveAddTab('batch')}
          >
            Batch Import
          </button>
        </div>
      )}
      
      {activeAddTab === 'single' || editingCamera ? (
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Camera Name <span className="text-red-500">*</span></label>
            <Input placeholder="Example: Front Parking Camera" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Stream URL (HTTP / RTSP) <span className="text-red-500">*</span></label>
            <div className="flex space-x-2">
              <Input placeholder="rtsp://admin:pass@192.168.1.10:554/stream" value={formData.url} onChange={e => { setFormData({ ...formData, url: e.target.value }); }} className="flex-1" />
              <Button variant="secondary" onClick={checkConnection} disabled={!formData.url || isCheckingConn}>
                {isCheckingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Connection"}
              </Button>
            </div>
            {connError && <p className="text-xs text-red-500 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {connError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Labels (Press Enter or Comma)</label>
            <SmartLabelInput
              labels={formData.labels}
              onChange={(newLabels) => setFormData({ ...formData, labels: newLabels })}
            />
          </div>

          <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center mb-2">
              <Info className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Auto Detected Metadata</span>
            </div>
            {formMetadata ? (
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div className="text-zinc-500 dark:text-zinc-400">Resolution: <span className="text-zinc-900 dark:text-zinc-100 font-mono ml-1">{formMetadata.resolution}</span></div>
                <div className="text-zinc-500 dark:text-zinc-400">Codec: <span className="text-zinc-900 dark:text-zinc-100 font-mono ml-1">{formMetadata.codec}</span></div>
                <div className="text-zinc-500 dark:text-zinc-400">FPS: <span className="text-zinc-900 dark:text-zinc-100 font-mono ml-1">{formMetadata.fps}</span></div>
                <div className="text-zinc-500 dark:text-zinc-400">Protocol: <span className="text-zinc-900 dark:text-zinc-100 font-mono ml-1">{formMetadata.protocol}</span></div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">Click "Test Connection" to automatically fetch resolution, encoder type, and protocol.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 min-h-[300px]">
          {batchResults ? (
            <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300 w-full py-8">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20">
                <Activity className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Batch Process Complete</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Successfully synchronized cameras with database</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-4">
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <span className="text-2xl font-bold text-emerald-500">{batchResults.added}</span>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mt-1">Added</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <span className="text-2xl font-bold text-amber-500">{batchResults.skipped}</span>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mt-1">Skipped</p>
                </div>
              </div>
            </div>
          ) : batchPreview.length > 0 ? (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-widest">Import Preview</h4>
                <button onClick={() => { setBatchPreview([]); }} className="text-xs text-red-500 hover:underline">Clear</button>
              </div>
              <div className="max-h-64 overflow-y-auto bg-white dark:bg-zinc-900/50 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {batchPreview.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-sm group">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">{item.url}</p>
                    </div>
                    <div>
                      {item.isDuplicate ? (
                        <Badge variant="warning" className="text-[9px]">Duplicate</Badge>
                      ) : (
                        <Badge variant="success" className="text-[9px]">Ready</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 text-center italic">Only "Ready" items will be added to the database.</p>
            </div>
          ) : (
            <div 
              className={`flex flex-col items-center justify-center p-12 mt-2 w-full rounded-2xl relative group overflow-hidden transition-all duration-300 ${isDragging ? 'bg-blue-50/80 dark:bg-blue-900/20 scale-[0.99] shadow-inner' : 'bg-zinc-50 dark:bg-zinc-900/50'}`}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsDragging(false); 
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleBatchImport({ target: { files: e.dataTransfer.files } });
                }
              }}
            >
              {isBatchLoading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center animate-in fade-in duration-300 pointer-events-none">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Parsing File...</p>
                </div>
              )}

              <div className={`p-4 shadow-md border rounded-full mb-4 transition-all duration-500 pointer-events-none ${isDragging ? 'bg-blue-600 border-blue-400 scale-110 shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
                <FileUp className={`w-8 h-8 transition-colors ${isDragging ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              </div>
              <p className={`text-base font-bold transition-all pointer-events-none ${isDragging ? 'text-blue-600 dark:text-blue-400 translate-y-[-2px]' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {isDragging ? 'Ready to Import!' : 'Drag and drop file here'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6 text-center max-w-[200px] pointer-events-none">
                Supports JSON and CSV template files
              </p>
              <Button size="sm" className={`transition-all ${isDragging ? 'opacity-0 scale-95 pointer-events-none' : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'}`} onClick={() => fileInputRef.current?.click()} disabled={isBatchLoading}>
                Browse From Computer
              </Button>
              
              {isDragging && <div className="absolute inset-0 border-4 border-blue-500/20 animate-pulse pointer-events-none"></div>}
            </div>
          )}
          
          {!batchPreview.length && !batchResults && (
            <div className="flex flex-col items-center mt-4 w-full bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">Need a template file format?</p>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => downloadTemplate('csv')} 
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all flex items-center"
                >
                  <FileDown className="w-3 h-3 mr-1" /> CSV Template
                </button>
                <button 
                  onClick={() => downloadTemplate('json')} 
                  className="text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline transition-all flex items-center"
                >
                  <FileDown className="w-3 h-3 mr-1" /> JSON Template
                </button>
              </div>
            </div>
          )}
          {connError && <p className="text-xs text-red-500 mt-4 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {connError}</p>}
        </div>
      )}
    </Dialog>
  );
}
