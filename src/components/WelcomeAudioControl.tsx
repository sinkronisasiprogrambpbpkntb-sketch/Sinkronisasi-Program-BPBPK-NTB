import React, { useRef } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { WelcomeAudioControls } from '../hooks/useWelcomeAudio';

interface WelcomeAudioControlProps {
  welcomeAudio: WelcomeAudioControls;
  variant?: 'header' | 'portal';
}

export const WelcomeAudioControl: React.FC<WelcomeAudioControlProps> = ({
  welcomeAudio,
  variant = 'header',
}) => {
  const lastNonZeroVolRef = useRef<number>(
    welcomeAudio.volume > 0 ? welcomeAudio.volume : 0.25
  );

  if (welcomeAudio.volume > 0) {
    lastNonZeroVolRef.current = welcomeAudio.volume;
  }

  const volumePercent = Math.round(welcomeAudio.volume * 100);

  const handleMuteToggle = () => {
    if (welcomeAudio.volume > 0) {
      lastNonZeroVolRef.current = welcomeAudio.volume;
      welcomeAudio.setVolume(0);
    } else {
      welcomeAudio.setVolume(lastNonZeroVolRef.current || 0.25);
    }
  };

  const VolumeLevelIcon =
    volumePercent === 0 ? VolumeX : volumePercent <= 50 ? Volume1 : Volume2;

  const isPortal = variant === 'portal';

  return (
    <div
      data-welcome-audio-control="true"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors shrink-0 ${
        isPortal
          ? welcomeAudio.isPlaying
            ? 'bg-[#040E42]/90 border-[#E89611] text-amber-100'
            : 'bg-[#040E42]/80 border-white/20 text-amber-100'
          : welcomeAudio.isPlaying
            ? 'bg-[#061459] text-amber-100 border-[#E89611] shadow-xs'
            : 'bg-white text-[#061459] border-[#C7D3E8]'
      }`}
    >
      <button
        type="button"
        data-welcome-audio-control="true"
        onClick={welcomeAudio.togglePlay}
        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
          isPortal
            ? welcomeAudio.isPlaying
              ? 'text-amber-300 font-semibold hover:text-white'
              : 'text-amber-200 hover:text-white'
            : welcomeAudio.isPlaying
              ? 'text-amber-200 hover:text-white font-semibold'
              : 'text-[#061459] hover:text-[#0A1D6E]'
        }`}
        title={
          welcomeAudio.isPlaying
            ? 'Hentikan suara pembuka web app'
            : 'Putar suara pembuka web app'
        }
      >
        {welcomeAudio.isPlaying ? (
          <VolumeX className="w-3.5 h-3.5 text-[#E89611] shrink-0" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-[#E89611] shrink-0" />
        )}
        <span className={isPortal ? '' : 'hidden md:inline'}>
          {welcomeAudio.isPlaying ? 'Hentikan' : 'Suara Pembuka'}
        </span>
      </button>

      <span
        className={`h-4 w-px shrink-0 ${
          isPortal || welcomeAudio.isPlaying ? 'bg-white/20' : 'bg-[#D7E0F0]'
        }`}
        aria-hidden="true"
      />

      <div className="inline-flex items-center gap-1.5 px-1">
        <button
          type="button"
          data-welcome-audio-control="true"
          onClick={handleMuteToggle}
          className={`p-0.5 rounded cursor-pointer transition-colors ${
            isPortal || welcomeAudio.isPlaying
              ? 'text-amber-200 hover:text-white'
              : 'text-slate-500 hover:text-[#061459]'
          }`}
          title={
            volumePercent === 0
              ? 'Aktifkan kembali volume suara pembuka'
              : 'Senyapkan volume suara pembuka'
          }
          aria-label={
            volumePercent === 0
              ? 'Aktifkan kembali volume suara pembuka'
              : 'Senyapkan volume suara pembuka'
          }
        >
          <VolumeLevelIcon className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volumePercent}
          onChange={(e) => welcomeAudio.setVolume(Number(e.target.value) / 100)}
          data-welcome-audio-control="true"
          aria-label="Atur volume suara pembuka"
          title={`Volume Suara Pembuka: ${volumePercent}%`}
          className="w-14 sm:w-16 h-1.5 accent-[#E89611] cursor-pointer"
        />

        <span
          className={`font-mono text-[10px] tabular-nums w-7 text-right shrink-0 ${
            isPortal || welcomeAudio.isPlaying
              ? 'text-amber-200'
              : 'text-slate-500'
          }`}
        >
          {volumePercent}%
        </span>
      </div>
    </div>
  );
};
