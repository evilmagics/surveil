import React from 'react';
import { Input as HeroInput } from '@heroui/react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
    <HeroInput
        ref={ref}
        variant="bordered"
        className={cn(
            "h-9 w-full rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-zinc-900 dark:text-zinc-100",
            className
        )}
        {...props}
    />
));
