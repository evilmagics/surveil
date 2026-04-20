import { useState, useEffect } from 'react';
import { invokeTauri } from '../lib/utils';

export function usePreferences() {
    const [prefs, setPrefs] = useState({
        showName: false,
        showSource: false,
        showTags: false,
        theme: 'dark',
        columns: '3',
        itemsPerPage: 12,
        monitoringMode: false
    });
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

    const loadPreferences = async () => {
        try {
            const dbPrefs = await invokeTauri('get_preferences');
            if (dbPrefs) {
                setPrefs(prev => ({ ...prev, ...dbPrefs }));
                if (dbPrefs.theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        } catch (e) {
            console.error('[usePreferences] Failed to load:', e);
        } finally {
            setIsLoadingPrefs(false);
        }
    };

    useEffect(() => {
        loadPreferences();
    }, []);

    useEffect(() => {
        if (!isLoadingPrefs) {
            invokeTauri('save_preferences', { prefs }).catch(console.error);
        }
        
        if (prefs.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [prefs, isLoadingPrefs]);

    return { prefs, setPrefs, isLoadingPrefs };
}
