import { useState, useRef, useCallback } from 'react';
import { invokeTauri } from '../lib/utils';
import { toast as addToast } from '@heroui/react/toast';

export function useCameraForm(cameras, onSuccess) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    const [formData, setFormData] = useState({ name: '', url: '', labels: [] });
    const [formMetadata, setFormMetadata] = useState(null);
    const [isCheckingConn, setIsCheckingConn] = useState(false);
    const [connError, setConnError] = useState('');
    const [activeAddTab, setActiveAddTab] = useState('tab-single');
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
        setActiveAddTab('tab-single');
        setIsOpen(true);
    };

    const openEdit = (camera) => {
        setEditingCamera(camera);
        setFormData({ name: camera.name, url: camera.url, labels: [...camera.labels] });
        setFormMetadata({
            resolution: camera.resolution, codec: camera.codec, protocol: camera.protocol, fps: camera.fps
        });
        setConnError('');
        setIsOpen(true);
    };

    const updateFormData = (updates) => {
        setFormData(prev => {
            const next = { ...prev, ...updates };
            // Clear metadata if URL changes to avoid showing stale data for a new address
            if (updates.url !== undefined && updates.url !== prev.url) {
                setFormMetadata(null);
                setConnError('');
            }
            return next;
        });
    };

    const checkConnection = async () => {
        if (!formData.url) return;
        setIsCheckingConn(true);
        setConnError('');
        try {
            const metadata = await invokeTauri('check_connection', { url: formData.url });
            setFormMetadata(metadata);
            addToast("Connectivity Check", {
                description: `Successfully reached ${getHostAndPort(formData.url)}. Metadata retrieved.`,
                variant: "success"
            });
        } catch (e) {
            setConnError(e.toString());
            setFormMetadata(null);
            addToast("Connection Failed", {
                description: e.toString(),
                variant: "danger"
            });
        } finally {
            setIsCheckingConn(false);
        }
    };

    const saveCamera = async () => {
        if (!formData.name || !formData.url) return;

        if (isDuplicate(formData.url, editingCamera?.id)) {
            const msg = "A camera with this IP/Host and Port is already registered.";
            setConnError(msg);
            addToast("Validation Error", { description: msg, variant: "warning" });
            return;
        }

        setIsCheckingConn(true);
        let finalMetadata = null;
        try {
            // Force connection check to get latest metadata if not already present or as final verification
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
                addToast("Registry Updated", { description: `${formData.name} has been modified successfully.`, variant: "success" });
            } else {
                await invokeTauri('add_camera', { camera: payload });
                addToast("Source Added", { description: `${formData.name} is now in the registry.`, variant: "success" });
            }
            setIsOpen(false);
            if (onSuccess) onSuccess();
        } catch (e) {
            const errorMsg = "Failed to save to database.";
            setConnError(errorMsg);
            addToast("Database Error", { description: errorMsg, variant: "danger" });
        }
    };

    const handleBatchImport = async (e) => {
        let file;
        if (e.target && e.target.files) {
            file = e.target.files[0];
        } else if (e.dataTransfer && e.dataTransfer.files) {
            file = e.dataTransfer.files[0];
        }
        
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'json' && ext !== 'csv') {
            const typeError = "Invalid file type. Only JSON and CSV files are allowed.";
            setConnError(typeError);
            addToast("Unsupported File", { description: typeError, variant: "danger" });
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
                    }));
                } else if (ext === 'csv') {
                    const lines = text.split('\n').filter(l => l.trim());
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    const nameIdx = headers.indexOf('name');
                    const urlIdx = headers.indexOf('url');
                    const labelsIdx = headers.indexOf('labels');
                    
                    if (nameIdx === -1 || urlIdx === -1) {
                        const csvError = "CSV must contain 'name' and 'url' headers.";
                        setConnError(csvError);
                        addToast("Import Failed", { description: csvError, variant: "danger" });
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
                            camerasToAdd.push({ name, url, labels });
                        }
                    }
                }
                
                // Add initial state with testing status
                const previewWithStatus = camerasToAdd.map(c => ({
                    ...c,
                    isDuplicate: isDuplicate(c.url),
                    connectionStatus: 'testing',
                    metadata: null
                }));
                setBatchPreview(previewWithStatus);

                // Run batch connection tests in parallel (limited)
                const results = await Promise.all(previewWithStatus.map(async (c) => {
                    if (c.isDuplicate) return { ...c, connectionStatus: 'skipped' };
                    try {
                        const meta = await invokeTauri('check_connection', { url: c.url });
                        return { ...c, connectionStatus: 'online', metadata: meta };
                    } catch {
                        return { ...c, connectionStatus: 'offline', metadata: null };
                    }
                }));

                setBatchPreview(results);
                setConnError("");
                addToast("Manifest Analyzed", {
                    description: `Found ${results.length} cameras. Ready for registry inclusion.`,
                    variant: "primary"
                });
            } catch (err) {
                console.error("Batch parse failed", err);
                const parseError = "Failed to parse file. Ensure it's valid JSON or CSV.";
                setConnError(parseError);
                addToast("Parsing Error", { description: parseError, variant: "danger" });
            } finally {
                setIsBatchLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const saveBatch = async (includeFailed = false) => {
        if (batchPreview.length === 0) return;
        setIsBatchLoading(true);
        let added = 0;
        let skipped = 0;

        try {
            for (const cam of batchPreview) {
                const isConflict = cam.isDuplicate;
                const isOnline = cam.connectionStatus === 'online';
                
                if (isConflict) {
                    skipped++;
                    continue;
                }

                if (!includeFailed && !isOnline) {
                    continue;
                }

                // Metadata is already fetched during handleBatchImport (preview phase)
                let finalMetadata = cam.metadata;
                
                // If it was offline or metadata is missing, we try one last check or use defaults
                if (!finalMetadata) {
                    try {
                        finalMetadata = await invokeTauri('check_connection', { url: cam.url });
                    } catch {
                        finalMetadata = {
                            status: "offline",
                            resolution: "Unknown",
                            codec: "Unknown",
                            fps: 0,
                            protocol: "Unknown"
                        };
                    }
                }

                const payload = {
                    name: cam.name,
                    url: cam.url,
                    labels: cam.labels,
                    ...finalMetadata
                };

                await invokeTauri('add_camera', { camera: payload });
                added++;
            }
            if (onSuccess) await onSuccess();
            setBatchResults({ added, skipped });
            setBatchPreview([]);
            addToast("Import Complete", {
                description: `Successfully added ${added} new sources.`,
                variant: "success"
            });
        } catch (e) {
            const err = `Database Error: ${e.toString()}`;
            setConnError(err);
            addToast("Import Critical Error", { description: err, variant: "danger" });
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
            addToast("Template Saved", { description: `${filename} is ready in your downloads.`, variant: "primary" });
        } catch (e) {
            addToast("Download Failed", { description: "Could not save template to disk.", variant: "danger" });
            console.error("Failed to save template file:", e);
        }
    };

    return {
        isOpen, setIsOpen,
        editingCamera,
        formData, setFormData: updateFormData,
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
