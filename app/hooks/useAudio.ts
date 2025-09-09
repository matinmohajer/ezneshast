import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioOptions {
  initialVolume?: number; // 0..1
}

export function useAudio(src?: string, options: UseAudioOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(options.initialVolume ?? 1);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    if (typeof src === "string") {
      audioRef.current.src = src;
    }
    audioRef.current.volume = volume;
  }, [src, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    await audioRef.current.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (timeSeconds: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(duration, timeSeconds)
      );
    },
    [duration]
  );

  const skip = useCallback(
    (deltaSeconds: number) => {
      seek(currentTime + deltaSeconds);
    },
    [currentTime, seek]
  );

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    play,
    pause,
    seek,
    skip,
  };
}

export default useAudio;
