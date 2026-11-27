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
import { SektorCiptaKarya, UsulanProgram, WorkspaceView } from '../types/ciptaKarya';
import { RcPdfLayoutMode } from '../utils/exportRcInfographicPdf';
import {
  buildProposalProfileShareUrl,
  buildRcInfographicPdfShareUrl,
  copyTextToClipboard,
  getShareHostInfo,
} from '../utils/shareProposalLink';

type YearOption = 'ALL' | '2027' | '2028' | '2029' | '2030';
type SektorOption = 'ALL' | SektorCiptaKarya;
type ShareTargetScope = 'ALL' | 'PROFILE' | 'RC_INFOGRAPHIC_PDF';

interface ShareReadOnlyLinkModalProps {
  isOpen: boolean;
  currentView: WorkspaceView;
  currentYearFilter: YearOption;
  currentSektorFilter: SektorOption;
  totalProposalsCount: number;
  proposals?: UsulanProgram[];
  selectedProposalId?: string | null;
  onClose: () => void;
  onPreviewReadOnly: (options: {
    view: WorkspaceView;
    year: YearOption;
    sektor: SektorOption;
    proposalId?: string | null;
    isRcPdfStandalone?: boolean;
    rcLayoutMode?: RcPdfLayoutMode;
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
  proposals = [],
  selectedProposalId = null,
  onClose,
  onPreviewReadOnly,
  onCopiedNotice,
}) => {
  const defaultSafeView =
    currentView === WorkspaceView.OVERVIEW ? WorkspaceView.MATRIX : currentView;

  const [targetScope, setTargetScope] = useState<ShareTargetScope>('ALL');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    selectedProposalId ?? proposals[0]?.id ?? ''
  );
  const [rcLayoutMode, setRcLayoutMode] = useState<RcPdfLayoutMode>('multi');
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
    setTargetScope(
      currentView === WorkspaceView.RC_INFOGRAPHIC ? 'RC_INFOGRAPHIC_PDF' : 'ALL'
    );
    setRcLayoutMode('multi');
    setSelectedProfileId(selectedProposalId ?? proposals[0]?.id ?? '');
    setCopied(false);
  }, [isOpen, currentView, currentYearFilter, currentSektorFilter, selectedProposalId, proposals]);

  const hostInfo = useMemo(() => getShareHostInfo(), [isOpen]);

  const generatedUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    if (targetScope === 'PROFILE' && selectedProfileId) {
      return buildProposalProfileShareUrl(selectedProfileId, { preferSharedHost });
    }
    if (targetScope === 'RC_INFOGRAPHIC_PDF') {
      return buildRcInfographicPdfShareUrl({
        preferSharedHost,
        year: selectedYear,
        sektor: selectedSektor,
        layoutMode: rcLayoutMode,
      });
    }

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
  }, [
    hostInfo,
    preferSharedHost,
    selectedView,
    selectedYear,
    selectedSektor,
    targetScope,
    selectedProfileId,
    rcLayoutMode,
  ]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!generatedUrl) return;
    const success = await copyTextToClipboard(generatedUrl);
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

          {/* Target Scope: Whole App vs Specific Proposal Profile vs RC Infographic PDF */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-700">
              Jenis Tautan yang Dibagikan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope('ALL')}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  targetScope === 'ALL'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>Seluruh Daftar Usulan</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Matriks, GIS, atau proyeksi anggaran
                </div>
              </button>
              {proposals.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('PROFILE');
                    if (!selectedProfileId && proposals[0]) {
                      setSelectedProfileId(proposals[0].id);
                    }
                  }}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    targetScope === 'PROFILE'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>Link Profil (PDF)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    View Dokumen PDF 1 paket usulan
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={() => setTargetScope('RC_INFOGRAPHIC_PDF')}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  targetScope === 'RC_INFOGRAPHIC_PDF'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>Infografis Skor RC (PDF)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  View Dokumen PDF Peringkat RC
                </div>
              </button>
            </div>

            {targetScope === 'PROFILE' && proposals.length > 0 && (
              <div>
                <label
                  htmlFor="share-profile-select"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Pilih Paket Usulan
                </label>
                <select
                  id="share-profile-select"
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  {proposals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kodeUsulan} — {p.namaProgram}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Link Options */}
          {targetScope !== 'PROFILE' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {targetScope === 'ALL' ? (
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
            ) : (
              <div>
                <label
                  htmlFor="share-rc-layout-select"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Format Kertas PDF
                </label>
                <select
                  id="share-rc-layout-select"
                  value={rcLayoutMode}
                  onChange={(e) => setRcLayoutMode(e.target.value as RcPdfLayoutMode)}
                  className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="multi">Multi Halaman (Standar)</option>
                  <option value="single-sheet">1 Kertas (Ringkas)</option>
                </select>
              </div>
            )}

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
          )}

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
                view:
                  targetScope === 'PROFILE'
                    ? WorkspaceView.MATRIX
                    : targetScope === 'RC_INFOGRAPHIC_PDF'
                      ? WorkspaceView.RC_INFOGRAPHIC
                      : selectedView,
                year: targetScope === 'PROFILE' ? 'ALL' : selectedYear,
                sektor: targetScope === 'PROFILE' ? 'ALL' : selectedSektor,
                proposalId: targetScope === 'PROFILE' ? selectedProfileId : null,
                isRcPdfStandalone: targetScope === 'RC_INFOGRAPHIC_PDF',
                rcLayoutMode:
                  targetScope === 'RC_INFOGRAPHIC_PDF' ? rcLayoutMode : undefined,
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
