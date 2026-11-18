import { useCallback, useEffect, useRef, useState } from 'react';

export const WELCOME_AUDIO_SRC = '/assets/aistudio/audio__1__48f1a895.wav';
const WELCOME_AUDIO_ELEMENT_ID = 'simpra-welcome-audio';

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
  const startedPlaybackRef = useRef<boolean>(false);
  const isAttemptingRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [needsInteraction, setNeedsInteraction] = useState<boolean>(false);
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);

  const startPlayback = useCallback(
    async (fromManualAction: boolean, restartFromZero: boolean = true): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      if (fromManualAction) {
        autoArmedRef.current = false;
        dismissedRef.current = false;
      }

      if (!fromManualAction && !audio.paused && !audio.ended) {
        startedPlaybackRef.current = true;
        autoArmedRef.current = false;
        setIsPlaying(true);
        setHasPlayed(true);
        setNeedsInteraction(false);
        return true;
      }

      if (!fromManualAction && isAttemptingRef.current) {
        return false;
      }

      isAttemptingRef.current = true;
      try {
        if (restartFromZero && (fromManualAction || audio.paused || audio.ended)) {
          audio.currentTime = 0;
        }
        await audio.play();
        startedPlaybackRef.current = true;
        autoArmedRef.current = false;
        setIsPlaying(true);
        setHasPlayed(true);
        setNeedsInteraction(false);
        return true;
      } catch {
        return false;
      } finally {
        isAttemptingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const existingEl = document.getElementById(WELCOME_AUDIO_ELEMENT_ID);
    const audio =
      existingEl instanceof HTMLAudioElement ? existingEl : new Audio(src);

    if (audio.getAttribute('src') !== src) {
      audio.src = src;
    }
    audio.preload = 'auto';
    audio.volume = 1;
    audioRef.current = audio;

    const gestureEvents: Array<keyof WindowEventMap> = [
      'click',
      'touchend',
      'pointerup',
      'mousedown',
      'pointerdown',
      'keydown',
    ];

    const detachGestureListeners = () => {
      gestureEvents.forEach((evt) => {
        window.removeEventListener(evt, handleFirstGesture, true);
      });
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handlePlay = () => {
      startedPlaybackRef.current = true;
      autoArmedRef.current = false;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
      detachGestureListeners();
    };

    function handleFirstGesture(e: Event) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-welcome-audio-control="true"]')) {
        return;
      }
      if (!autoArmedRef.current || dismissedRef.current || startedPlaybackRef.current) {
        detachGestureListeners();
        return;
      }

      void startPlayback(false, true).then((ok) => {
        if (ok) {
          detachGestureListeners();
        }
      });
    }

    const handleCanPlay = () => {
      if (startedPlaybackRef.current || dismissedRef.current) return;
      void startPlayback(false, false);
    };

    const handleVisibilityOrFocus = () => {
      if (
        startedPlaybackRef.current ||
        dismissedRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      void startPlayback(false, false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('canplaythrough', handleCanPlay);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Sync immediately if the HTML <audio autoplay> tag already started or finished playing
    if (!audio.paused && !audio.ended) {
      startedPlaybackRef.current = true;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
    } else if (audio.ended) {
      startedPlaybackRef.current = true;
      setIsPlaying(false);
      setHasPlayed(true);
      setNeedsInteraction(false);
    } else {
      void (async () => {
        const ok = await startPlayback(false, false);
        if (!ok && !dismissedRef.current && !startedPlaybackRef.current) {
          autoArmedRef.current = true;
          setNeedsInteraction(true);
          gestureEvents.forEach((evt) => {
            window.addEventListener(evt, handleFirstGesture, { capture: true });
          });
        }
      })();
    }

    return () => {
      autoArmedRef.current = false;
      detachGestureListeners();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
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

    void startPlayback(true, true);
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
