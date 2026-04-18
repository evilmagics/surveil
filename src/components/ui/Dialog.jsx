import React from 'react';

export const Dialog = ({ open, onOpenChange, children, title, description, footer }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => onOpenChange(false)}>
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col space-y-1.5 p-6 pb-4">
                    <h2 className="text-xl font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
                    {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
                </div>
                <div className="p-6 pt-0">
                    {children}
                </div>
                {footer && (
                    <div className="flex items-center justify-end space-x-2 p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
