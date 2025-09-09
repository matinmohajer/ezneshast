import React from "react";

type TagVariant = "default" | "success" | "warning" | "danger" | "muted";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const styles: Record<TagVariant, string> = {
  default: "bg-primary-50 text-primary-700 ring-1 ring-primary-200",
  success: "bg-green-50 text-green-700 ring-1 ring-green-200",
  warning: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
  muted: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
};

export function Tag({
  variant = "default",
  className = "",
  ...props
}: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export default Tag;
