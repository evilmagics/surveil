import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Video, Plus, Search, Filter, Trash2, Edit, RefreshCw,
    Wifi, WifiOff, AlertCircle, PlayCircle, Loader2, Info, ChevronLeft, ChevronRight, X,
    Maximize, Settings, Moon, Sun, Monitor, Type, Link as LinkIcon, Tags, Columns, List, LayoutGrid, Activity, Camera, FileUp, FileDown
} from 'lucide-react';

import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

import { invokeTauri } from './lib/utils';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Badge } from './components/ui/Badge';
import { Dialog } from './components/ui/Dialog';
import { SmartLabelInput } from './components/ui/SmartLabelInput';
import { LiveStreamVideo } from './components/camera/LiveStreamVideo';
import { CameraCard } from './components/camera/CameraCard';

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
    const [cameras, setCameras] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isAppStarting, setIsAppStarting] = useState(true);

    // Filter & Sort state
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', dir: 'desc' });
    const [filterProtocol, setFilterProtocol] = useState('All');

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
    const fileInputRef = useRef(null);
    const [activeAddTab, setActiveAddTab] = useState('single');
    const [isDragging, setIsDragging] = useState(false);
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [batchPreview, setBatchPreview] = useState([]);
    const [batchResults, setBatchResults] = useState(null);

    const getHostAndPort = (urlString) => {
        try {
            const u = new URL(urlString);
            return `${u.hostname}:${u.port || (u.protocol.startsWith('rtsp') ? '554' : '80')}`;
        } catch {
            return urlString;
        }
    };

    const isDuplicate = (urlToCheck, currentId = null) => {
        const target = getHostAndPort(urlToCheck);
        return cameras.some(c => c.id !== currentId && getHostAndPort(c.url) === target);
    };

    // Preferences & Detail State
    const [prefs, setPrefs] = useState({
        showName: false,
        showSource: false,
        showTags: false,
        theme: 'dark',
        columns: '3',
        itemsPerPage: 12,
        monitoringMode: false,
        fpsLimit: 15
    });
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [selectedCameraDetails, setSelectedCameraDetails] = useState(null);
    const [theaterCamera, setTheaterCamera] = useState(null);
    const [showMonitorToast, setShowMonitorToast] = useState(false);

    // Apply Dark/Light mode class universally
    useEffect(() => {
        if (prefs.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [prefs.theme]);

    useEffect(() => {
        if (!isAppStarting) {
            invokeTauri('save_preferences', { prefs }).catch(console.error);
        }
    }, [prefs, isAppStarting]);

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
            const dbPrefs = await invokeTauri('get_preferences');
            if (dbPrefs) {
                setPrefs(prev => ({ ...prev, ...dbPrefs }));
                if (dbPrefs.theme === 'dark') document.documentElement.classList.add('dark');
            }
            const data = await invokeTauri('get_cameras');
            setCameras(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
            if (isAppStarting) setTimeout(() => setIsAppStarting(false), 800);
        }
    };

    useEffect(() => {
        loadCameras();
    }, []);

    const filteredCameras = useMemo(() => {
        const s = search.toLowerCase();
        let result = cameras.filter(c =>
            c.name.toLowerCase().includes(s) ||
            c.labels.some(l => l.toLowerCase().includes(s))
        );

        if (filterProtocol !== 'All') {
            result = result.filter(c => c.protocol && c.protocol.toUpperCase() === filterProtocol.toUpperCase());
        }

        result.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (sortConfig.key === 'created_at') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else {
                valA = valA?.toString().toLowerCase() || '';
                valB = valB?.toString().toLowerCase() || '';
            }

            if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [cameras, search, filterProtocol, sortConfig]);

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
        setBatchPreview([]);
        setBatchResults(null);
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

        if (isDuplicate(formData.url, editingCamera?.id)) {
            setConnError("A camera with this IP/Host and Port is already registered.");
            return;
        }

        // Always fetch latest metadata before saving/updating
        setIsCheckingConn(true);
        let finalMetadata = null;
        try {
            finalMetadata = await invokeTauri('check_connection', { url: formData.url });
        } catch (e) {
            console.warn("Auto-metadata fetch failed during save, using offline defaults:", e);
            finalMetadata = {
                status: "offline",
                resolution: "Unknown",
                codec: "Unknown",
                fps: 0,
                protocol: "Unknown"
            };
        } finally {
            setIsCheckingConn(false);
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

    const handleBatchImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'json' && ext !== 'csv') {
            setConnError("Invalid file type. Only JSON and CSV files are allowed.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsBatchLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                let camerasToAdd = [];
                if (ext === 'json') {
                    const raw = JSON.parse(text);
                    camerasToAdd = raw.map(c => ({
                        name: c.name || "Unnamed Camera",
                        url: c.url || "",
                        labels: c.labels || [],
                        status: "disconnected",
                        resolution: "Unknown",
                        codec: "Unknown",
                        fps: 0,
                        protocol: "Unknown"
                    }));
                } else if (ext === 'csv') {
                    const lines = text.split('\n').filter(l => l.trim());
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    const nameIdx = headers.indexOf('name');
                    const urlIdx = headers.indexOf('url');
                    const labelsIdx = headers.indexOf('labels');
                    
                    if (nameIdx === -1 || urlIdx === -1) {
                        setConnError("CSV must contain 'name' and 'url' headers.");
                        setIsBatchLoading(false);
                        return;
                    }

                    for (let i = 1; i < lines.length; i++) {
                        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(item => item.trim().replace(/^"|"$/g, ''));
                        const name = row[nameIdx];
                        const url = row[urlIdx];
                        let labels = [];
                        if (labelsIdx !== -1 && row[labelsIdx]) {
                            labels = row[labelsIdx].split(';').map(l => l.trim()).filter(l => l);
                        }
                        if (name && url) {
                            camerasToAdd.push({ 
                                name, url, labels, 
                                status: "disconnected",
                                resolution: "Unknown", 
                                codec: "Unknown", 
                                fps: 0, 
                                protocol: "Unknown" 
                            });
                        }
                    }
                }
                
                // Set to preview instead of directly adding
                setBatchPreview(camerasToAdd.map(c => ({
                    ...c,
                    isDuplicate: isDuplicate(c.url)
                })));
                setConnError("");
            } catch (err) {
                console.error("Batch parse failed", err);
                setConnError("Failed to parse file. Ensure it's valid.");
            } finally {
                setIsBatchLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleSaveBatch = async () => {
        if (batchPreview.length === 0) return;
        setIsBatchLoading(true);
        let added = 0;
        let skipped = 0;

        try {
            for (const cam of batchPreview) {
                if (!cam.isDuplicate) {
                    // Always check connection and fetch metadata for batch imports too
                    let batchMetadata = {
                        status: "offline",
                        resolution: "Unknown",
                        codec: "Unknown",
                        fps: 0,
                        protocol: "Unknown"
                    };

                    try {
                        const meta = await invokeTauri('check_connection', { url: cam.url });
                        batchMetadata = meta;
                    } catch (e) {
                        console.warn(`Batch metadata fetch failed for ${cam.name}:`, e);
                    }

                    const finalCam = { ...cam, ...batchMetadata };
                    await invokeTauri('add_camera', { camera: finalCam });
                    added++;
                } else {
                    skipped++;
                }
            }
            await loadCameras();
            setBatchResults({ added, skipped });
            setBatchPreview([]);
        } catch (e) {
            setConnError(`Database Error: ${e.toString()}`);
            console.error("Batch Import Failed:", e);
        } finally {
            setIsBatchLoading(false);
        }
    };

    const handleDownloadTemplate = async (type = 'csv') => {
        let content, filename;
        if (type === 'json') {
            content = JSON.stringify([
                { name: "Main Gate", url: "rtsp://admin:pass@192.168.1.10:554/stream", labels: ["outdoor", "gate"] },
                { name: "Lobby", url: "rtsp://admin:pass@192.168.1.11:554/stream", labels: ["indoor"] }
            ], null, 4);
            filename = "surveil_batch_template.json";
        } else {
            content = `name,url,labels\nMain Gate,rtsp://admin:pass@192.168.1.10:554/stream,"outdoor;gate"\nLobby,rtsp://admin:pass@192.168.1.11:554/stream,"indoor"`;
            filename = "surveil_batch_template.csv";
        }
        
        try {
            await invokeTauri('save_template_file', { content, filename });
        } catch (e) {
            console.error("Failed to save template file:", e);
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

    // Startup loading screen
    if (isAppStarting) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center transition-colors duration-500">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/30 animate-pulse mb-6">
                    <Video className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Sur<span className="text-blue-500">veil</span></h1>
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30 transition-colors duration-500 flex flex-col overflow-x-hidden">

                {/* Animated Top Navbar */}
                <header className={`sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center ${prefs.monitoringMode ? 'h-0 opacity-0 border-b-0' : 'h-16 opacity-100 border-b'}`}>
                    <div className="container mx-auto px-4 w-full flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">Sur<span className="text-blue-500">veil</span></h1>
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
                            <input type="file" ref={fileInputRef} onChange={handleBatchImport} accept=".csv,.json" className="hidden" />
                            <Button size="icon" onClick={handleOpenAdd} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm" title="Add Camera">
                                <div className="relative">
                                    <Video className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                    <Plus className="w-4 h-4 absolute -bottom-1.5 -right-1.5 text-blue-500" />
                                </div>
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
                            <div className="flex items-center space-x-2">
                                <select 
                                    className="bg-transparent border border-zinc-200 dark:border-zinc-800 text-sm rounded-md px-2 py-1 outline-none focus:border-blue-500"
                                    value={filterProtocol} 
                                    onChange={(e) => setFilterProtocol(e.target.value)}
                                    title="Filter by Protocol"
                                >
                                    <option value="All">All Protocols</option>
                                    <option value="RTSP">RTSP</option>
                                    <option value="HTTP">HTTP</option>
                                </select>
                                <div className="flex items-center space-x-1 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md px-1 py-1">
                                    <select 
                                        className="bg-transparent text-sm border-none outline-none pr-1"
                                        value={sortConfig.key} 
                                        onChange={(e) => setSortConfig(c => ({...c, key: e.target.value}))}
                                        title="Sort Field"
                                    >
                                        <option value="created_at">Date Added</option>
                                        <option value="name">Name</option>
                                    </select>
                                    <button 
                                        onClick={() => setSortConfig(c => ({...c, dir: c.dir === 'asc' ? 'desc' : 'asc'}))}
                                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                                        title={sortConfig.dir === 'asc' ? 'Ascending' : 'Descending'}
                                    >
                                        {sortConfig.dir === 'asc' ? <ChevronLeft className="w-3.5 h-3.5 rotate-90" /> : <ChevronRight className="w-3.5 h-3.5 -rotate-90" />}
                                    </button>
                                </div>
                            </div>
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
                            <Button onClick={handleOpenAdd} variant="secondary">Add Source</Button>
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
                        <p className="mb-1">&copy; {new Date().getFullYear()} Surveil App.</p>
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
                    description={editingCamera ? "Modify camera details" : "Add a single camera or import multiple."}
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>{batchResults ? "Close" : "Cancel"}</Button>
                            {(activeAddTab === 'single' || editingCamera) ? (
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:hover:bg-blue-700" onClick={handleSaveCamera} disabled={!formData.name || !formData.url || isCheckingConn}>
                                    {isCheckingConn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Configuration
                                </Button>
                            ) : (
                                batchPreview.length > 0 && !batchResults && (
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:hover:bg-blue-700" onClick={handleSaveBatch} disabled={isBatchLoading}>
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
                                        <button onClick={() => { setBatchPreview([]); setConnError(''); }} className="text-xs text-red-500 hover:underline">Clear</button>
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
                                            onClick={() => handleDownloadTemplate('csv')} 
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all flex items-center"
                                        >
                                            <FileDown className="w-3 h-3 mr-1" /> CSV Template
                                        </button>
                                        <button 
                                            onClick={() => handleDownloadTemplate('json')} 
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
                                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500 uppercase tracking-widest font-medium">Created At</span>
                                        <span className="text-zinc-400 font-mono uppercase">
                                            {selectedCameraDetails.created_at ? new Date(selectedCameraDetails.created_at).toLocaleString('id-ID') : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500 uppercase tracking-widest font-medium">Last Updated</span>
                                        <span className="text-zinc-400 font-mono uppercase">
                                            {selectedCameraDetails.updated_at ? new Date(selectedCameraDetails.updated_at).toLocaleString('id-ID') : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500 uppercase tracking-widest font-medium">Last Seen</span>
                                        <span className="text-zinc-400 font-mono uppercase">
                                            {selectedCameraDetails.last_connected_at ? new Date(selectedCameraDetails.last_connected_at).toLocaleString('id-ID') : '-'}
                                        </span>
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
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <LiveStreamVideo camera={theaterCamera} className="w-full h-full object-contain" />
                            </div>

                            {/* Status Badges Always Visible */}
                            <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
                                <Badge variant="success" className="bg-black/50 backdrop-blur-md border-zinc-800/50 text-emerald-400 px-2 py-1 shadow-md">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> REC
                                </Badge>
                                {theaterCamera.status === 'connected' && (
                                    <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-emerald-500/30 text-emerald-300 px-2 py-1 shadow-md">
                                        LIVE
                                    </Badge>
                                )}
                            </div>

                            {/* Gradient Bottom (For Text Readability) */}
                            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            {/* Hover Overlay: Close Button (Top Right) */}
                            <button onClick={() => setTheaterCamera(null)} className="absolute top-4 right-4 z-50 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 scale-95 hover:scale-100 border border-white/10">
                                <X className="w-5 h-5" />
                            </button>

                            {/* Hover Overlay: Camera Info (Bottom Left) */}
                            <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div>
                                    <h3 className="text-xl font-bold text-white drop-shadow-md flex items-center">
                                        <Monitor className="w-5 h-5 mr-2 text-blue-400" /> {theaterCamera.name}
                                    </h3>
                                    <p className="text-sm text-zinc-300 font-mono mt-1 drop-shadow-md flex items-center">
                                        <LinkIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" /> {theaterCamera.url}
                                    </p>
                                    {theaterCamera.labels?.length > 0 && (
                                        <div className="flex space-x-1.5 mt-2">
                                            {theaterCamera.labels.map((lbl, idx) => (
                                                <span key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 text-white/90 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide">
                                                    {lbl}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end space-y-1.5">
                                    <div className="flex items-center space-x-1.5 opacity-90">
                                        <span className="bg-black/60 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md text-xs text-zinc-100 font-mono shadow-sm">{theaterCamera.resolution}</span>
                                        <span className="bg-black/60 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md text-xs text-zinc-100 font-mono shadow-sm">{theaterCamera.fps} FPS</span>
                                        <span className="bg-black/60 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md text-xs text-zinc-100 font-mono shadow-sm">{theaterCamera.codec}</span>
                                        <span className="bg-blue-600/80 px-2 py-0.5 rounded border border-blue-500/30 backdrop-blur-md text-xs text-white font-mono shadow-sm font-bold">{theaterCamera.protocol}</span>
                                    </div>
                                </div>
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
                                                <Activity className="w-4 h-4 mr-2.5 text-zinc-400" /> Max FPS
                                            </span>
                                            <select
                                                className="bg-transparent text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-blue-500"
                                                value={prefs.fpsLimit}
                                                onChange={(e) => setPrefs(p => ({ ...p, fpsLimit: Number(e.target.value) }))}
                                            >
                                                <option value={10}>10 FPS</option>
                                                <option value={15}>15 FPS</option>
                                                <option value={20}>20 FPS</option>
                                                <option value={30}>30 FPS</option>
                                                <option value={60}>60 FPS</option>
                                            </select>
                                        </div>

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
                            className={`h-14 w-14 !rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 relative z-40 ${isPreferencesOpen ? 'rotate-90 bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30'} border border-transparent dark:border-white/5 hover:scale-105`}
                            onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                            title="UI Settings"
                        >
                            <Settings className="w-6 h-6" />
                        </Button>
                    </div>
                )}

            </div>
        </>
    );
}