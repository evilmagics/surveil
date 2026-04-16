import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Video, Plus, Search, Filter, Trash2, Edit, RefreshCw,
    Wifi, WifiOff, AlertCircle, PlayCircle, Loader2, Info, ChevronLeft, ChevronRight, X,
    Maximize, Settings, Moon, Sun, Monitor, Type, Link as LinkIcon, Tags, Columns, List, LayoutGrid
} from 'lucide-react';

// --- MOCK TAURI BACKEND ---
// In a real Tauri app, this would call `window.__TAURI__.invoke(...)`
const mockDb = {
    cameras: Array.from({ length: 12 }).map((_, i) => ({
        id: i + 1,
        name: `Camera Area ${i + 1}`,
        url: i % 2 === 0 ? `rtsp://192.168.1.${10 + i}:554/stream` : `http://192.168.1.${10 + i}:8080/video`,
        labels: i % 3 === 0 ? ['Outdoor', 'Gate'] : ['Indoor', 'Corridor'],
        status: i === 3 ? 'disconnected' : 'connected',
        resolution: '1920x1080',
        fps: 30,
        codec: i % 2 === 0 ? 'H264' : 'MJPEG',
        protocol: i % 2 === 0 ? 'RTSP' : 'HTTP',
    }))
};

const invokeTauri = async (command, args = {}) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            switch (command) {
                case 'get_cameras':
                    resolve([...mockDb.cameras].reverse());
                    break;
                case 'check_connection':
                    if (args.url.includes('error')) reject("Connection failed or timed out");
                    else resolve({
                        resolution: args.url.includes('1080') ? '1920x1080' : '1280x720',
                        fps: 30,
                        codec: args.url.startsWith('rtsp') ? 'H265' : 'MJPEG',
                        protocol: args.url.startsWith('rtsp') ? 'RTSP' : 'HTTP',
                        status: 'connected'
                    });
                    break;
                case 'add_camera':
                    const newCam = { id: Date.now(), ...args.camera, status: 'connected' };
                    mockDb.cameras.push(newCam);
                    resolve(newCam);
                    break;
                case 'update_camera':
                    const index = mockDb.cameras.findIndex(c => c.id === args.id);
                    if (index !== -1) {
                        mockDb.cameras[index] = { ...mockDb.cameras[index], ...args.camera };
                        resolve(mockDb.cameras[index]);
                    } else reject("Camera not found");
                    break;
                case 'delete_camera':
                    mockDb.cameras = mockDb.cameras.filter(c => c.id !== args.id);
                    resolve(true);
                    break;
                case 'update_camera_state':
                    // Simulate saving state to database
                    resolve(true);
                    break;
                default:
                    reject("Unknown command");
            }
        }, 600); // Simulate network/DB delay
    });
};

// --- SHADCN UI REPLICA COMPONENTS ---
const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 active:scale-95 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        default: "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        outline: "border border-zinc-200 bg-transparent hover:bg-zinc-100 text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-100",
        secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        ghost: "hover:bg-zinc-100 text-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
    };
    const sizes = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9",
    };
    return (
        <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Input = React.forwardRef(({ className = '', ...props }, ref) => (
    <input
        ref={ref}
        className={`flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 dark:text-zinc-100 ${className}`}
        {...props}
    />
));

const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-500",
        destructive: "bg-red-500/15 text-red-600 dark:text-red-500",
        warning: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500",
        outline: "border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
    };
    return (
        <div className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};

