import { useCallback, useEffect, useRef, useState } from 'react';

export const WELCOME_AUDIO_SRC = '/assets/aistudio/audio_01470164.wav';

export interface WelcomeAudioControls {
  isPlaying: boolean;
  needsInteraction: boolean;
  hasPlayed: boolean;
  togglePlay: () => void;
  dismissPrompt: () => void;
}

export function useWelcomeAudio(src: string = WELCOME_AUDIO_SRC): WelcomeAudioControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoArmedRef = useRef<boolean>(false);
  const dismissedRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [needsInteraction, setNeedsInteraction] = useState<boolean>(false);
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);

  const startPlayback = useCallback(async (fromManualAction: boolean): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) return false;

    if (fromManualAction) {
      autoArmedRef.current = false;
      dismissedRef.current = false;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
      autoArmedRef.current = false;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 1;
    audioRef.current = audio;

    const handleEnded = () => {
      setIsPlaying(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    const handleFirstGesture = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-welcome-audio-control="true"]')) {
        return;
      }
      if (!autoArmedRef.current || dismissedRef.current) {
        window.removeEventListener('pointerdown', handleFirstGesture, true);
        window.removeEventListener('keydown', handleFirstGesture, true);
        return;
      }
      autoArmedRef.current = false;
      window.removeEventListener('pointerdown', handleFirstGesture, true);
      window.removeEventListener('keydown', handleFirstGesture, true);
      void startPlayback(false);
    };

    void (async () => {
      const ok = await startPlayback(false);
      if (!ok && !dismissedRef.current) {
        autoArmedRef.current = true;
        setNeedsInteraction(true);
        window.addEventListener('pointerdown', handleFirstGesture, { capture: true });
        window.addEventListener('keydown', handleFirstGesture, { capture: true });
      }
    })();

    return () => {
      autoArmedRef.current = false;
      window.removeEventListener('pointerdown', handleFirstGesture, true);
      window.removeEventListener('keydown', handleFirstGesture, true);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.pause();
      audioRef.current = null;
    };
  }, [src, startPlayback]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    autoArmedRef.current = false;
    dismissedRef.current = false;

    if (!audio.paused && !audio.ended) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setNeedsInteraction(false);
      return;
    }

    void startPlayback(true);
  }, [startPlayback]);

  const dismissPrompt = useCallback(() => {
    autoArmedRef.current = false;
    dismissedRef.current = true;
    setNeedsInteraction(false);
  }, []);

  return {
    isPlaying,
    needsInteraction,
    hasPlayed,
    togglePlay,
    dismissPrompt,
  };
}
