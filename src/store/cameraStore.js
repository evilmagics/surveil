import { create } from 'zustand';

export const useCameraVolatileStore = create((set, get) => ({
    cameraStatuses: {},
    streams: {}, // { [id]: { pc, stream, refCount, cleanup } }
    
    updateCameraStatus: (id, status) => set((state) => {
        if (state.cameraStatuses[id] === status) return state;
        return {
            cameraStatuses: {
                ...state.cameraStatuses,
                [id]: status
            }
        };
    }),

    removeCameraStatus: (id) => set((state) => {
        const newStatuses = { ...state.cameraStatuses };
        delete newStatuses[id];
        return { cameraStatuses: newStatuses };
    }),

    // Memory Management: Reference Counting for WebRTC Streams
    acquireStream: (id, createFn, callbacks) => {
        const { streams } = get();
        if (streams[id]) {
            // Already exists, increment reference count and add callbacks
            if (callbacks) streams[id].listeners.add(callbacks);
            
            set((state) => ({
                streams: {
                    ...state.streams,
                    [id]: { ...state.streams[id], refCount: state.streams[id].refCount + 1 }
                }
            }));
            return streams[id];
        }

        // Doesn't exist, create it
        const listeners = new Set();
        if (callbacks) listeners.add(callbacks);

        const newStreamData = createFn(listeners);
        set((state) => ({
            streams: {
                ...state.streams,
                [id]: { ...newStreamData, refCount: 1, listeners }
            }
        }));
        return newStreamData;
    },

    releaseStream: (id, callbacks) => {
        set((state) => {
            const streamData = state.streams[id];
            if (!streamData) return state;

            if (callbacks) streamData.listeners.delete(callbacks);

            const newRefCount = streamData.refCount - 1;
            if (newRefCount <= 0) {
                // No more components using this stream, kill it
                if (streamData.cleanup) streamData.cleanup();
                const newStreams = { ...state.streams };
                delete newStreams[id];
                return { streams: newStreams };
            }

            // Still being used by others
            return {
                streams: {
                    ...state.streams,
                    [id]: { ...streamData, refCount: newRefCount }
                }
            };
        });
    }
}));
