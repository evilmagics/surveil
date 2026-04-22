"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#3b82f6",
  gradientOpacity = 0.2,
  ...props
}) {
  const cardRef = useRef(null);
  const [mouseX, setMouseX] = useState(-gradientSize);
  const [mouseY, setMouseY] = useState(-gradientSize);

  const handleMouseMove = useCallback(
    (e) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setMouseX(e.clientX - rect.left);
        setMouseY(e.clientY - rect.top);
      }
    },
    [gradientSize],
  );

  const handleMouseLeave = useCallback(() => {
    setMouseX(-gradientSize);
    setMouseY(-gradientSize);
  }, [gradientSize]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative flex size-full overflow-hidden rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
        className,
      )}
      {...props}
    >
      <div className="relative z-10 w-full h-full">{children}</div>
      <div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}${Math.round(gradientOpacity * 255).toString(16).padStart(2, '0')}, transparent 100%)`,
        }}
      />
    </div>
  );
}
