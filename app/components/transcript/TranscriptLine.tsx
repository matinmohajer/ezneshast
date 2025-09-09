import React from "react";

export interface TranscriptLineProps
  extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  timestampSeconds?: number;
  active?: boolean;
  onActivate?: () => void;
}

export function TranscriptLine({
  text,
  timestampSeconds,
  active = false,
  onActivate,
  className = "",
  ...props
}: TranscriptLineProps) {
  const format = (s?: number) => {
    if (s == null || !isFinite(s)) return null;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.();
        }
      }}
      className={`flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer transition-colors ${
        active ? "bg-primary-50 ring-1 ring-primary-200" : "hover:bg-gray-50"
      } ${className}`}
      {...props}
    >
      {timestampSeconds != null && (
        <span className="shrink-0 text-xs tabular-nums text-gray-500 mt-0.5">
          {format(timestampSeconds)}
        </span>
      )}
      <p className="text-sm leading-relaxed text-gray-900">{text}</p>
    </div>
  );
}

export default TranscriptLine;
