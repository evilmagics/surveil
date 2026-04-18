import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-500",
        destructive: "bg-red-500/15 text-red-600 dark:text-red-500",
        warning: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500",
        outline: "border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
    };
    return (
        <div className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};
