import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  Edit3,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { WelcomeAudioControls } from '../hooks/useWelcomeAudio';
import { WelcomeAudioControl } from './WelcomeAudioControl';
import { verifyPinAndCreateSession } from '../lib/firebase';
import { AccountSessionProfile } from '../types/ciptaKarya';

interface AccessPortalViewProps {
  totalPackages: number;
  onEnterAccount: (profile: AccountSessionProfile) => void;
  welcomeAudio?: WelcomeAudioControls;
  onOpenGuide?: () => void;
}

export const AccessPortalView: React.FC<AccessPortalViewProps> = ({
  totalPackages,
  onEnterAccount,
  welcomeAudio,
  onOpenGuide,
}) => {
  const [isEntering, setIsEntering] = useState<boolean>(false);

  const handleDirectEnter = async () => {
    setIsEntering(true);
    try {
      const session = await verifyPinAndCreateSession();
      onEnterAccount({
        displayName: session.displayName || 'Pengelola SIMPRA BPBPK NTB',
        unitKerja: session.unitKerja || 'Tim Sinkronisasi Program BPBPK Nusa Tenggara Barat',
        loginMethod: 'direct',
      });
    } catch {
      onEnterAccount({
        displayName: 'Pengelola SIMPRA BPBPK NTB',
        unitKerja: 'Tim Sinkronisasi Program BPBPK Nusa Tenggara Barat',
        loginMethod: 'direct',
      });
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FB] text-slate-900 flex flex-col justify-between">
      {/* Top Institutional Bar */}
      <header className="h-16 batik-pu-surface text-white px-6 flex items-center justify-between border-b-2 border-[#E89611]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-6 rounded-xs bg-[#E89611] shrink-0" aria-hidden="true" />
          <span className="font-display text-base font-bold tracking-tight">
            SIMPRA BPBPK Nusa Tenggara Barat
          </span>
          <span className="text-amber-300/70 hidden sm:inline" aria-hidden="true">
            |
          </span>
          <span className="text-xs text-indigo-100 hidden sm:inline">
            Tahun Anggaran 2027–2030
          </span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-[#040E42]/80 hover:bg-[#0A1D6E] text-amber-200 border-amber-400/35 transition-colors cursor-pointer whitespace-nowrap"
              title="Buka Petunjuk Teknis Penggunaan Web App"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#E89611]" />
              <span>Petunjuk Teknis</span>
            </button>
          )}
          {welcomeAudio && (
            <WelcomeAudioControl welcomeAudio={welcomeAudio} variant="portal" />
          )}
          <div className="font-mono text-xs tabular-nums text-amber-200 hidden sm:block">
            {totalPackages} Paket Usulan Terdaftar
          </div>
        </div>
      </header>

      {/* Main Centered Direct Sign-In Workspace */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Institutional Context */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A1D6E]">
                <Sparkles className="w-3.5 h-3.5 text-[#E89611]" />
                <span>Akses Pengelola Terbuka</span>
                <span aria-hidden="true">·</span>
                <span>Tanpa PIN</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#061459] tracking-tight leading-tight">
                Dashboard Sinkronisasi Program Infrastruktur Cipta Karya TA. 2027–2030
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Akses langsung ke sistem perencanaan terpadu BPBPK NTB. Anda dapat melihat,
                menambah usulan baru, mengedit data usulan, serta menyinkronkan pemetaan spasial
                secara langsung tanpa perlu memasukkan PIN.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 pt-1">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <span>Tambah, edit, simpan, dan hapus usulan kegiatan TA 2027–2030</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <span>Format tampilan pereview usulan sesuai Executive Template KEMENPU</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <span>Penyimpanan otomatis saat pengeditan & tombol simpan manual</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <span>Plot koordinat spasial interaktif & sinkronisasi Cloud Firestore aktif</span>
              </li>
            </ul>
          </div>

          {/* Right Direct Access Card (Without PIN) */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-[#D7E0F0] border-t-4 border-t-[#E89611] rounded-xl p-6 sm:p-8 shadow-xs max-w-md mx-auto lg:mx-0 lg:ml-auto w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E5ECF7]">
                <div className="w-10 h-10 rounded-lg bg-[#061459] flex items-center justify-center text-[#E89611] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#061459]">
                    Masuk ke Dashboard
                  </h2>
                  <p className="text-xs text-[#059669] font-medium">
                    Mode Pengelola & Edit Aktif
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#F3F6FB] border border-[#D7E0F0] space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-[#061459]">
                    <Edit3 className="w-4 h-4 text-[#0A1D6E]" />
                    <span>Izin Pengeditan Diberikan Penuh</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Sistem telah dikonfigurasi untuk mengizinkan akses masuk dan seluruh fitur edit
                    serta penambahan usulan tanpa memerlukan PIN autentikasi.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2.5 rounded-lg border border-[#E5ECF7] bg-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>Cloud Database</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5ECF7] bg-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0A1D6E] shrink-0" />
                    <span>Readiness Criteria</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isEntering}
                  onClick={() => void handleDirectEnter()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#0A1D6E] hover:bg-[#061459] disabled:opacity-60 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <span>{isEntering ? 'Membuka Workspace...' : 'Buka Dashboard & Mulai Edit'}</span>
                  <ArrowRight className="w-4 h-4 text-[#E89611]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-[#D7E0F0] bg-white text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <span>
          SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030 · Sinkronisasi Program Infrastruktur Cipta Karya
        </span>
        <span className="text-[#0A1D6E] font-medium">Layanan Peta & Geospasial Terbuka · OpenStreetMap</span>
      </footer>

      {welcomeAudio?.needsInteraction && !welcomeAudio.isPlaying && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 batik-pu-banner text-white border-2 border-[#E89611] rounded-xl px-4 py-2.5 shadow-2xl max-w-[92vw]">
          <button
            type="button"
            data-welcome-audio-control="true"
            onClick={welcomeAudio.togglePlay}
            className="inline-flex items-center gap-2.5 text-xs font-semibold text-white hover:text-amber-200 cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-[#E89611] text-[#051044] flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-left leading-snug">
              <span className="block text-amber-200">Suara Pembuka SIMPRA Siap Diputar</span>
              <span className="block text-[11px] font-normal text-indigo-100">
                Ketuk di mana saja atau klik di sini untuk memutar suara pembuka
              </span>
            </span>
          </button>
          <button
            type="button"
            data-welcome-audio-control="true"
            onClick={welcomeAudio.dismissPrompt}
            className="p-1 text-indigo-200 hover:text-white rounded cursor-pointer shrink-0"
            aria-label="Tutup pemberitahuan suara pembuka"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
