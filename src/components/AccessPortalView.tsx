import React, { useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogIn } from 'lucide-react';
import { verifyPinAndCreateSession } from '../lib/firebase';
import { AccountSessionProfile } from '../types/ciptaKarya';

interface AccessPortalViewProps {
  totalPackages: number;
  onEnterAccount: (profile: AccountSessionProfile) => void;
}

export const AccessPortalView: React.FC<AccessPortalViewProps> = ({
  totalPackages,
  onEnterAccount,
}) => {
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const submitPinValue = async (rawPin: string) => {
    const cleaned = rawPin.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length < 6) {
      setAuthError('Masukkan 6 digit kode PIN terlebih dahulu.');
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);
    try {
      const session = await verifyPinAndCreateSession(cleaned);
      onEnterAccount({
        displayName: session.displayName,
        unitKerja: session.unitKerja,
        loginMethod: 'pin',
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Kode PIN tidak sesuai. Silakan periksa kembali PIN Anda.';
      setAuthError(msg);
      setPinDigits(['', '', '', '', '', '']);
      window.setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 20);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, rawVal: string) => {
    setAuthError(null);
    const digitsOnly = rawVal.replace(/\D/g, '');
    if (!digitsOnly) {
      const next = [...pinDigits];
      next[index] = '';
      setPinDigits(next);
      return;
    }

    // Handle multi-digit paste or fast typing
    if (digitsOnly.length > 1) {
      const next = [...pinDigits];
      for (let i = 0; i < digitsOnly.length && index + i < 6; i += 1) {
        next[index + i] = digitsOnly[i];
      }
      setPinDigits(next);
      const focusIdx = Math.min(5, index + digitsOnly.length);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...pinDigits];
    next[index] = digitsOnly[0];
    setPinDigits(next);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      const next = [...pinDigits];
      next[index - 1] = '';
      setPinDigits(next);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    setAuthError(null);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i];
    }
    setPinDigits(next);
    const focusIdx = Math.min(5, Math.max(0, pasted.length - 1));
    inputRefs.current[focusIdx]?.focus();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitPinValue(pinDigits.join(''));
  };

  const joinedPin = pinDigits.join('');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Institutional Bar */}
      <header className="h-16 bg-slate-900 text-white px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-bold tracking-tight">
            SIMPRA BPBPK Nusa Tenggara Barat
          </span>
          <span className="text-slate-500 hidden sm:inline" aria-hidden="true">
            |
          </span>
          <span className="text-xs text-slate-300 hidden sm:inline">
            Tahun Anggaran 2027–2030
          </span>
        </div>
        <div className="font-mono text-xs tabular-nums text-slate-300">
          {totalPackages} Paket Usulan Terdaftar
        </div>
      </header>

      {/* Main Centered PIN Sign-In Workspace */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Institutional Context */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-blue-700">
                Akses Pengelola Balai
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                Dashboard Sinkronisasi Program Infrastruktur Cipta Karya TA. 2027–2030
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Masukkan kode PIN pengelola SIMPRA BPBPK Nusa Tenggara Barat untuk membuka
                akses pengelolaan data usulan, evaluasi Readiness Criteria (RC), serta
                sinkronisasi pemetaan spasial Cloud.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 pt-1">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Tambah, edit, simpan, dan hapus usulan program TA 2027–2030</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Pengisian Skor Readiness Criteria (RC) manual & verifikasi dokumen</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Plot titik koordinat interaktif di peta GIS & ekspor/impor GeoJSON</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Penyimpanan otomatis dan manual ke basis data Cloud lintas perangkat</span>
              </li>
            </ul>
          </div>

          {/* Right Single PIN Login Card */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs max-w-md mx-auto lg:mx-0 lg:ml-auto w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Masuk Menggunakan PIN
                  </h2>
                  <p className="text-xs text-slate-500">
                    Masukkan 6 digit PIN Pengelola SIMPRA BPBPK NTB
                  </p>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label
                      htmlFor="pin-digit-0"
                      className="text-xs font-medium text-slate-700 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kode PIN Akses (6 Digit)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPin ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tampilkan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                    {pinDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`pin-digit-${idx}`}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus={idx === 0}
                        maxLength={6}
                        aria-label={`Digit PIN ke-${idx + 1}`}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        disabled={isSubmitting}
                        className="w-full h-12 text-center font-mono text-lg font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || joinedPin.length < 6}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memverifikasi PIN...' : 'Masuk dengan PIN'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030 · Sinkronisasi Program Infrastruktur Cipta Karya
        </span>
        <span>Layanan Peta & Geospasial Terbuka · OpenStreetMap</span>
      </footer>
    </div>
  );
};