const Dialog = ({ open, onOpenChange, children, title, description, footer }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => onOpenChange(false)}>
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col space-y-1.5 p-6 pb-4">
                    <h2 className="text-xl font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
                    {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
                </div>
                <div className="p-6 pt-0">
                    {children}
                </div>
                {footer && (
                    <div className="flex items-center justify-end space-x-2 p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SMART LABEL INPUT COMPONENT ---
const SmartLabelInput = ({ labels = [], onChange }) => {
    const [inputValue, setInputValue] = useState('');

    const addLabel = (text) => {
        const newLabel = text.trim();
        if (newLabel && !labels.includes(newLabel)) {
            onChange([...labels, newLabel]);
        }
        setInputValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addLabel(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '') {
            e.preventDefault();
            if (labels.length > 0) {
                onChange(labels.slice(0, -1));
            }
        }
    };

    const removeLabel = (labelToRemove) => {
        onChange(labels.filter(label => label !== labelToRemove));
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 min-h-[36px] w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-300">
            {labels.map((label, idx) => (
                <Badge key={idx} variant="secondary" className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100">
                    {label}
                    <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white focus:outline-none rounded-full p-0.5 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </Badge>
            ))}
            <input
                type="text"
                className="flex-1 bg-transparent outline-none min-w-[120px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 px-1.5 py-0.5"
                placeholder={labels.length === 0 ? "Type tag and press Enter..." : ""}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addLabel(inputValue)}
            />
        </div>
    );
};

// --- CAMERA CARD COMPONENT ---
const CameraCard = ({ camera, index = 0, onEdit, onDelete, onStateUpdate, onDetail, prefs, onTheater }) => {
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
                        {camera.protocol === 'HTTP' ? (
                            <img src={`https://picsum.photos/seed/${camera.id}/640/360`} className="w-full h-full object-cover opacity-80" alt="stream mock" />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                                <PlayCircle className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-xs font-medium">RTSP Stream (Decoded)</span>
                            </div>
                        )}

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
                ) : status === 'reconnecting' ? (
                    <div className="flex flex-col items-center text-yellow-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs font-medium">Reconnecting ({retryCount}/5)...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-red-500">
                        <WifiOff className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Disconnected</span>
                        {retryCount >= 5 && <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 mb-2">Max retries reached</span>}
                        <Button variant="outline" size="sm" className="mt-2 h-7 px-3 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/20 bg-black/50" onClick={() => handleReconnect(true)} disabled={isReconnecting}>
                            <RefreshCw className="w-3 h-3 mr-1.5" /> Reconnect
                        </Button>
                    </div>
                )}

                {/* Action Buttons Overlay (Top Right) */}
                <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-transparent hover:bg-transparent dark:hover:bg-transparent text-white/80 hover:text-white border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onDetail(camera); }} title="Detail Source">
                        <Info className="w-4 h-4" />
                    </Button>
                    {!prefs.monitoringMode && (
                        <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-transparent hover:bg-transparent dark:hover:bg-transparent text-white/80 hover:text-blue-400 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onEdit(camera); }} title="Edit Camera">
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-transparent hover:bg-transparent dark:hover:bg-transparent text-white/80 hover:text-red-400 border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onDelete(camera); }} title="Delete Camera">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Action Buttons Overlay (Bottom Right) - Fullscreen & Theater */}
                <div className="absolute bottom-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-transparent hover:bg-transparent dark:hover:bg-transparent text-white/80 hover:text-white border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onTheater(camera); }} title="Theater Mode">
                        <Monitor className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-transparent hover:bg-transparent dark:hover:bg-transparent text-white/80 hover:text-white border-none shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" onClick={handleFullscreen} title="Fullscreen">
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

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
    const [cameras, setCameras] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    const [deletingCamera, setDeletingCamera] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ name: '', url: '', labels: [] });
    const [formMetadata, setFormMetadata] = useState(null);
    const [isCheckingConn, setIsCheckingConn] = useState(false);
    const [connError, setConnError] = useState('');

    // Preferences & Detail State
    const [prefs, setPrefs] = useState({
        showName: false,
        showSource: false,
        showTags: false,
        theme: 'dark',
        columns: '3',
        itemsPerPage: 12,
        monitoringMode: false
    });
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [selectedCameraDetails, setSelectedCameraDetails] = useState(null);
    const [theaterCamera, setTheaterCamera] = useState(null);
    const [showMonitorToast, setShowMonitorToast] = useState(false);

    // Keyboard Shortcut Effect
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key.toLowerCase() === 'm' && e.altKey) {
                e.preventDefault();
                setPrefs(p => ({ ...p, monitoringMode: !p.monitoringMode }));
            } else if (e.key === 'Escape' && prefs.monitoringMode) {
                setPrefs(p => ({ ...p, monitoringMode: false }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prefs.monitoringMode]);

    // Toast Notification Effect
    useEffect(() => {
        if (prefs.monitoringMode) {
            setShowMonitorToast(true);
            const t = setTimeout(() => setShowMonitorToast(false), 4000);
            return () => clearTimeout(t);
        } else {
            setShowMonitorToast(false);
        }
    }, [prefs.monitoringMode]);

    const loadCameras = async () => {
        setIsLoading(true);
        try {
            const data = await invokeTauri('get_cameras');
            setCameras(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCameras();
    }, []);

    const filteredCameras = useMemo(() => {
        const s = search.toLowerCase();
        return cameras.filter(c =>
            c.name.toLowerCase().includes(s) ||
            c.labels.some(l => l.toLowerCase().includes(s))
        );
    }, [cameras, search]);

    const paginatedCameras = useMemo(() => {
        const start = (page - 1) * prefs.itemsPerPage;
        return filteredCameras.slice(start, start + prefs.itemsPerPage);
    }, [filteredCameras, page, prefs.itemsPerPage]);

    const totalPages = Math.ceil(filteredCameras.length / prefs.itemsPerPage);

    const handleOpenAdd = () => {
        setEditingCamera(null);
        setFormData({ name: '', url: '', labels: [] });
        setFormMetadata(null);
        setConnError('');
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (camera) => {
        setEditingCamera(camera);
        setFormData({ name: camera.name, url: camera.url, labels: [...camera.labels] });
        setFormMetadata({
            resolution: camera.resolution, codec: camera.codec, protocol: camera.protocol, fps: camera.fps
        });
        setConnError('');
        setIsAddModalOpen(true);
    };

    const handleCheckConnectionForm = async () => {
        if (!formData.url) return;
        setIsCheckingConn(true);
        setConnError('');
        try {
            const metadata = await invokeTauri('check_connection', { url: formData.url });
            setFormMetadata(metadata);
        } catch (e) {
            setConnError(e.toString());
            setFormMetadata(null);
        } finally {
            setIsCheckingConn(false);
        }
    };

    const handleSaveCamera = async () => {
        if (!formData.name || !formData.url) return;

        // Auto check if metadata is missing
        let finalMetadata = formMetadata;
        if (!finalMetadata) {
            try {
                finalMetadata = await invokeTauri('check_connection', { url: formData.url });
            } catch (e) {
                setConnError("Connection failed, cannot save."); return;
            }
        }

        const payload = {
            name: formData.name,
            url: formData.url,
            labels: formData.labels,
            ...finalMetadata
        };

        try {
            if (editingCamera) {
                await invokeTauri('update_camera', { id: editingCamera.id, camera: payload });
            } else {
                await invokeTauri('add_camera', { camera: payload });
            }
            setIsAddModalOpen(false);
            loadCameras();
        } catch (e) {
            setConnError("Failed to save to database.");
        }
    };

    const confirmDelete = async () => {
        if (!deletingCamera) return;
        try {
            await invokeTauri('delete_camera', { id: deletingCamera.id });
            setIsDeleteModalOpen(false);
            if (paginatedCameras.length === 1 && page > 1) setPage(p => p - 1);
            loadCameras();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const handleStateUpdate = useCallback((id, status) => {
        invokeTauri('update_camera_state', { id, status }).catch(console.error);
        setCameras(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    }, []);

    // Determine dynamic grid columns based on preferences
    const getGridClass = () => {
        switch (prefs.columns) {
            case '1': return 'grid-cols-1';
            case '2': return 'grid-cols-1 sm:grid-cols-2';
            case '3': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
            case '4': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
            default: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'; // Default
        }
    };

    return (
        <div className={prefs.theme === 'dark' ? 'dark' : ''}>
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30 transition-colors duration-500 flex flex-col overflow-x-hidden">

                {/* Animated Top Navbar */}
                <header className={`sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center ${prefs.monitoringMode ? 'h-0 opacity-0 border-b-0' : 'h-16 opacity-100 border-b'}`}>
                    <div className="container mx-auto px-4 w-full flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">Surveil<span className="text-blue-500">Core</span></h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="relative w-64 hidden md:block">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Search tags or name..."
                                    className="pl-9 bg-zinc-50 dark:bg-zinc-900/50"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20 border-none dark:hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" /> Add Camera
                            </Button>
                            <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
                            <Button variant="ghost" size="icon" className="hidden sm:flex text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" onClick={() => setPrefs(p => ({ ...p, monitoringMode: true }))} title="Monitoring Mode">
                                <LayoutGrid className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className={`container mx-auto flex-1 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${prefs.monitoringMode ? 'px-2 py-2' : 'px-4 py-8'}`}>

                    {/* Animated Search & Filter Title Area */}
                    <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${prefs.monitoringMode ? 'max-h-0 opacity-0 mb-0' : 'max-h-[200px] opacity-100 mb-6'}`}>
                        {/* Mobile Search */}
                        <div className="relative w-full mb-6 md:hidden">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="Search tags or name..."
                                className="pl-9 bg-zinc-50 dark:bg-zinc-900/50"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                Camera List <span className="text-zinc-500 text-sm font-normal ml-2">({filteredCameras.length} sources)</span>
                            </h2>
                            <Button variant="outline" size="sm" className="hidden sm:flex">
                                <Filter className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" /> Filter
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Loading camera configurations...</p>
                        </div>
                    ) : paginatedCameras.length > 0 ? (
                        <div className={`grid ${getGridClass()} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${prefs.monitoringMode ? 'gap-2' : 'gap-6'}`}>
                            {paginatedCameras.map((cam, index) => (
                                <CameraCard
                                    key={cam.id}
                                    index={index}
                                    camera={cam}
                                    prefs={prefs}
                                    onTheater={setTheaterCamera}
                                    onEdit={handleOpenEdit}
                                    onDelete={(c) => { setDeletingCamera(c); setIsDeleteModalOpen(true); }}
                                    onStateUpdate={handleStateUpdate}
                                    onDetail={setSelectedCameraDetails}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl">
                            <Video className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No cameras found</p>
                            <p className="text-sm mt-1 mb-4 text-center max-w-md">Please add a new source or change your search keywords.</p>
                            <Button onClick={handleOpenAdd} variant="secondary">Add First Source</Button>
                        </div>
                    )}

                    {/* Animated Pagination */}
                    <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex-shrink-0 ${prefs.monitoringMode || totalPages <= 1 ? 'max-h-0 opacity-0 mt-0 pt-0' : 'max-h-24 opacity-100 mt-auto pt-6'}`}>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-zinc-500">
                                    Showing {((page - 1) * prefs.itemsPerPage) + 1} to {Math.min(page * prefs.itemsPerPage, filteredCameras.length)} of {filteredCameras.length}
                                </p>
                                <div className="flex space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Animated Footer */}
                <footer className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col items-center justify-center ${prefs.monitoringMode ? 'h-0 opacity-0 py-0 border-t-0 border-transparent' : 'h-24 opacity-100 py-8 border-t border-zinc-200 dark:border-zinc-800/50 mt-auto'}`}>
                    <div className="container mx-auto px-4 flex flex-col items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                        <p className="mb-1">&copy; {new Date().getFullYear()} SurveilCore App.</p>
                        <p>
                            Project created by <a href="https://github.com/evilmagics" target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">@evilmagics</a>
                        </p>
                    </div>
                </footer>

                {/* MODAL: ADD/UPDATE CAMERA */}
                <Dialog
                    open={isAddModalOpen}
                    onOpenChange={setIsAddModalOpen}
                    title={editingCamera ? "Edit Camera Configuration" : "Add New Camera"}
                    description="Enter the HTTP or RTSP stream source details."
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:hover:bg-blue-700" onClick={handleSaveCamera} disabled={!formData.name || !formData.url || isCheckingConn}>
                                {isCheckingConn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Configuration
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Camera Name <span className="text-red-500">*</span></label>
                            <Input placeholder="Example: Front Parking Camera" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Stream URL (HTTP / RTSP) <span className="text-red-500">*</span></label>
                            <div className="flex space-x-2">
                                <Input placeholder="rtsp://admin:pass@192.168.1.10:554/stream" value={formData.url} onChange={e => { setFormData({ ...formData, url: e.target.value }); setFormMetadata(null); }} className="flex-1" />
                                <Button variant="secondary" onClick={handleCheckConnectionForm} disabled={!formData.url || isCheckingConn}>
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

                        {/* Metadata Detector Display */}
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
                </Dialog>

                {/* MODAL: DELETE CONFIRMATION */}
                <Dialog
                    open={isDeleteModalOpen}
                    onOpenChange={setIsDeleteModalOpen}
                    title="Confirm Deletion"
                    description="This action cannot be undone. The camera metadata will be permanently removed from the local database."
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={confirmDelete}>Delete Camera</Button>
                        </>
                    }
                >
                    <div className="py-2">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-white">{deletingCamera?.name}</span>?</p>
                    </div>
                </Dialog>

                {/* DETAIL SIDEBAR BACKDROP */}
                {selectedCameraDetails && (
                    <div
                        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                        onClick={() => setSelectedCameraDetails(null)}
                    />
                )}

                {/* DETAIL SIDEBAR */}
                <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedCameraDetails ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
                    {selectedCameraDetails && (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center">
                                    <Info className="w-5 h-5 mr-2 text-blue-500" /> Source Detail
                                </h3>
                                <button onClick={() => setSelectedCameraDetails(null)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6 flex-1">
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Camera Name</label>
                                    <p className="font-medium text-base text-zinc-900 dark:text-zinc-100 mt-1">{selectedCameraDetails.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">URL / Source</label>
                                    <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 font-mono">{selectedCameraDetails.url}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</label>
                                        <div className="mt-1">
                                            <Badge variant={selectedCameraDetails.status === 'connected' ? 'success' : 'destructive'} className="uppercase text-[10px]">
                                                {selectedCameraDetails.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Data ID</label>
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 font-mono">{selectedCameraDetails.id}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Resolution</label>
                                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{selectedCameraDetails.resolution}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">FPS</label>
                                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{selectedCameraDetails.fps}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Codec</label>
                                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{selectedCameraDetails.codec}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Protocol</label>
                                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mt-1">{selectedCameraDetails.protocol}</p>
                                    </div>
                                </div>
                                {selectedCameraDetails.labels.length > 0 && (
                                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">Labels (Tags)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCameraDetails.labels.map((lbl, idx) => (
                                                <Badge key={idx} variant="secondary">{lbl}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* THEATER MODE MODAL (Dialog-like) */}
                {theaterCamera && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 transition-opacity animate-in fade-in duration-300" onClick={() => setTheaterCamera(null)}>

                        {/* The Dialog Card */}
                        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden group animate-in zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" onClick={e => e.stopPropagation()}>

                            {/* Stream Area */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                {theaterCamera.protocol === 'HTTP' ? (
                                    <img src={`https://picsum.photos/seed/${theaterCamera.id}/1920/1080`} className="w-full h-full object-cover" alt="stream mock" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-zinc-600">
                                        <PlayCircle className="w-16 h-16 mb-4 opacity-40" />
                                        <span className="text-base font-medium text-zinc-500">RTSP Stream (Decoded)</span>
                                    </div>
                                )}
                            </div>

                            {/* Status Badges Always Visible */}
                            <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
                                <Badge variant="success" className="bg-black/50 backdrop-blur-md border-zinc-800/50 text-emerald-400 px-2 py-1 shadow-md">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> REC
                                </Badge>
                            </div>

                            {/* Gradient Bottom (For Text Readability) */}
                            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            {/* Hover Overlay: Close Button (Top Right) */}
                            <button onClick={() => setTheaterCamera(null)} className="absolute top-4 right-4 z-50 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 scale-95 hover:scale-100 border border-white/10">
                                <X className="w-5 h-5" />
                            </button>

                            {/* Hover Overlay: Camera Info (Bottom Left) */}
                            <div className="absolute bottom-5 left-5 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <h3 className="text-lg font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
                                    <Monitor className="w-4 h-4 mr-2 text-blue-400" /> {theaterCamera.name}
                                </h3>
                                <p className="text-xs text-zinc-300 font-mono mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
                                    <LinkIcon className="w-3 h-3 mr-1.5 opacity-70" /> {theaterCamera.url}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MONITORING MODE TOAST OVERLAY */}
                {showMonitorToast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center animate-in fade-in slide-in-from-top-4 duration-300">
                        <Info className="w-5 h-5 mr-3 text-blue-400" />
                        <span>Press <kbd className="bg-white/20 px-2 py-0.5 rounded text-sm mx-1 font-mono">Alt + M</kbd> or <kbd className="bg-white/20 px-2 py-0.5 rounded text-sm mx-1 font-mono">ESC</kbd> to exit monitoring mode.</span>
                    </div>
                )}

                {/* PREFERENCES BACKDROP */}
                {isPreferencesOpen && (
                    <div className="fixed inset-0 z-30" onClick={() => setIsPreferencesOpen(false)} />
                )}

                {/* PREFERENCES BUTTON & MENU */}
                {!prefs.monitoringMode && (
                    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
                        {isPreferencesOpen && (
                            <div className="mb-4 p-5 w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-200 ease-out relative z-40">
                                <h3 className="text-lg font-semibold mb-5 text-zinc-900 dark:text-zinc-50 flex items-center">
                                    <Settings className="w-5 h-5 mr-2 text-blue-500" /> UI Preferences
                                </h3>

                                <div className="space-y-4">
                                    {/* Category: Visibility */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Visibility</h4>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                    <Type className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Name
                                                </span>
                                                <button
                                                    className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.showName ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                    onClick={() => setPrefs(p => ({ ...p, showName: !p.showName }))}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.showName ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                    <LinkIcon className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Source
                                                </span>
                                                <button
                                                    className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.showSource ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                    onClick={() => setPrefs(p => ({ ...p, showSource: !p.showSource }))}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.showSource ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                    <Tags className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Tags
                                                </span>
                                                <button
                                                    className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.showTags ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                    onClick={() => setPrefs(p => ({ ...p, showTags: !p.showTags }))}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.showTags ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Category: Layout */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Layout Settings</h4>

                                        <div className="flex items-center justify-between py-1.5 mb-1.5">
                                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                <LayoutGrid className="w-4 h-4 mr-2.5 text-zinc-400" /> Monitoring Mode
                                            </span>
                                            <button
                                                className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.monitoringMode ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                onClick={() => setPrefs(p => ({ ...p, monitoringMode: !p.monitoringMode }))}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.monitoringMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between py-1.5 mb-1.5">
                                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                <Columns className="w-4 h-4 mr-2.5 text-zinc-400" /> Grid Columns
                                            </span>
                                            <select
                                                className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                value={prefs.columns}
                                                onChange={(e) => setPrefs(p => ({ ...p, columns: e.target.value }))}
                                            >
                                                <option value="1">1 Column</option>
                                                <option value="2">2 Columns</option>
                                                <option value="3">3 Columns</option>
                                                <option value="4">4 Columns</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between py-1.5">
                                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                <List className="w-4 h-4 mr-2.5 text-zinc-400" /> Limit Per Page
                                            </span>
                                            <select
                                                className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                value={prefs.itemsPerPage}
                                                onChange={(e) => {
                                                    setPrefs(p => ({ ...p, itemsPerPage: Number(e.target.value) }));
                                                    setPage(1); // Reset page on limit change
                                                }}
                                            >
                                                <option value={8}>8 Items</option>
                                                <option value={12}>12 Items</option>
                                                <option value={24}>24 Items</option>
                                                <option value={48}>48 Items</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Category: Appearance */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Appearance</h4>
                                        <div className="flex items-center justify-between py-1.5">
                                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                                {prefs.theme === 'dark' ? <Moon className="w-4 h-4 mr-2.5 text-zinc-400" /> : <Sun className="w-4 h-4 mr-2.5 text-zinc-400" />}
                                                Theme Mode
                                            </span>
                                            <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
                                                <button
                                                    className={`p-1.5 rounded-md transition-colors ${prefs.theme === 'light' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                                    onClick={() => setPrefs(p => ({ ...p, theme: 'light' }))}
                                                    title="Light Mode"
                                                >
                                                    <Sun className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    className={`p-1.5 rounded-md transition-colors ${prefs.theme === 'dark' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    onClick={() => setPrefs(p => ({ ...p, theme: 'dark' }))}
                                                    title="Dark Mode"
                                                >
                                                    <Moon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                        <Button
                            size="icon"
                            className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 relative z-40 ${isPreferencesOpen ? 'rotate-90 bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30'} border border-transparent dark:border-white/5 hover:scale-105`}
                            onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                            title="UI Settings"
                        >
                            <Settings className="w-6 h-6" />
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
}