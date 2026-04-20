import React from 'react';
import { Settings, Moon, Sun, Type, Link as LinkIcon, Tags, LayoutGrid, Columns, List } from 'lucide-react';
import { Button } from './ui/Button';

export function PreferencesMenu({ prefs, setPrefs, setPage, isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="mb-4 p-5 w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-200 ease-out relative z-40">
            <h3 className="text-lg font-semibold mb-5 text-zinc-900 dark:text-zinc-50 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-500" /> UI Preferences
            </h3>

            <div className="space-y-4">
                {/* Category: Visibility */}
                <div>
                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Visibility</h4>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                <Type className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Name
                            </span>
                            <button
                                className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.showName ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                onClick={() => setPrefs(p => ({ ...p, showName: !p.showName }))}
                            >
                                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.showName ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                <LinkIcon className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Source
                            </span>
                            <button
                                className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.showSource ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                onClick={() => setPrefs(p => ({ ...p, showSource: !p.showSource }))}
                            >
                                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.showSource ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                <Tags className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Tags
                            </span>
                            <button
                                className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.showTags ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                onClick={() => setPrefs(p => ({ ...p, showTags: !p.showTags }))}
                            >
                                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.showTags ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Category: Layout */}
                <div>
                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Layout Settings</h4>

                    <div className="flex items-center justify-between py-1.5 mb-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                            <LayoutGrid className="w-4 h-4 mr-2.5 text-zinc-400" /> Monitoring Mode
                        </span>
                        <button
                            className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${prefs.monitoringMode ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                            onClick={() => setPrefs(p => ({ ...p, monitoringMode: !p.monitoringMode }))}
                        >
                            <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${prefs.monitoringMode ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-1.5 mb-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                            <Columns className="w-4 h-4 mr-2.5 text-zinc-400" /> Grid Columns
                        </span>
                        <select
                            className="premium-select !py-1 !px-3 !pr-8 !text-xs !rounded-lg"
                            value={prefs.columns}
                            onChange={(e) => setPrefs(p => ({ ...p, columns: e.target.value }))}
                        >
                            <option value="1">1 Column</option>
                            <option value="2">2 Columns</option>
                            <option value="3">3 Columns</option>
                            <option value="4">4 Columns</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                            <List className="w-4 h-4 mr-2.5 text-zinc-400" /> Limit Per Page
                        </span>
                        <select
                            className="premium-select !py-1 !px-3 !pr-8 !text-xs !rounded-lg"
                            value={prefs.itemsPerPage}
                            onChange={(e) => {
                                setPrefs(p => ({ ...p, itemsPerPage: Number(e.target.value) }));
                                setPage(1);
                            }}
                        >
                            <option value={8}>8 Items</option>
                            <option value={12}>12 Items</option>
                            <option value={24}>24 Items</option>
                            <option value={48}>48 Items</option>
                        </select>
                    </div>
                </div>

                {/* Category: Appearance */}
                <div>
                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Appearance</h4>
                    <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                            {prefs.theme === 'dark' ? <Moon className="w-4 h-4 mr-2.5 text-zinc-400" /> : <Sun className="w-4 h-4 mr-2.5 text-zinc-400" />}
                            Theme Mode
                        </span>
                        <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
                            <button
                                className={`p-1.5 rounded-md transition-colors ${prefs.theme === 'light' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                onClick={() => setPrefs(p => ({ ...p, theme: 'light' }))}
                                title="Light Mode"
                            >
                                <Sun className="w-3.5 h-3.5" />
                            </button>
                            <button
                                className={`p-1.5 rounded-md transition-colors ${prefs.theme === 'dark' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                onClick={() => setPrefs(p => ({ ...p, theme: 'dark' }))}
                                title="Dark Mode"
                            >
                                <Moon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
