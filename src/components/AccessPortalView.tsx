import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Edit3,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
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

      {/* Main Centered Direct Sign-In Workspace */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Institutional Context */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Akses Pengelola Terbuka · Tanpa PIN</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
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
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Tambah, edit, simpan, dan hapus usulan kegiatan TA 2027–2030</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Format tampilan pereview usulan sesuai Executive Template KEMENPU</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Penyimpanan otomatis saat pengeditan & tombol simpan manual</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Plot koordinat spasial interaktif & sinkronisasi Cloud Firestore aktif</span>
              </li>
            </ul>
          </div>

          {/* Right Direct Access Card (Without PIN) */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs max-w-md mx-auto lg:mx-0 lg:ml-auto w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Masuk ke Dashboard
                  </h2>
                  <p className="text-xs text-emerald-700 font-medium">
                    Mode Pengelola & Edit Aktif
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <span>Izin Pengeditan Diberikan Penuh</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Sistem telah dikonfigurasi untuk mengizinkan akses masuk dan seluruh fitur edit
                    serta penambahan usulan tanpa memerlukan PIN autentikasi.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cloud Database</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Readiness Criteria</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isEntering}
                  onClick={() => void handleDirectEnter()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <span>{isEntering ? 'Membuka Workspace...' : 'Buka Dashboard & Mulai Edit'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
