import React from 'react';
import { Button as HeroButton } from '@heroui/react';
import { cn } from '../../lib/utils';

export const Button = ({ children, variant = 'solid', size = 'md', className = '', ...props }) => {
    // Map existing variants to HeroUI variants if needed, or just pass through
    const variantMap = {
        default: 'solid',
        destructive: 'solid',
        outline: 'bordered',
        secondary: 'flat',
        ghost: 'light',
    };

    const colorMap = {
        destructive: 'danger',
        default: 'default',
    };

    return (
        <HeroButton 
            variant={variantMap[variant] || variant} 
            size={size === 'default' ? 'md' : size}
            color={colorMap[variant] || 'default'}
            className={cn("font-medium", className)} 
            {...props}
        >
            {children}
        </HeroButton>
    );
};
