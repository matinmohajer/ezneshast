import React from "react";

export type SkeletonVariant = "text" | "rect" | "circle";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
}

export function Skeleton({
  variant = "text",
  width = "100%",
  height = 16,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const base = "animate-pulse bg-gray-200";
  const radius = variant === "circle" ? "rounded-full" : "rounded-md";
  const inlineStyle: React.CSSProperties = {
    width,
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  };
  return (
    <div
      className={`${base} ${radius} ${className}`}
      style={inlineStyle}
      {...props}
    />
  );
}

export default Skeleton;
