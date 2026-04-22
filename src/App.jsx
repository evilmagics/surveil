import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Search, Plus, LayoutGrid, ChevronLeft, ChevronRight,
    ArrowDownNarrowWide, ArrowUpNarrowWide, Loader2, Settings, Filter, X
} from 'lucide-react';

import {
    ButtonGroup,
    Select,
    ListBox
} from '@heroui/react';
import { ToastProvider } from '@heroui/react/toast';

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
import { AddCameraModal } from './components/AddCameraModal';
import { EditCameraModal } from './components/EditCameraModal';
import { ThemeToggle } from './components/ui/ThemeToggle';
import RetroGrid from './components/ui/RetroGrid';
import { AnimatedGradientText } from './components/ui/AnimatedGradientText';
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

    // Banner & Scroll UI State
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollRef = React.useRef(null);

    // Side effects & Local UI state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingCamera, setDeletingCamera] = useState(null);
    const [selectedCameraDetails, setSelectedCameraDetails] = useState(null);
    const [theaterCamera, setTheaterCamera] = useState(null);
    const [showMonitorToast, setShowMonitorToast] = useState(false);

    // Banner visibility logic (24h hide)
    useEffect(() => {
        const BANNER_KEY = 'surveil_banner_hidden_until';
        const hiddenUntil = localStorage.getItem(BANNER_KEY);
        if (!hiddenUntil || Date.now() > parseInt(hiddenUntil)) {
            setIsBannerVisible(true);
        }
    }, []);

    const closeBanner = () => {
        setIsBannerVisible(false);
        const BANNER_KEY = 'surveil_banner_hidden_until';
        localStorage.setItem(BANNER_KEY, (Date.now() + 24 * 60 * 60 * 1000).toString());
    };

    // Scroll listener to hide banner
    const handleScroll = (e) => {
        if (e.target.scrollTop > 50) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
    };

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
        <div className="relative h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30 transition-colors duration-500 flex flex-col overflow-hidden">
            <ToastProvider placement="top end" />
            <RetroGrid className="z-0 opacity-40" />

            {/* Banner Area */}
            <AnimatePresence>
                {isBannerVisible && !isScrolled && !prefs.monitoringMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 40, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-40 flex items-center justify-center bg-blue-950 text-white overflow-hidden border-b border-white/5"
                    >
                            <div className="container mx-auto px-4 flex items-center justify-center relative">
                                <div className="flex items-center gap-3">
                                    <AnimatedGradientText className="px-3 py-1 mx-0 bg-white/10 backdrop-blur-md shadow-none hover:shadow-none border-none">
                                        <span className="inline-flex items-center text-[10px] font-bold tracking-widest text-white/90">
                                            ✨ <hr className="mx-2 h-3 w-px shrink-0 bg-white/20 border-none px-0" /> BETA
                                        </span>
                                    </AnimatedGradientText>
                                    <p className="text-[11px] text-blue-50 font-medium tracking-tight opacity-90 hidden sm:block">
                                        Surveil is currently in active development. Visit our <a href="https://github.com/evilmagics" target="_blank" rel="noreferrer" className="text-white hover:underline font-bold transition-all underline-offset-2 decoration-blue-300">GitHub repository</a> to track progress.
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 absolute right-0 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    onClick={closeBanner}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navbar */}
                <header className={`sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center ${prefs.monitoringMode ? 'h-0 opacity-0 border-b-0' : 'h-16 opacity-100 border-b'}`}>
                    <div className="container mx-auto px-4 w-full flex items-center justify-between relative z-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20 transition-transform hover:scale-110">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">Sur<span className="text-blue-500">veil</span></h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative w-64 hidden lg:block mr-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Quick search..."
                                    className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-none shadow-none"
                                onClick={cameraForm.openAdd}
                                title="Add Camera"
                            >
                                <div className="relative">
                                    <Video className="w-5 h-5" />
                                    <Plus className="w-3.5 h-3.5 absolute -bottom-1 -right-1 bg-white dark:bg-zinc-950 rounded-full text-blue-500" strokeWidth={3} />
                                </div>
                            </Button>

                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block opacity-50"></div>

                            <Button variant="ghost" size="icon" className="h-10 w-10 hidden sm:flex text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-none shadow-none" onClick={() => setPrefs(p => ({ ...p, monitoringMode: true }))} title="Monitoring Mode">
                                <LayoutGrid className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Layout Wrapper (Scrollable Area) */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >

                    {/* Main Content */}
                    <main className={`container mx-auto flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${prefs.monitoringMode ? 'px-2 py-2' : 'px-4 py-8'}`}>

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

                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                    Camera List <span className="text-zinc-500 text-sm font-normal ml-2">({filteredCameras.length} sources)</span>
                                </h2>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Select
                                        selectedKey={filterProtocol}
                                        onSelectionChange={setFilterProtocol}
                                        className="min-w-[150px]"
                                    >
                                        <Select.Trigger className="flex items-center justify-between h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-900/50">
                                            <div className="flex items-center gap-2">
                                                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                                                <Select.Value />
                                            </div>
                                            <Select.Indicator />
                                        </Select.Trigger>
                                        <Select.Popover>
                                            <ListBox className="p-1 outline-none bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl min-w-[160px] z-[100]">
                                                <ListBox.Item id="All" className="px-3 py-2 text-sm rounded-lg hover:bg-blue-500 hover:text-white cursor-pointer outline-none">All Protocols</ListBox.Item>
                                                <ListBox.Item id="RTSP" className="px-3 py-2 text-sm rounded-lg hover:bg-blue-500 hover:text-white cursor-pointer outline-none">RTSP Stream</ListBox.Item>
                                                <ListBox.Item id="HTTP" className="px-3 py-2 text-sm rounded-lg hover:bg-blue-500 hover:text-white cursor-pointer outline-none">HTTP/WebHLS</ListBox.Item>
                                            </ListBox>
                                        </Select.Popover>
                                    </Select>

                                    <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-1 h-10">
                                        <Select
                                            selectedKey={sortConfig.key}
                                            onSelectionChange={(key) => setSortConfig(c => ({ ...c, key }))}
                                            className="min-w-[100px]"
                                        >
                                            <Select.Trigger className="flex items-center gap-2 pl-2 pr-8 h-8 border-none bg-transparent hover:opacity-80 rounded-lg text-xs font-medium focus:ring-0">
                                                <Select.Value className="pr-1" />
                                                <Select.Indicator className="text-zinc-400 absolute right-2" />
                                            </Select.Trigger>
                                            <Select.Popover>
                                                <ListBox className="p-1 outline-none bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[100]">
                                                    <ListBox.Item id="created_at" className="px-3 py-2 text-sm rounded-lg hover:bg-blue-500 hover:text-white cursor-pointer outline-none">Sort by Date</ListBox.Item>
                                                    <ListBox.Item id="name" className="px-3 py-2 text-sm rounded-lg hover:bg-blue-500 hover:text-white cursor-pointer outline-none">Sort by Name</ListBox.Item>
                                                </ListBox>
                                            </Select.Popover>
                                        </Select>

                                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg group/sort-toggle"
                                            onClick={() => setSortConfig(c => ({ ...c, dir: c.dir === 'asc' ? 'desc' : 'asc' }))}
                                            title={`Sort ${sortConfig.dir === 'asc' ? 'Descending' : 'Ascending'}`}
                                        >
                                            {sortConfig.dir === 'asc' ? (
                                                <ArrowUpNarrowWide className="w-4 h-4 text-blue-500 transition-transform group-active/sort-toggle:scale-90" />
                                            ) : (
                                                <ArrowDownNarrowWide className="w-4 h-4 text-blue-500 transition-transform group-active/sort-toggle:scale-90" />
                                            )}
                                        </Button>
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
                    <footer className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col items-center justify-center ${prefs.monitoringMode ? 'h-0 opacity-0 py-0 border-t-0 border-transparent' : 'h-16 opacity-100 py-6 mt-auto'}`}>
                        <div className="container mx-auto px-4 flex items-center justify-center text-[11px] font-medium tracking-tight text-zinc-400 dark:text-zinc-600">
                            &copy; {new Date().getFullYear()} Surveil App. Developed with ❤️ by <a href="https://github.com/evilmagics" target="_blank" rel="noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 transition-colors lowercase">@evilmagics</a>
                        </div>
                    </footer>
                </div>

                {/* Modals & Overlays */}
                <AddCameraModal
                    isOpen={cameraForm.isOpen && !cameraForm.editingCamera}
                    onOpenChange={cameraForm.setIsOpen}
                    form={cameraForm}
                />

                <EditCameraModal
                    isOpen={cameraForm.isOpen && !!cameraForm.editingCamera}
                    onOpenChange={cameraForm.setIsOpen}
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
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:white">{deletingCamera?.name}</span>?</p>
                    </div>
                </Dialog>

                <TheaterMode
                    camera={theaterCamera}
                    onClose={() => setTheaterCamera(null)}
                />

                {showMonitorToast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center animate-in fade-in slide-in-from-top-4 duration-300">
                        <span>Press <kbd className="bg-white/20 px-2 py-0.5 rounded text-sm mx-1 font-mono">Alt + M</kbd> or <kbd className="bg-white/20 px-2 py-0.5 rounded text-sm mx-1 font-mono">ESC</kbd> to exit.</span>
                    </div>
                )}

                <CameraDetailsSidebar
                    camera={selectedCameraDetails}
                    isOpen={!!selectedCameraDetails}
                    onClose={() => setSelectedCameraDetails(null)}
                />

                {!prefs.monitoringMode && (
                    <div className="fixed bottom-6 right-6 z-40">
                        <PreferencesMenu
                            prefs={prefs}
                            setPrefs={setPrefs}
                            setPage={setPage}
                        />
                    </div>
                )}
        </div>
    );
}