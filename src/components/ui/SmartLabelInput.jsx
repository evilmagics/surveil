import React, { useState } from 'react';
import { Badge } from './Badge';
import { X } from 'lucide-react';

export const SmartLabelInput = ({ labels = [], onChange, variant = "bordered", radius = "md", className = "" }) => {
    const [inputValue, setInputValue] = useState('');

    const addLabel = (text) => {
        const newLabel = text.trim();
        if (newLabel && !labels.includes(newLabel)) {
            onChange([...labels, newLabel]);
        }
        setInputValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addLabel(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '') {
            e.preventDefault();
            if (labels.length > 0) {
                onChange(labels.slice(0, -1));
            }
        }
    };

    const removeLabel = (labelToRemove) => {
        onChange(labels.filter(label => label !== labelToRemove));
    };

    // Radius mapping
    const radiusClasses = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full'
    };

    // Variant logic to match user request: "flat" should have background and NO border
    const baseStyles = "flex flex-wrap items-center gap-1.5 p-1.5 min-h-[36px] w-full text-sm transition-all ";
    const variantStyles = variant === "flat" 
        ? "bg-zinc-100/50 dark:bg-zinc-900/30 border-none focus-within:ring-2 focus-within:ring-blue-500/20" 
        : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20";

    const combinedClasses = `${baseStyles} ${variantStyles} ${radiusClasses[radius] || radiusClasses.md} ${className}`;

    return (
        <div className={combinedClasses}>
            {labels.map((label, idx) => (
                <Badge key={idx} variant="secondary" className="flex items-center gap-1 px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg">
                    {label}
                    <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white focus:outline-none rounded-full p-0.5 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </Badge>
            ))}
            <input
                type="text"
                className="flex-1 bg-transparent outline-none min-w-[120px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 px-1.5 py-0.5 font-medium"
                placeholder={labels.length === 0 ? "Type tag and press Enter..." : ""}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addLabel(inputValue)}
            />
        </div>
    );
};
