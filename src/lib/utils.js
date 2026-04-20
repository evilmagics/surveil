import { invoke } from '@tauri-apps/api/core';

export const invokeTauri = async (command, args = {}) => {
    try {
        if (typeof invoke === 'undefined') {
             console.warn(`[Tauri] invoke is undefined while trying to call "${command}". Are you running in a browser?`);
             // Fallback for development/browser testing
             if (command === 'get_cameras') return [];
             if (command === 'get_preferences') return {};
             return null;
        }
        return await invoke(command, args);
    } catch (error) {
        console.error(`[Tauri] Error in command "${command}":`, error);
        throw error;
    }
};
