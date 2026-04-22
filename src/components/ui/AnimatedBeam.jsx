"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  pathColor = "gray",
  pathOpacity = 0.2,
  pathWidth = 2,
  gradientStartColor = "#3b82f6",
  gradientStopColor = "#10b981",
  delay = 0,
  duration = 2,
  reverse = false,
}) {
  const [path, setPath] = useState("");
  const pathRef = useRef(null);

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();

        const startX = fromRect.left - containerRect.left + fromRect.width / 2;
        const startY = fromRect.top - containerRect.top + fromRect.height / 2;
        const endX = toRect.left - containerRect.left + toRect.width / 2;
        const endY = toRect.top - containerRect.top + toRect.height / 2;

        const controlX = (startX + endX) / 2;
        const controlY = (startY + endY) / 2 - curvature;

        setPath(`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
      }
    };

    const resizeObserver = new ResizeObserver(updatePath);
    resizeObserver.observe(containerRef.current);
    updatePath();

    return () => resizeObserver.disconnect();
  }, [containerRef, fromRef, toRef, curvature]);

  return (
    <svg
      fill="none"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute left-0 top-0", className)}
    >
      <path
        d={path}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        ref={pathRef}
        d={path}
        stroke="url(#beam-gradient)"
        strokeWidth={pathWidth}
        strokeLinecap="round"
        strokeDasharray="50, 200"
        className="animate-beam"
        style={{
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            animationDirection: reverse ? "reverse" : "normal",
        }}
      />
      <defs>
        <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="50%" stopColor={gradientStartColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
