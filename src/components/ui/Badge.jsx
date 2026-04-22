import React from 'react';
import { Chip } from '@heroui/react';
import { cn } from '../../lib/utils';

export const Badge = ({ children, variant = 'default', className = '' }) => {
    const variantMap = {
        default: 'flat',
        success: 'flat',
        destructive: 'flat',
        warning: 'flat',
        outline: 'bordered'
    };

    const colorMap = {
        default: 'default',
        success: 'success',
        destructive: 'danger',
        warning: 'warning',
        outline: 'default'
    };

    return (
        <Chip 
            variant={variantMap[variant] || 'flat'} 
            color={colorMap[variant] || 'default'}
            className={cn("text-[10px] uppercase font-bold", className)}
            size="sm"
        >
            {children}
        </Chip>
    );
};
