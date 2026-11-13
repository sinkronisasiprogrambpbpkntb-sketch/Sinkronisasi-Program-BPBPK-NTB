import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Link2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SEKTOR_SHORT_LABELS } from '../data/initialProposals';
import { SektorCiptaKarya, WorkspaceView } from '../types/ciptaKarya';

type YearOption = 'ALL' | '2027' | '2028' | '2029' | '2030';
type SektorOption = 'ALL' | SektorCiptaKarya;

interface ShareReadOnlyLinkModalProps {
  isOpen: boolean;
  currentView: WorkspaceView;
  currentYearFilter: YearOption;
  currentSektorFilter: SektorOption;
  totalProposalsCount: number;
  onClose: () => void;
  onPreviewReadOnly: (options: {
    view: WorkspaceView;
    year: YearOption;
    sektor: SektorOption;
  }) => void;
  onCopiedNotice?: (url: string) => void;
}

const VIEW_OPTIONS: Array<{ id: WorkspaceView; label: string }> = [
  { id: WorkspaceView.MATRIX, label: 'Matriks Usulan & RC' },
  { id: WorkspaceView.SPATIAL, label: 'Fitur Spasial GIS' },
  { id: WorkspaceView.RC_INFOGRAPHIC, label: 'Infografis Skor RC' },
  { id: WorkspaceView.BUDGET, label: 'Proyeksi 2027–2030' },
];

const SEKTOR_QUERY_CODES: Record<SektorCiptaKarya, string> = {
  [SektorCiptaKarya.AIR_MINUM]: 'SPAM',
  [SektorCiptaKarya.SANITASI]: 'SAN',
  [SektorCiptaKarya.KAWASAN_STRATEGIS]: 'PKS',
  [SektorCiptaKarya.BINA_PENATAAN_BANGUNAN]: 'BPB',
};

export const ShareReadOnlyLinkModal: React.FC<ShareReadOnlyLinkModalProps> = ({
  isOpen,
  currentView,
  currentYearFilter,
  currentSektorFilter,
  totalProposalsCount,
  onClose,
  onPreviewReadOnly,
  onCopiedNotice,
}) => {
  const defaultSafeView =
    currentView === WorkspaceView.OVERVIEW ? WorkspaceView.MATRIX : currentView;

  const [selectedView, setSelectedView] = useState<WorkspaceView>(defaultSafeView);
  const [selectedYear, setSelectedYear] = useState<YearOption>(currentYearFilter);
  const [selectedSektor, setSelectedSektor] = useState<SektorOption>(currentSektorFilter);
  const [preferSharedHost, setPreferSharedHost] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedView(
      currentView === WorkspaceView.OVERVIEW ? WorkspaceView.MATRIX : currentView
    );
    setSelectedYear(currentYearFilter);
    setSelectedSektor(currentSektorFilter);
    setCopied(false);
  }, [isOpen, currentView, currentYearFilter, currentSektorFilter]);

  const hostInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { currentOrigin: '', sharedOrigin: '', isDevHost: false };
    }
    const { protocol, hostname, port, origin } = window.location;
    const isDevHost = hostname.startsWith('ais-dev-');
    const sharedHostname = isDevHost ? hostname.replace(/^ais-dev-/, 'ais-pre-') : hostname;
    const sharedOrigin = `${protocol}//${sharedHostname}${port ? `:${port}` : ''}`;
    return {
      currentOrigin: origin,
      sharedOrigin,
      isDevHost,
    };
  }, [isOpen]);

  const generatedUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const baseOrigin =
      hostInfo.isDevHost && preferSharedHost
        ? hostInfo.sharedOrigin
        : hostInfo.currentOrigin;

    const url = new URL(window.location.pathname || '/', baseOrigin);
    url.searchParams.set('mode', 'lihat');
    url.searchParams.set('view', selectedView);
    if (selectedYear !== 'ALL') {
      url.searchParams.set('ta', selectedYear);
    }
    if (selectedSektor !== 'ALL') {
      url.searchParams.set('sektor', SEKTOR_QUERY_CODES[selectedSektor]);
    }
    return url.toString();
  }, [hostInfo, preferSharedHost, selectedView, selectedYear, selectedSektor]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!generatedUrl) return;
    let success = false;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      success = true;
    } catch {
      try {
        const tempInput = document.createElement('textarea');
        tempInput.value = generatedUrl;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        success = document.execCommand('copy');
        document.body.removeChild(tempInput);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      onCopiedNotice?.(generatedUrl);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-readonly-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="share-readonly-modal-title"
                className="text-sm sm:text-base font-bold tracking-tight truncate"
              >
                Generate Link Web (Lihat Saja)
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Tautan pratinjau publik read-only untuk {totalProposalsCount} paket usulan aktif
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup jendela generate link"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Security Behavior Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">
                Hak Akses Terbatas: Baca &amp; Unduh Laporan Saja
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Penerima tautan dapat melihat data matriks, peta GIS, infografis skor RC, pratinjau
                KEMENPU, serta mengunduh CSV/PDF, namun <strong>tidak dapat</strong> menambah,
                mengubah, menghapus, atau menyimpan data ke database.
              </p>
            </div>
          </div>

          {/* Link Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="share-view-select"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Menu Awal
              </label>
              <select
                id="share-view-select"
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value as WorkspaceView)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {VIEW_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="share-year-select"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Filter Tahun
              </label>
              <select
                id="share-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as YearOption)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="ALL">TA 2027–2030</option>
                <option value="2027">TA 2027</option>
                <option value="2028">TA 2028</option>
                <option value="2029">TA 2029</option>
                <option value="2030">TA 2030</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="share-sektor-select"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Filter Sektor
              </label>
              <select
                id="share-sektor-select"
                value={selectedSektor}
                onChange={(e) => setSelectedSektor(e.target.value as SektorOption)}
                className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="ALL">Semua Sektor</option>
                {Object.values(SektorCiptaKarya).map((sek) => (
                  <option key={sek} value={sek}>
                    {SEKTOR_SHORT_LABELS[sek]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Domain Selector when running on Dev Host */}
          {hostInfo.isDevHost && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-700">
                Tujuan Domain Tautan
              </div>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                role="group"
                aria-label="Pilih domain tujuan link"
              >
                <button
                  type="button"
                  onClick={() => setPreferSharedHost(true)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    preferSharedHost
                      ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>Link Publik (Shared App)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Untuk dibagikan ke stakeholder eksternal
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferSharedHost(false)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    !preferSharedHost
                      ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>Link Dev Preview Saat Ini</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Untuk dibuka di lingkungan pratinjau aktif
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Generated URL Box */}
          <div className="space-y-1.5">
            <label
              htmlFor="generated-readonly-url"
              className="block text-[11px] font-semibold text-slate-700"
            >
              Link Web Khusus Lihat Saja (Siap Dibagikan)
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="generated-readonly-url"
                type="text"
                readOnly
                value={generatedUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 h-10 px-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => void handleCopyUrl()}
                className={`inline-flex items-center gap-1.5 px-4 h-10 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  copied
                    ? 'bg-emerald-700 text-white'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Data pada tautan ini otomatis tersinkron secara real-time dengan Cloud Firestore
              (khusus usulan terpublikasi).
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPreviewReadOnly({
                view: selectedView,
                year: selectedYear,
                sektor: selectedSektor,
              });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-blue-700" />
            <span>Pratinjau Mode Lihat Saja</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Buka Tautan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
