import { invoke } from '@tauri-apps/api/core';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const invokeTauri = async (command, args = {}) => {
    // Check if we are running in a Tauri environment
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

    if (!isTauri) {
        console.warn(`[Tauri Mock] Command "${command}" called outside Tauri. Returning mock data.`);
        // Enhanced fallbacks for development/browser testing
        const mocks = {
            'get_cameras': [],
            'get_preferences': {
                theme: 'dark',
                showName: true,
                showSource: true,
                showTags: true,
                monitoringMode: false,
                columns: "3",
                itemsPerPage: 12
            },
            'test_connection': { success: true, metadata: { resolution: '1920x1080', codec: 'h264', fps: 30, protocol: 'rtsp' } }
        };
        return mocks[command] ?? null;
    }

    try {
        return await invoke(command, args);
    } catch (error) {
        console.error(`[Tauri] Error in command "${command}":`, error);
        throw error;
    }
};
