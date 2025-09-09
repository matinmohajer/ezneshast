import React, { useEffect, forwardRef, useImperativeHandle } from "react";
import { useAudio } from "@/app/hooks/useAudio";

export interface AudioPlayerHandle {
  play: () => Promise<void> | void;
  pause: () => void;
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
}

export interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  bindShortcuts?: boolean;
  initialVolume?: number;
  onTimeChange?: (currentTime: number) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer(
    {
      src,
      bindShortcuts = true,
      initialVolume = 1,
      onTimeChange,
      className = "",
      ...props
    },
    ref
  ) {
    const {
      isPlaying,
      currentTime,
      duration,
      volume,
      setVolume,
      play,
      pause,
      skip,
      seek,
    } = useAudio(src ?? undefined, { initialVolume });

    useImperativeHandle(
      ref,
      () => ({
        play,
        pause,
        seek,
        getCurrentTime: () => currentTime,
      }),
      [play, pause, seek, currentTime]
    );

    useEffect(() => {
      if (typeof onTimeChange === "function") {
        onTimeChange(currentTime);
      }
    }, [currentTime, onTimeChange]);

    useEffect(() => {
      if (!bindShortcuts) return;
      const onKey = (e: KeyboardEvent) => {
        if (
          e.target &&
          (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)
        )
          return;
        if (e.code === "Space") {
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
        } else if (e.code === "ArrowLeft") {
          skip(-5);
        } else if (e.code === "ArrowRight") {
          skip(5);
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [bindShortcuts, isPlaying, play, pause, skip]);

    const format = (s: number) => {
      if (!isFinite(s)) return "0:00";
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
      return `${m}:${sec}`;
    };

    return (
      <div className={`w-full ${className}`} {...props}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            onClick={() => (isPlaying ? pause() : play())}
            className="h-10 w-10 rounded-full bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {isPlaying ? (
              <svg
                className="w-6 h-6 m-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <rect x="5" y="4" width="4" height="12" />
                <rect x="11" y="4" width="4" height="12" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 m-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            )}
          </button>
          <button
            aria-label="Rewind 5 seconds"
            onClick={() => skip(-5)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900"
          >
            −5s
          </button>
          <button
            aria-label="Forward 5 seconds"
            onClick={() => skip(5)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900"
          >
            +5s
          </button>
          <div className="ml-2 text-sm tabular-nums text-gray-700">
            {format(currentTime)} / {format(duration)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="volume" className="sr-only">
              Volume
            </label>
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-32 accent-primary-600"
            />
          </div>
        </div>
        {!src && (
          <p className="mt-2 text-sm text-gray-500">No audio selected</p>
        )}
      </div>
    );
  }
);

export default AudioPlayer;
