import { invoke } from '@tauri-apps/api/core';

export const invokeTauri = async (command, args = {}) => {
    return await invoke(command, args);
};
