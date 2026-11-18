import { useCallback, useEffect, useRef, useState } from 'react';

export const WELCOME_AUDIO_FIRST_SRC = '/assets/aistudio/audio__2__00467de3.wav';
export const WELCOME_AUDIO_SECOND_SRC = '/assets/aistudio/audio__1__48f1a895.wav';

const WELCOME_AUDIO_1_ELEMENT_ID = 'simpra-welcome-audio-1';
const WELCOME_AUDIO_2_ELEMENT_ID = 'simpra-welcome-audio-2';

export interface WelcomeAudioControls {
  isPlaying: boolean;
  needsInteraction: boolean;
  hasPlayed: boolean;
  togglePlay: () => void;
  dismissPrompt: () => void;
}

export function useWelcomeAudio(): WelcomeAudioControls {
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const autoArmedRef = useRef<boolean>(false);
  const dismissedRef = useRef<boolean>(false);
  const startedPlaybackRef = useRef<boolean>(false);
  const isAttemptingRef = useRef<boolean>(false);
  const sequenceCancelledRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [needsInteraction, setNeedsInteraction] = useState<boolean>(false);
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);

  const startFirstTrack = useCallback(
    async (fromManualAction: boolean, restartFromZero: boolean = true): Promise<boolean> => {
      const audio1 = audio1Ref.current;
      const audio2 = audio2Ref.current;
      if (!audio1) return false;

      if (fromManualAction) {
        autoArmedRef.current = false;
        dismissedRef.current = false;
      }

      sequenceCancelledRef.current = false;

      if (!fromManualAction) {
        if ((!audio1.paused && !audio1.ended) || (audio2 && !audio2.paused && !audio2.ended)) {
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
        if (audio2) {
          audio2.pause();
          audio2.currentTime = 0;
        }
        if (restartFromZero && (fromManualAction || audio1.paused || audio1.ended)) {
          audio1.currentTime = 0;
        }
        await audio1.play();
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

    const existingEl1 = document.getElementById(WELCOME_AUDIO_1_ELEMENT_ID);
    const audio1 =
      existingEl1 instanceof HTMLAudioElement
        ? existingEl1
        : new Audio(WELCOME_AUDIO_FIRST_SRC);

    if (audio1.getAttribute('src') !== WELCOME_AUDIO_FIRST_SRC) {
      audio1.src = WELCOME_AUDIO_FIRST_SRC;
    }
    audio1.preload = 'auto';
    audio1.volume = 1;
    audio1Ref.current = audio1;

    const existingEl2 = document.getElementById(WELCOME_AUDIO_2_ELEMENT_ID);
    const audio2 =
      existingEl2 instanceof HTMLAudioElement
        ? existingEl2
        : new Audio(WELCOME_AUDIO_SECOND_SRC);

    if (audio2.getAttribute('src') !== WELCOME_AUDIO_SECOND_SRC) {
      audio2.src = WELCOME_AUDIO_SECOND_SRC;
    }
    audio2.preload = 'auto';
    audio2.volume = 1;
    audio2Ref.current = audio2;

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

    const handleTrack1Play = () => {
      startedPlaybackRef.current = true;
      autoArmedRef.current = false;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
      detachGestureListeners();
    };

    const handleTrack1Pause = () => {
      // Do not flicker UI to stopped when Track 1 finishes and transitions into Track 2
      if (audio1.ended && !sequenceCancelledRef.current) return;
      if (audio2 && !audio2.paused && !audio2.ended) return;
      setIsPlaying(false);
    };

    const handleTrack1Ended = () => {
      if (
        sequenceCancelledRef.current ||
        audio1.getAttribute('src') !== WELCOME_AUDIO_FIRST_SRC
      ) {
        setIsPlaying(false);
        return;
      }

      void (async () => {
        try {
          audio2.currentTime = 0;
          await audio2.play();
          setIsPlaying(true);
        } catch {
          // Fallback: play Track 2 via audio1 if separate element playback was blocked
          try {
            audio1.src = WELCOME_AUDIO_SECOND_SRC;
            audio1.currentTime = 0;
            await audio1.play();
            setIsPlaying(true);
          } catch {
            setIsPlaying(false);
          }
        }
      })();
    };

    const handleTrack2Play = () => {
      startedPlaybackRef.current = true;
      autoArmedRef.current = false;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
      detachGestureListeners();
    };

    const handleTrack2Pause = () => {
      if (!audio1.paused && !audio1.ended) return;
      setIsPlaying(false);
    };

    const handleTrack2Ended = () => {
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

      void startFirstTrack(false, true).then((ok) => {
        if (ok) {
          detachGestureListeners();
        }
      });
    }

    const handleCanPlay = () => {
      if (startedPlaybackRef.current || dismissedRef.current) return;
      void startFirstTrack(false, false);
    };

    const handleVisibilityOrFocus = () => {
      if (
        startedPlaybackRef.current ||
        dismissedRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      void startFirstTrack(false, false);
    };

    audio1.addEventListener('play', handleTrack1Play);
    audio1.addEventListener('pause', handleTrack1Pause);
    audio1.addEventListener('ended', handleTrack1Ended);
    audio1.addEventListener('canplaythrough', handleCanPlay);

    audio2.addEventListener('play', handleTrack2Play);
    audio2.addEventListener('pause', handleTrack2Pause);
    audio2.addEventListener('ended', handleTrack2Ended);

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Sync immediately if Track 1 or Track 2 already started/completed via HTML autoplay
    if ((!audio1.paused && !audio1.ended) || (!audio2.paused && !audio2.ended)) {
      startedPlaybackRef.current = true;
      setIsPlaying(true);
      setHasPlayed(true);
      setNeedsInteraction(false);
    } else if (audio1.ended && audio2.ended) {
      startedPlaybackRef.current = true;
      setIsPlaying(false);
      setHasPlayed(true);
      setNeedsInteraction(false);
    } else if (audio1.ended && !audio2.ended) {
      startedPlaybackRef.current = true;
      void (async () => {
        try {
          await audio2.play();
          setIsPlaying(true);
          setHasPlayed(true);
          setNeedsInteraction(false);
        } catch {
          setIsPlaying(false);
        }
      })();
    } else {
      void (async () => {
        const ok = await startFirstTrack(false, false);
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
      audio1.removeEventListener('play', handleTrack1Play);
      audio1.removeEventListener('pause', handleTrack1Pause);
      audio1.removeEventListener('ended', handleTrack1Ended);
      audio1.removeEventListener('canplaythrough', handleCanPlay);
      audio2.removeEventListener('play', handleTrack2Play);
      audio2.removeEventListener('pause', handleTrack2Pause);
      audio2.removeEventListener('ended', handleTrack2Ended);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      audio1Ref.current = null;
      audio2Ref.current = null;
    };
  }, [startFirstTrack]);

  const togglePlay = useCallback(() => {
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!audio1) return;

    autoArmedRef.current = false;
    dismissedRef.current = false;

    const currentlyPlaying =
      (!audio1.paused && !audio1.ended) ||
      Boolean(audio2 && !audio2.paused && !audio2.ended);

    if (currentlyPlaying) {
      sequenceCancelledRef.current = true;
      audio1.pause();
      audio1.currentTime = 0;
      if (audio2) {
        audio2.pause();
        audio2.currentTime = 0;
      }
      setIsPlaying(false);
      setNeedsInteraction(false);
      return;
    }

    // Ensure Track 1 always has the first source in case fallback mutated src earlier
    if (audio1.getAttribute('src') !== WELCOME_AUDIO_FIRST_SRC) {
      audio1.src = WELCOME_AUDIO_FIRST_SRC;
    }
    void startFirstTrack(true, true);
  }, [startFirstTrack]);

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
