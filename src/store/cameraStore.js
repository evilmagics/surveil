import { create } from 'zustand';

export const useCameraVolatileStore = create((set) => ({
    cameraStatuses: {},
    
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
    })
}));
