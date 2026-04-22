import { useState, useEffect, useCallback, useMemo } from 'react';
import { invokeTauri } from '../lib/utils';
import { useCameraVolatileStore } from '../store/cameraStore';

export function useCameras(prefs) {
    const updateCameraStatus = useCameraVolatileStore(state => state.updateCameraStatus);
    const [cameras, setCameras] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterProtocol, setFilterProtocol] = useState('All');
    const [filterCategory, setFilterCategory] = useState('all');
    const [activeTags, setActiveTags] = useState([]); // Array of strings
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', dir: 'desc' });

    const loadCameras = useCallback(async (showWindow = false) => {
        setIsLoading(true);
        try {
            const data = await invokeTauri('get_cameras');
            setCameras(data);
        } catch (e) {
            console.error('[useCameras] Failed to load:', e);
        } finally {
            setIsLoading(false);
            if (showWindow) {
                invokeTauri('show_main_window').catch(console.error);
            }
        }
    }, []);

    useEffect(() => {
        loadCameras(true);
    }, [loadCameras]);

    const filteredCameras = useMemo(() => {
        const s = search.toLowerCase();
        let result = cameras.filter(c =>
            c.name.toLowerCase().includes(s) ||
            c.labels.some(l => l.toLowerCase().includes(s))
        );

        if (filterProtocol !== 'All') {
            result = result.filter(c => c.protocol && c.protocol.toUpperCase() === filterProtocol.toUpperCase());
        }

        if (filterCategory === 'favorites') {
            result = result.filter(c => c.labels.some(l => 
                l.toLowerCase() === 'favorite' || 
                l.toLowerCase() === 'favorites' || 
                l.toLowerCase() === 'star'
            ));
        }

        if (activeTags.length > 0) {
            result = result.filter(c => 
                activeTags.every(tag => c.labels.includes(tag))
            );
        }

        if (sortConfig.key !== 'default') {
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
        }

        return result;
    }, [cameras, search, filterProtocol, filterCategory, sortConfig]);

    const paginatedCameras = useMemo(() => {
        const start = (page - 1) * prefs.itemsPerPage;
        return filteredCameras.slice(start, start + prefs.itemsPerPage);
    }, [filteredCameras, page, prefs.itemsPerPage]);

    const totalPages = Math.ceil(filteredCameras.length / prefs.itemsPerPage);

    const handleStateUpdate = useCallback((id, status, updatedCamera = null) => {
        if (updatedCamera) {
            setCameras(prev => prev.map(c => c.id === id ? updatedCamera : c));
        } else {
            invokeTauri('update_camera_state', { id, status }).catch(console.error);
            updateCameraStatus(id, status);
        }
    }, [updateCameraStatus]);

    const refresh = useCallback(() => loadCameras(false), [loadCameras]);

    return {
        cameras,
        isLoading,
        search,
        setSearch,
        page,
        setPage,
        filterProtocol,
        setFilterProtocol,
        filterCategory,
        setFilterCategory,
        activeTags,
        setActiveTags,
        sortConfig,
        setSortConfig,
        filteredCameras,
        paginatedCameras,
        totalPages,
        handleStateUpdate,
        refresh
    };
}
