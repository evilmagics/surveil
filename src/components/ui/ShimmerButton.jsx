import React from 'react';
import { cn } from '../../lib/utils';

export const ShimmerButton = ({
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  shimmerDuration = "3s",
  borderRadius = "100px",
  background = "rgba(0, 0, 0, 1)",
  className,
  children,
  ...props
}) => {
  return (
    <button
      style={{
        "--shimmer-color": shimmerColor,
        "--shimmer-size": shimmerSize,
        "--shimmer-duration": shimmerDuration,
        "--border-radius": borderRadius,
        "--background": background,
      }}
      className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] [background:var(--background)] [border-radius:var(--border-radius)]",
          className
      )}
      {...props}
    >
      {/* Shimmer effect layer */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
          <div 
              className="absolute inset-[-100%] animate-[shimmer-spin_var(--shimmer-duration)_linear_infinite] opacity-50"
              style={{
                  background: `conic-gradient(from 0deg, transparent 0% 340deg, var(--shimmer-color) 360deg)`
              }}
          />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex items-center justify-center">
          {children}
      </div>

      {/* Decorative inner shadow */}
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_-8px_10px_rgba(255,255,255,0.1)] transition-all duration-300 group-hover:shadow-[inset_0_-6px_10px_rgba(255,255,255,0.2)]" />
      
      {/* Border */}
      <div className="absolute -inset-px rounded-[inherit] border border-white/10 transition-all duration-300 group-hover:border-white/20" />
      
      <style>{`
        @keyframes shimmer-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
