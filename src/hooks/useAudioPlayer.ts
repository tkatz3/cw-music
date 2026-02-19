import { useEffect, useRef, useState } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [started, setStarted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function start(url: string, volume: number) {
    if (!audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.volume = volume / 100;
    audioRef.current.play().catch(() => {});
    setCurrentUrl(url);
    setStarted(true);
  }

  function switchStream(url: string) {
    if (!audioRef.current || !started) return;
    if (audioRef.current.src === url) return;
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    setCurrentUrl(url);
  }

  function setVolume(volume: number) {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
  }

  function setPaused(paused: boolean) {
    if (!audioRef.current || !started) return;
    if (paused) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }

  return { started, currentUrl, start, switchStream, setVolume, setPaused };
}
