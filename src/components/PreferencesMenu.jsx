import React from 'react';
import { Settings, Moon, Sun, Type, Link as LinkIcon, Tags, LayoutGrid, Columns, List } from 'lucide-react';
import { Switch, Select, ListBox, Popover } from '@heroui/react';
import { Button } from './ui/Button';
import { ThemeToggle } from './ui/ThemeToggle';

export function PreferencesMenu({ prefs, setPrefs, setPage }) {
    return (
        <Popover placement="top-end" showArrow offset={20}>
            <Popover.Trigger>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                    <Settings className="w-4 h-4" />
                </Button>
            </Popover.Trigger>
            <Popover.Content className="p-0 border-none bg-transparent shadow-none">
                <div className="w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-semibold mb-5 text-zinc-900 dark:text-zinc-50 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-blue-500" /> UI Preferences
                    </h3>

                    <div className="space-y-4">
                        {/* Category: Visibility */}
                        <div>
                            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Visibility</h4>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between py-1.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors">
                                    <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                        <Type className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Name
                                    </span>
                                    <Switch 
                                        isSelected={prefs.showName} 
                                        onChange={(val) => setPrefs(p => ({ ...p, showName: val }))}
                                    >
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                    </Switch>
                                </div>

                                <div className="flex items-center justify-between py-1.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors">
                                    <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                        <LinkIcon className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Source
                                    </span>
                                    <Switch 
                                        isSelected={prefs.showSource} 
                                        onChange={(val) => setPrefs(p => ({ ...p, showSource: val }))}
                                    >
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                    </Switch>
                                </div>

                                <div className="flex items-center justify-between py-1.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors">
                                    <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                        <Tags className="w-4 h-4 mr-2.5 text-zinc-400" /> Show Tags
                                    </span>
                                    <Switch 
                                        isSelected={prefs.showTags} 
                                        onChange={(val) => setPrefs(p => ({ ...p, showTags: val }))}
                                    >
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                    </Switch>
                                </div>
                            </div>
                        </div>

                        {/* Category: Layout */}
                        <div>
                            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Layout Settings</h4>

                            <div className="flex items-center justify-between py-1.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors mb-1.5">
                                <span className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center">
                                    <LayoutGrid className="w-4 h-4 mr-2.5 text-zinc-400" /> Monitoring Mode
                                </span>
                                <Switch 
                                    isSelected={prefs.monitoringMode} 
                                    onChange={(val) => setPrefs(p => ({ ...p, monitoringMode: val }))}
                                >
                                    <Switch.Control>
                                        <Switch.Thumb />
                                    </Switch.Control>
                                </Switch>
                            </div>

                            <div className="space-y-3 mt-2">
                                <Select
                                    selectedKey={prefs.columns}
                                    onSelectionChange={(key) => setPrefs(p => ({ ...p, columns: String(key) }))}
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-xs text-zinc-500 font-medium ml-1">Grid Columns</span>
                                        <Select.Trigger className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                                            <div className="flex items-center gap-2">
                                                <Columns className="w-4 h-4 text-zinc-400" />
                                                <Select.Value />
                                            </div>
                                            <Select.Indicator />
                                        </Select.Trigger>
                                    </div>
                                    <Select.Popover>
                                        <ListBox className="p-1 outline-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl min-w-[200px]">
                                            <ListBox.Item id="1" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">1 Column</ListBox.Item>
                                            <ListBox.Item id="2" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">2 Columns</ListBox.Item>
                                            <ListBox.Item id="3" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">3 Columns</ListBox.Item>
                                            <ListBox.Item id="4" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">4 Columns</ListBox.Item>
                                        </ListBox>
                                    </Select.Popover>
                                </Select>

                                <Select
                                    selectedKey={String(prefs.itemsPerPage)}
                                    onSelectionChange={(key) => {
                                        setPrefs(p => ({ ...p, itemsPerPage: Number(key) }));
                                        setPage(1);
                                    }}
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-xs text-zinc-500 font-medium ml-1">Limit Per Page</span>
                                        <Select.Trigger className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                                            <div className="flex items-center gap-2">
                                                <List className="w-4 h-4 text-zinc-400" />
                                                <Select.Value />
                                            </div>
                                            <Select.Indicator />
                                        </Select.Trigger>
                                    </div>
                                    <Select.Popover>
                                        <ListBox className="p-1 outline-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl min-w-[200px]">
                                            <ListBox.Item id="12" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">12 Items</ListBox.Item>
                                            <ListBox.Item id="24" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">24 Items</ListBox.Item>
                                            <ListBox.Item id="36" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">36 Items</ListBox.Item>
                                            <ListBox.Item id="48" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">48 Items</ListBox.Item>
                                            <ListBox.Item id="60" className="px-3 py-2 text-sm rounded-md hover:bg-blue-500 hover:text-white cursor-pointer outline-none">60 Items</ListBox.Item>
                                        </ListBox>
                                    </Select.Popover>
                                </Select>
                            </div>
                        </div>

                        {/* Category: Appearance */}
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Appearance</h4>
                            <div className="flex items-center justify-between py-1 px-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-2">Theme Mode</span>
                                <ThemeToggle 
                                    theme={prefs.theme} 
                                    onChange={(t) => setPrefs(p => ({ ...p, theme: t }))} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Popover.Content>
        </Popover>
    );
}
