import React, { useState, useEffect } from 'react';
import { 
    Video, Search, Plus, LayoutGrid, ChevronLeft, ChevronRight, 
    ArrowUp, ArrowDown, Loader2, Settings
} from 'lucide-react';

import { usePreferences } from './hooks/usePreferences';
import { useCameras } from './hooks/useCameras';
import { useCameraForm } from './hooks/useCameraForm';

import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Dialog } from './components/ui/Dialog';
import { CameraCard } from './components/camera/CameraCard';
import { PreferencesMenu } from './components/PreferencesMenu';
import { TheaterMode } from './components/TheaterMode';
import { CameraDetailsSidebar } from './components/CameraDetailsSidebar';
import { CameraModal } from './components/CameraModal';
import { invokeTauri } from './lib/utils';

export default function App() {
    const { prefs, setPrefs, isLoadingPrefs } = usePreferences();
    const {
        isLoading: isLoadingCameras,
        search, setSearch,
        page, setPage,
        filterProtocol, setFilterProtocol,
        sortConfig, setSortConfig,
        filteredCameras,
        paginatedCameras,
        totalPages,
        handleStateUpdate,
        refresh: refreshCameras
    } = useCameras(prefs);

    const cameraForm = useCameraForm(filteredCameras, refreshCameras);

    // Side effects & Local UI state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingCamera, setDeletingCamera] = useState(null);
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [selectedCameraDetails, setSelectedCameraDetails] = useState(null);
    const [theaterCamera, setTheaterCamera] = useState(null);
    const [showMonitorToast, setShowMonitorToast] = useState(false);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
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
    }, [prefs.monitoringMode, setPrefs]);

    // Monitoring Mode Toast
    useEffect(() => {
        if (prefs.monitoringMode) {
            setShowMonitorToast(true);
            const t = setTimeout(() => setShowMonitorToast(false), 4000);
            return () => clearTimeout(t);
        } else {
            setShowMonitorToast(false);
        }
    }, [prefs.monitoringMode]);

    const confirmDelete = async () => {
        if (!deletingCamera) return;
        try {
            await invokeTauri('delete_camera', { id: deletingCamera.id });
            setIsDeleteModalOpen(false);
            if (paginatedCameras.length === 1 && page > 1) setPage(p => p - 1);
            refreshCameras();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const getGridClass = () => {
        switch (prefs.columns) {
            case '1': return 'grid-cols-1';
            case '2': return 'grid-cols-2';
            case '3': return 'grid-cols-3';
            case '4': return 'grid-cols-4';
            default: return 'grid-cols-2 lg:grid-cols-3';
        }
    };

    if (isLoadingPrefs || isLoadingCameras) return null;

    return (
        <React.Fragment>
            <div className="h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30 transition-colors duration-500 flex flex-col overflow-hidden">

                {/* Navbar */}
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
                            <Button size="icon" onClick={cameraForm.openAdd} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm" title="Add Camera">
                                <div className="relative">
                                    <Video className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                    <Plus className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-blue-500" strokeWidth={2.5} />
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
                <main className={`container mx-auto flex-1 overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${prefs.monitoringMode ? 'px-2 py-2' : 'px-4 py-8'}`}>

                    {/* Toolbar */}
                    <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${prefs.monitoringMode ? 'max-h-0 opacity-0 mb-0' : 'max-h-[200px] opacity-100 mb-6'}`}>
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
                                    className="premium-select"
                                    value={filterProtocol}
                                    onChange={(e) => setFilterProtocol(e.target.value)}
                                    title="Filter by Protocol"
                                >
                                    <option value="All">All Protocols</option>
                                    <option value="RTSP">RTSP</option>
                                    <option value="HTTP">HTTP</option>
                                </select>

                                <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden">
                                    <select
                                        className="appearance-none bg-transparent text-zinc-800 dark:text-zinc-200 text-sm pl-4 pr-1 spy-1.5 outline-none focus:ring-0 cursor-pointer border-none"
                                        value={sortConfig.key}
                                        onChange={(e) => setSortConfig(c => ({...c, key: e.target.value}))}
                                        title="Sort Field"
                                    >
                                        <option value="created_at">Date Added</option>
                                        <option value="name">Name</option>
                                    </select>
                                    <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
                                    <button
                                        onClick={() => setSortConfig(c => ({...c, dir: c.dir === 'asc' ? 'desc' : 'asc'}))}
                                        className="px-2 py-1.5 text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        title={sortConfig.dir === 'asc' ? 'Ascending' : 'Descending'}
                                    >
                                        {sortConfig.dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid */}
                    {paginatedCameras.length > 0 ? (
                        <div className={`grid ${getGridClass()} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${prefs.monitoringMode ? 'gap-2' : 'gap-6'}`}>
                            {paginatedCameras.map((cam, index) => (
                                <CameraCard
                                    key={cam.id}
                                    index={index}
                                    camera={cam}
                                    prefs={prefs}
                                    onTheater={setTheaterCamera}
                                    onEdit={cameraForm.openEdit}
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
                            <Button onClick={cameraForm.openAdd} variant="secondary">Add Source</Button>
                        </div>
                    )}

                    {/* Pagination */}
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

                {/* Footer */}
                <footer className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col items-center justify-center ${prefs.monitoringMode ? 'h-0 opacity-0 py-0 border-t-0 border-transparent' : 'h-24 opacity-100 py-8 border-t border-zinc-200 dark:border-zinc-800/50 mt-auto'}`}>
                    <div className="container mx-auto px-4 flex flex-col items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                        <p className="mb-1">&copy; {new Date().getFullYear()} Surveil App.</p>
                        <p>
                            Project created by <a href="https://github.com/evilmagics" target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">@evilmagics</a>
                        </p>
                    </div>
                </footer>

                {/* Modals & Overlays */}
                <CameraModal 
                    isOpen={cameraForm.isAddModalOpen} 
                    onOpenChange={cameraForm.setIsAddModalOpen} 
                    form={cameraForm}
                />

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

                <CameraDetailsSidebar 
                    camera={selectedCameraDetails} 
                    isOpen={!!selectedCameraDetails} 
                    onClose={() => setSelectedCameraDetails(null)} 
                />

                <TheaterMode 
                    camera={theaterCamera} 
                    onClose={() => setTheaterCamera(null)} 
                />

                {showMonitorToast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center animate-in fade-in slide-in-from-top-4 duration-300">
                        <span>Press <kbd className="bg-white/20 px-2 py-0.5 rounded text-sm mx-1 font-mono">Alt + M</kbd> or <kbd className="bg-white/20 px-2 py-0.5 rounded text-sm mx-1 font-mono">ESC</kbd> to exit.</span>
                    </div>
                )}

                {/* Preferences Controls */}
                {isPreferencesOpen && (
                    <div className="fixed inset-0 z-30" onClick={() => setIsPreferencesOpen(false)} />
                )}

                {!prefs.monitoringMode && (
                    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
                        <PreferencesMenu 
                            prefs={prefs} 
                            setPrefs={setPrefs} 
                            setPage={setPage} 
                            isOpen={isPreferencesOpen} 
                            onClose={() => setIsPreferencesOpen(false)} 
                        />
                        <Button
                            size="icon"
                            className={`h-14 w-14 !rounded-full shadow-2xl transition-all duration-300 relative z-40 ${isPreferencesOpen ? 'rotate-90 bg-zinc-200 dark:bg-zinc-800' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/20'}`}
                            onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                        >
                            <Settings className="w-6 h-6" />
                        </Button>
                    </div>
                )}
            </div>
        </React.Fragment>
    );
}