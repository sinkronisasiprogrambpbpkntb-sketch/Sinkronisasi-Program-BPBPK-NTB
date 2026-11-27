import { useCallback, useEffect, useRef, useState } from 'react';

export const WELCOME_AUDIO_SRC =
  '/assets/aistudio/nobodyknows_-_Hero_s_Come_Back_Naruto_Shippuuden_Opening_1__mp3.pm__62d3a408.mp3';

const WELCOME_AUDIO_ELEMENT_ID = 'simpra-welcome-audio-1';
const WELCOME_AUDIO_VOLUME_STORAGE_KEY = 'simpra_welcome_audio_volume_v1';
const DEFAULT_WELCOME_AUDIO_VOLUME = 0.25;

function readInitialVolume(): number {
  try {
    if (typeof window === 'undefined') return DEFAULT_WELCOME_AUDIO_VOLUME;
    const raw = window.localStorage.getItem(WELCOME_AUDIO_VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_WELCOME_AUDIO_VOLUME;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_WELCOME_AUDIO_VOLUME;
    return Math.min(1, Math.max(0, parsed));
  } catch {
    return DEFAULT_WELCOME_AUDIO_VOLUME;
  }
}

export interface WelcomeAudioControls {
  isPlaying: boolean;
  needsInteraction: boolean;
  hasPlayed: boolean;
  volume: number;
  setVolume: (nextVolume: number) => void;
  togglePlay: () => void;
  dismissPrompt: () => void;
}

export function useWelcomeAudio(options?: { disabled?: boolean }): WelcomeAudioControls {
  const isDisabled = Boolean(options?.disabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoArmedRef = useRef<boolean>(false);
  const dismissedRef = useRef<boolean>(false);
  const startedPlaybackRef = useRef<boolean>(false);
  const isAttemptingRef = useRef<boolean>(false);

  const [volume, setVolumeState] = useState<number>(readInitialVolume);
  const volumeRef = useRef<number>(volume);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [needsInteraction, setNeedsInteraction] = useState<boolean>(false);
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = Math.min(
      1,
      Math.max(0, Number.isFinite(nextVolume) ? nextVolume : DEFAULT_WELCOME_AUDIO_VOLUME)
    );
    volumeRef.current = clamped;
    setVolumeState(clamped);

    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
      if (clamped > 0 && audio.muted) {
        audio.muted = false;
      }
    }

    try {
      window.localStorage.setItem(
        WELCOME_AUDIO_VOLUME_STORAGE_KEY,
        String(Number(clamped.toFixed(2)))
      );
    } catch {
      // Ignore restricted localStorage errors
    }
  }, []);

  const startTrack = useCallback(
    async (fromManualAction: boolean, restartFromZero: boolean = true): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      if (fromManualAction) {
        autoArmedRef.current = false;
        dismissedRef.current = false;
      }

      if (!fromManualAction) {
        if (!audio.paused && !audio.ended) {
          startedPlaybackRef.current = true;
          autoArmedRef.current = false;
          setIsPlaying(true);
          setHasPlayed(true);
          setNeedsInteraction(false);
          return true;
        }
      }

      if (!fromManualAction && isAttemptingRef.current) {
        return false;
      }

      isAttemptingRef.current = true;
      try {
        audio.volume = volumeRef.current;
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
    if (isDisabled) {
      setNeedsInteraction(false);
      setIsPlaying(false);
      return;
    }
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const existingEl = document.getElementById(WELCOME_AUDIO_ELEMENT_ID);
    const audio =
      existingEl instanceof HTMLAudioElement
        ? existingEl
        : new Audio(WELCOME_AUDIO_SRC);

    if (audio.getAttribute('src') !== WELCOME_AUDIO_SRC) {
      audio.src = WELCOME_AUDIO_SRC;
    }
    audio.preload = 'auto';
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const gestureEvents: Array<keyof WindowEventMap> = [
      'click',
      'touchstart',
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

    const handlePlay = () => {
      startedPlaybackRef.current = true;
      autoArmedRef.current = false;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
      detachGestureListeners();
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
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

      void startTrack(false, true).then((ok) => {
        if (ok) {
          detachGestureListeners();
        }
      });
    }

    const handleCanPlay = () => {
      if (startedPlaybackRef.current || dismissedRef.current) return;
      void startTrack(false, false);
    };

    const handleVisibilityOrFocus = () => {
      if (
        startedPlaybackRef.current ||
        dismissedRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      void startTrack(false, false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplaythrough', handleCanPlay);

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

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
        const ok = await startTrack(false, false);
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
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      audioRef.current = null;
    };
  }, [startTrack, isDisabled]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    autoArmedRef.current = false;
    dismissedRef.current = false;

    const currentlyPlaying = !audio.paused && !audio.ended;
    if (currentlyPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setNeedsInteraction(false);
      return;
    }

    if (audio.getAttribute('src') !== WELCOME_AUDIO_SRC) {
      audio.src = WELCOME_AUDIO_SRC;
    }
    void startTrack(true, true);
  }, [startTrack]);

  const dismissPrompt = useCallback(() => {
    autoArmedRef.current = false;
    dismissedRef.current = true;
    setNeedsInteraction(false);
  }, []);

  return {
    isPlaying,
    needsInteraction,
    hasPlayed,
    volume,
    setVolume,
    togglePlay,
    dismissPrompt,
  };
}
