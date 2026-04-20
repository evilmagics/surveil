import { useState, useRef, useCallback } from 'react';
import { invokeTauri } from '../lib/utils';

export function useCameraForm(cameras, onSuccess) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    const [formData, setFormData] = useState({ name: '', url: '', labels: [] });
    const [formMetadata, setFormMetadata] = useState(null);
    const [isCheckingConn, setIsCheckingConn] = useState(false);
    const [connError, setConnError] = useState('');
    const [activeAddTab, setActiveAddTab] = useState('single');
    const [isDragging, setIsDragging] = useState(false);
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [batchPreview, setBatchPreview] = useState([]);
    const [batchResults, setBatchResults] = useState(null);
    const fileInputRef = useRef(null);

    const getHostAndPort = (urlString) => {
        try {
            const u = new URL(urlString);
            return `${u.hostname}:${u.port || (u.protocol.startsWith('rtsp') ? '554' : '80')}`;
        } catch {
            return urlString;
        }
    };

    const isDuplicate = useCallback((urlToCheck, currentId = null) => {
        const target = getHostAndPort(urlToCheck);
        return cameras.some(c => c.id !== currentId && getHostAndPort(c.url) === target);
    }, [cameras]);

    const openAdd = () => {
        setEditingCamera(null);
        setFormData({ name: '', url: '', labels: [] });
        setFormMetadata(null);
        setConnError('');
        setBatchPreview([]);
        setBatchResults(null);
        setIsAddModalOpen(true);
    };

    const openEdit = (camera) => {
        setEditingCamera(camera);
        setFormData({ name: camera.name, url: camera.url, labels: [...camera.labels] });
        setFormMetadata({
            resolution: camera.resolution, codec: camera.codec, protocol: camera.protocol, fps: camera.fps
        });
        setConnError('');
        setIsAddModalOpen(true);
    };

    const checkConnection = async () => {
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

    const saveCamera = async () => {
        if (!formData.name || !formData.url) return;

        if (isDuplicate(formData.url, editingCamera?.id)) {
            setConnError("A camera with this IP/Host and Port is already registered.");
            return;
        }

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
            if (onSuccess) onSuccess();
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

    const saveBatch = async () => {
        if (batchPreview.length === 0) return;
        setIsBatchLoading(true);
        let added = 0;
        let skipped = 0;

        try {
            for (const cam of batchPreview) {
                if (!cam.isDuplicate) {
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
            if (onSuccess) await onSuccess();
            setBatchResults({ added, skipped });
            setBatchPreview([]);
        } catch (e) {
            setConnError(`Database Error: ${e.toString()}`);
            console.error("Batch Import Failed:", e);
        } finally {
            setIsBatchLoading(false);
        }
    };

    const downloadTemplate = async (type = 'csv') => {
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

    return {
        isAddModalOpen, setIsAddModalOpen,
        editingCamera,
        formData, setFormData,
        formMetadata,
        isCheckingConn,
        connError, setConnError,
        activeAddTab, setActiveAddTab,
        isDragging, setIsDragging,
        isBatchLoading,
        batchPreview, setBatchPreview,
        batchResults,
        fileInputRef,
        openAdd, openEdit,
        checkConnection,
        saveCamera,
        handleBatchImport,
        saveBatch,
        downloadTemplate
    };
}
