import React from 'react';

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
    <input
        ref={ref}
        className={`flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 dark:text-zinc-100 ${className}`}
        {...props}
    />
));
