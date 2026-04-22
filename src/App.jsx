import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Plus, LayoutGrid, ChevronLeft, ChevronRight,
    ArrowDownNarrowWide, ArrowUpNarrowWide, Loader2, Settings, Filter, X,
    ArrowUpDown, Monitor, Trash2, Edit, MoreVertical, Hash, Video, Star,
    Square, Grid2X2
} from 'lucide-react';

import { 
    Popover, 
    PopoverTrigger, 
    PopoverContent,
    ScrollShadow,
    Badge as HeroBadge
} from "@heroui/react";
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
import { TitleBar } from './components/layout/TitleBar';
import RetroGrid from './components/ui/RetroGrid';
import { AnimatedGradientText } from './components/ui/AnimatedGradientText';
import { invokeTauri, cn } from './lib/utils';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Dock, DockIcon } from './components/ui/Dock';

export default function App() {
    const { prefs, setPrefs, isLoadingPrefs } = usePreferences();
    const {
        cameras,
        isLoading: isLoadingCameras,
        search, setSearch,
        page, setPage,
        filterProtocol, setFilterProtocol,
        filterCategory, setFilterCategory,
        activeTags, setActiveTags,
        sortConfig, setSortConfig,
        filteredCameras,
        paginatedCameras,
        totalPages,
        handleStateUpdate,
        refresh: refreshCameras
    } = useCameras(prefs);

    const cameraForm = useCameraForm(filteredCameras, refreshCameras);

    // Banner & Scroll UI State
    const [isBannerVisible, setIsBannerVisible] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSingleColumnMobile, setIsSingleColumnMobile] = useState(false);
    const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
    const scrollRef = useRef(null);

    // Side effects & Local UI state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingCamera, setDeletingCamera] = useState(null);
    const [selectedCameraDetails, setSelectedCameraDetails] = useState(null);
    const [theaterCamera, setTheaterCamera] = useState(null);
    const [showMonitorToast, setShowMonitorToast] = useState(false);
    const [isMobileOS, setIsMobileOS] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            setIsMobileOS(isMobile);
        };
        checkMobile();
    }, []);

    // Banner visibility logic (24h hide)
    useEffect(() => {
        const BANNER_KEY = 'surveil_banner_hidden_until';
        const hiddenUntil = localStorage.getItem(BANNER_KEY);
        if (!hiddenUntil || Date.now() > parseInt(hiddenUntil)) {
            setIsBannerVisible(true);
        } else {
            setIsBannerVisible(false);
        }
    }, []);

    const closeBanner = () => {
        setIsBannerVisible(false);
        const BANNER_KEY = 'surveil_banner_hidden_until';
        localStorage.setItem(BANNER_KEY, (Date.now() + 24 * 60 * 60 * 1000).toString());
    };

    // Scroll listener to hide banner
    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        if (scrollTop > 50) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }

        // Auto-hide mobile search box on scroll if empty
        if (isMobileSearchVisible && search.trim() === '' && scrollTop > 100) {
            setIsMobileSearchVisible(false);
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

    // Handle Native Fullscreen for Monitoring Mode
    useEffect(() => {
        const toggleFullscreen = async () => {
            try {
                const win = getCurrentWindow();
                await win.setFullscreen(prefs.monitoringMode);
            } catch (e) {
                console.error("Failed to toggle fullscreen:", e);
            }
        };
        toggleFullscreen();
    }, [prefs.monitoringMode]);

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

    // Extract unique tags for filtering
    const allTags = React.useMemo(() => {
        const tags = new Set();
        const source = cameras || [];
        source.forEach(cam => {
            cam.labels.forEach(label => {
                const l = label.toLowerCase();
                if (!['favorite', 'favorites', 'star'].includes(l)) {
                    tags.add(label);
                }
            });
        });
        return Array.from(tags).sort();
    }, [cameras]);

    const [tagSearch, setTagSearch] = useState('');
    const filteredAllTags = allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));

    const toggleTag = (tag) => {
        setActiveTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    if (isLoadingPrefs || isLoadingCameras) return null;

    return (
        <div className="relative h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30 transition-colors duration-500 flex flex-col overflow-hidden">
            {!theaterCamera && !prefs.monitoringMode && !isMobileOS && <TitleBar />}
            <ToastProvider 
                placement={isMobileOS ? "top-center" : "top-end"}
                toastOptions={{
                    className: isMobileOS ? "max-w-[280px]" : ""
                }}
            />
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

                {/* Navbar / Header */}
                <header className={`sticky top-0 z-30 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col ${
                    prefs.monitoringMode 
                        ? 'h-0 opacity-0 border-b-0' 
                        : isScrolled 
                            ? 'h-14 sm:h-14 opacity-100 border-b' 
                            : isMobileSearchVisible 
                                ? 'h-auto min-h-14 sm:h-14 opacity-100 border-b'
                                : 'h-14 sm:h-14 opacity-100 border-b'
                }`}>
                    <div className="container mx-auto px-4 sm:px-6 w-full flex items-center justify-between h-14 relative z-10">                        {/* Left: Branding & Status */}
                        <div className="flex-1 flex items-center gap-4 sm:min-w-[200px]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-sm">
                                    <Video className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-900 dark:text-white leading-none">
                                        SURVEIL
                                    </h1>
                                    <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-3 h-4">
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-20" />
                                            <div className="relative w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white dark:border-zinc-950" />
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">
                                            {filteredCameras.length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center Section: Unified Search (Desktop) */}
                        <div className="hidden sm:flex flex-initial w-full max-w-lg mx-auto px-4">
                            <div className="relative group w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                                <Input
                                    placeholder="Search system, protocol or tags..."
                                    className="w-full pl-10 h-9 bg-zinc-100/50 dark:bg-zinc-900/40 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/60 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300 rounded-full text-xs font-medium placeholder:text-zinc-500"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded">ESC</kbd>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Action Groups */}
                        <div className="flex-1 flex items-center justify-end gap-6 sm:min-w-[200px]">
                            
                            {/* Desktop View Controls */}
                            <div className="hidden sm:flex items-center gap-1">
                                {/* Unified Filter Hub */}
                                <Popover placement="bottom-end" showArrow offset={10}>
                                    <PopoverTrigger>
                                        <Button 
                                            as="div"
                                            variant="ghost" 
                                            size="sm" 
                                            className={`h-9 px-3 text-[10px] font-black uppercase tracking-wider gap-2 transition-all cursor-pointer flex items-center justify-center ${
                                                (filterCategory !== 'all' || filterProtocol !== 'All' || activeTags.length > 0)
                                                ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-500/10' 
                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                                            }`}
                                        >
                                            <Filter className="w-3.5 h-3.5" />
                                            <span className="hidden lg:inline">Filter</span>
                                            {(filterCategory !== 'all' || filterProtocol !== 'All' || activeTags.length > 0) && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[8px] leading-none">
                                                    {(filterCategory !== 'all' ? 1 : 0) + (filterProtocol !== 'All' ? 1 : 0) + activeTags.length}
                                                </span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
                                        <div className="p-4 flex flex-col gap-5">
                                            {/* Section 1: Category */}
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2.5 block">Category</label>
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: 'all', label: 'All Feeds' },
                                                        { id: 'favorites', label: 'Favorites' }
                                                    ].map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => setFilterCategory(cat.id)}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                                filterCategory === cat.id
                                                                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-md'
                                                                : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Section 2: Protocol */}
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2.5 block">Protocol</label>
                                                <div className="flex gap-2">
                                                    {['All', 'RTSP', 'HTTP'].map(proto => (
                                                        <button
                                                            key={proto}
                                                            onClick={() => setFilterProtocol(proto)}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                                filterProtocol === proto
                                                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                                                : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            {proto}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Section 3: Tags */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block">Tags</label>
                                                    {activeTags.length > 0 && (
                                                        <button 
                                                            onClick={() => setActiveTags([])}
                                                            className="text-[8px] font-bold uppercase text-red-500 hover:underline"
                                                        >
                                                            Clear Tags
                                                        </button>
                                                    )}
                                                </div>
                                                <Input
                                                    size="sm"
                                                    placeholder="Search tags..."
                                                    value={tagSearch}
                                                    onValueChange={setTagSearch}
                                                    startContent={<Search className="w-3 h-3 text-zinc-400" />}
                                                    className="mb-3 bg-zinc-50 dark:bg-zinc-900/50"
                                                />
                                                <ScrollShadow className="max-h-[180px] -mx-1 px-1">
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                                                            <button
                                                                key={tag}
                                                                onClick={() => toggleTag(tag)}
                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                                                    activeTags.includes(tag)
                                                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                                                    : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                                                }`}
                                                            >
                                                                <span>#{tag}</span>
                                                                {activeTags.includes(tag) && <X className="w-2.5 h-2.5 opacity-50" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </ScrollShadow>
                                            </div>
                                        </div>
                                        {(filterCategory !== 'all' || filterProtocol !== 'All' || activeTags.length > 0) && (
                                            <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
                                                <Button 
                                                    fullWidth 
                                                    size="sm" 
                                                    variant="flat" 
                                                    color="danger"
                                                    className="h-8 text-[9px] font-black uppercase tracking-widest"
                                                    onClick={() => {
                                                        setFilterCategory('all');
                                                        setFilterProtocol('All');
                                                        setActiveTags([]);
                                                    }}
                                                >
                                                    Reset All Filters
                                                </Button>
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>

                                {/* Sort Hub */}
                                <Popover placement="bottom-end" showArrow offset={10}>
                                    <PopoverTrigger>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-9 px-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all gap-2"
                                        >
                                            <ArrowUpDown className={`w-3.5 h-3.5 ${sortConfig.dir === 'desc' ? 'rotate-180' : ''} transition-transform duration-300`} />
                                            <span className="text-[10px] font-black uppercase tracking-wider hidden lg:inline">
                                                {sortConfig.key === 'created_at' ? 'Date' : sortConfig.key === 'name' ? 'Name' : 'Default'}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
                                        <div className="flex flex-col gap-1">
                                            {[
                                                { id: 'default', label: 'Default' },
                                                { id: 'name', label: 'Name' },
                                                { id: 'created_at', label: 'Created Time' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setSortConfig(prev => ({ ...prev, key: opt.id }))}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                        sortConfig.key === opt.id
                                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500'
                                                    }`}
                                                >
                                                    {opt.label}
                                                    {sortConfig.key === opt.id && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSortConfig(prev => ({ ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' }));
                                                            }}
                                                            className="p-1 hover:bg-zinc-500/20 rounded"
                                                        >
                                                            {sortConfig.dir === 'asc' ? <ArrowUpNarrowWide className="w-3 h-3" /> : <ArrowDownNarrowWide className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Always show Add Camera Button (on both mobile and desktop) */}
                             <div className="flex items-center mr-1 sm:mr-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-all"
                                    onClick={cameraForm.openAdd}
                                    title="Add Camera"
                                >
                                    <div className="relative">
                                        <Video className="w-4 h-4" />
                                        <Plus className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-white dark:bg-zinc-950 rounded-full stroke-[3px]" />
                                    </div>
                                </Button>
                            </div>

                            {/* Desktop Utility (Configuration) */}
                            <div className="hidden sm:flex items-center gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded-full transition-all" 
                                    onClick={() => setPrefs(p => ({ ...p, monitoringMode: true }))} 
                                    title="Monitoring Mode"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </Button>
                                <PreferencesMenu prefs={prefs} setPrefs={setPrefs} setPage={setPage} />
                            </div>
                        </div>

                    </div>

                    {/* Mobile Search Area (Visible only when search button in dock is clicked) */}
                    <AnimatePresence>
                        {isMobileSearchVisible && !prefs.monitoringMode && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="sm:hidden px-3 pb-3.5 border-b border-zinc-200/50 dark:border-zinc-800/30 overflow-hidden"
                            >
                                <div className="relative group mt-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
                                    <Input
                                        placeholder="Search cameras..."
                                        className="w-full pl-9 h-8 bg-zinc-200/50 dark:bg-zinc-900/50 border-none rounded-lg text-xs backdrop-blur-sm"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                        autoFocus
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                {/* Layout Wrapper (Scrollable Area) */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >

                    {/* Main Content */}
                    <main className={`container mx-auto flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${prefs.monitoringMode ? 'px-2 py-2' : 'px-2 sm:px-6 py-6'}`}>
                        


                        {/* Grid */}
                        {paginatedCameras.length > 0 ? (
                            <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                isSingleColumnMobile 
                                    ? 'grid-cols-1' 
                                    : `grid-cols-2 sm:${getGridClass()}`
                            } ${prefs.monitoringMode ? 'gap-2' : 'gap-2 sm:gap-6'}`}>
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
                                    </p>                                    <div className="flex space-x-2">
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

                <AnimatePresence>
                    {theaterCamera && (
                        <TheaterMode
                            camera={theaterCamera}
                            onClose={() => setTheaterCamera(null)}
                            onDelete={() => {
                                setDeletingCamera(theaterCamera);
                                setIsDeleteModalOpen(true);
                                setTheaterCamera(null);
                            }}
                            onEdit={() => {
                                cameraForm.openEdit(theaterCamera);
                                setTheaterCamera(null);
                            }}
                            onDetails={() => {
                                setSelectedCameraDetails(theaterCamera);
                                setTheaterCamera(null);
                            }}
                            onFavoriteToggle={() => {
                                const isFav = theaterCamera.labels.some(l => ['favorite', 'favorites', 'star'].includes(l.toLowerCase()));
                                let newLabels;
                                if (isFav) {
                                    newLabels = theaterCamera.labels.filter(l => !['favorite', 'favorites', 'star'].includes(l.toLowerCase()));
                                } else {
                                    newLabels = [...theaterCamera.labels, 'favorite'];
                                }
                                const updated = { ...theaterCamera, labels: newLabels };
                                handleStateUpdate(theaterCamera.id, theaterCamera.status, updated);
                                setTheaterCamera(updated); // Update local theater state too
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* MagicUI Dock (Mobile Only) */}
                <AnimatePresence>
                    {!prefs.monitoringMode && !theaterCamera && (
                        <motion.div
                            initial={{ y: 100, x: '-50%', opacity: 0 }}
                            animate={{ y: 0, x: '-50%', opacity: 1 }}
                            exit={{ y: 100, x: '-50%', opacity: 0 }}
                            className="fixed bottom-12 left-1/2 z-50 sm:hidden"
                        >
                            <Dock direction="middle" iconSize={32} iconMagnification={40} className="bg-white/80 dark:bg-zinc-900/80 border-white/20 dark:border-zinc-800/50 shadow-2xl h-[48px]">
                                <DockIcon onClick={() => {
                                    setIsMobileSearchVisible(!isMobileSearchVisible);
                                    if (!isMobileSearchVisible) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}>
                                    <Search className={cn("w-4 h-4 transition-colors", isMobileSearchVisible ? "text-blue-500" : "text-zinc-500")} />
                                </DockIcon>
                                <Popover placement="top" showArrow offset={20}>
                                    <PopoverTrigger>
                                        <DockIcon>
                                            <Filter className={cn("w-4 h-4 transition-colors", (filterCategory !== 'all' || filterProtocol !== 'All' || activeTags.length > 0) ? "text-blue-500" : "text-zinc-500")} />
                                        </DockIcon>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
                                        <div className="p-4 flex flex-col gap-5">
                                            {/* Section 1: Category */}
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2.5 block">Category</label>
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: 'all', label: 'All Feeds' },
                                                        { id: 'favorites', label: 'Favorites' }
                                                    ].map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => setFilterCategory(cat.id)}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                                filterCategory === cat.id
                                                                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-md'
                                                                : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Section 2: Protocol */}
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2.5 block">Protocol</label>
                                                <div className="flex gap-2">
                                                    {['All', 'RTSP', 'HTTP'].map(proto => (
                                                        <button
                                                            key={proto}
                                                            onClick={() => setFilterProtocol(proto)}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                                filterProtocol === proto
                                                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                                                : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            {proto}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Section 3: Tags */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block">Tags</label>
                                                    {activeTags.length > 0 && (
                                                        <button 
                                                            onClick={() => setActiveTags([])}
                                                            className="text-[8px] font-bold uppercase text-red-500 hover:underline"
                                                        >
                                                            Clear Tags
                                                        </button>
                                                    )}
                                                </div>
                                                <Input
                                                    size="sm"
                                                    placeholder="Search tags..."
                                                    value={tagSearch}
                                                    onValueChange={setTagSearch}
                                                    startContent={<Search className="w-3 h-3 text-zinc-400" />}
                                                    className="mb-3 bg-zinc-50 dark:bg-zinc-900/50"
                                                />
                                                <ScrollShadow className="max-h-[180px] -mx-1 px-1">
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                                                            <button
                                                                key={tag}
                                                                onClick={() => toggleTag(tag)}
                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                                                    activeTags.includes(tag)
                                                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                                                    : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                                                }`}
                                                            >
                                                                <span>#{tag}</span>
                                                                {activeTags.includes(tag) && <X className="w-2.5 h-2.5 opacity-50" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </ScrollShadow>
                                            </div>
                                        </div>
                                        {(filterCategory !== 'all' || filterProtocol !== 'All' || activeTags.length > 0) && (
                                            <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
                                                <Button 
                                                    fullWidth 
                                                    size="sm" 
                                                    variant="flat" 
                                                    color="danger"
                                                    className="h-8 text-[9px] font-black uppercase tracking-widest"
                                                    onClick={() => {
                                                        setFilterCategory('all');
                                                        setFilterProtocol('All');
                                                        setActiveTags([]);
                                                    }}
                                                >
                                                    Reset All Filters
                                                </Button>
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                                <DockIcon onClick={cameraForm.openAdd} className="bg-blue-500/10 border border-blue-500/20">
                                    <Plus className="w-4 h-4 text-blue-500" />
                                </DockIcon>
                                <DockIcon onClick={() => setPrefs(prev => ({ ...prev, monitoringMode: !prev.monitoringMode }))}>
                                    <Monitor className={cn("w-4 h-4 transition-colors", prefs.monitoringMode ? "text-blue-500" : "text-zinc-500")} />
                                </DockIcon>
                                <DockIcon onClick={() => setIsSingleColumnMobile(!isSingleColumnMobile)}>
                                    {isSingleColumnMobile ? <Grid2X2 className="w-4 h-4 text-zinc-500" /> : <Square className="w-4 h-4 text-zinc-500" />}
                                </DockIcon>
                            </Dock>
                        </motion.div>
                    )}
                </AnimatePresence>

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
            </div>
        );
}