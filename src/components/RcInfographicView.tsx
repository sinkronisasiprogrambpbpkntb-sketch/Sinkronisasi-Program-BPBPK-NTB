import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Link2,
  MapPin,
  PenLine,
  Printer,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  formatRpMiliar,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import { SektorCiptaKarya, UsulanProgram } from '../types/ciptaKarya';
import {
  exportRcInfographicPdf,
  PdfSignatoriesConfig,
  RcPdfLayoutMode,
} from '../utils/exportRcInfographicPdf';
import {
  loadPuBatikAssets,
  loadPuLogoDataUrl,
  PU_LOGO_SRC,
} from '../utils/puLogoAsset';
import {
  ALL_SEKTORS,
  buildRcInfographicData,
  createEmptySignatories,
  getTierMeta,
  loadInitialRcSignatories,
  NON_BPB_SEKTORS,
  RcTierFilter,
  saveRcSignatories,
  SortOrder,
  YearFilterValue,
} from '../utils/rcInfographicData';
import {
  buildRcInfographicPdfShareUrl,
  copyTextToClipboard,
  getShareHostInfo,
} from '../utils/shareProposalLink';
import { RcInfographicPreviewModal } from './RcInfographicPreviewModal';
import { JabatanSelectField } from './JabatanSelectField';
import {
  StatusChecklistFilter,
} from './StatusChecklistFilter';

interface RcInfographicViewProps {
  proposals: UsulanProgram[];
  yearFilter?: YearFilterValue;
  yearFilterLabel: string;
  sektorFilter?: 'ALL' | SektorCiptaKarya;
  sectorFilterLabel?: string;
  fundingOptions?: import('./StatusChecklistFilter').StatusFilterOption[];
  totalBeforeFundingCount?: number;
  selectedFundingSources?: string[] | null;
  onChangeFundingSources?: (next: string[] | null) => void;
  onPreviewProposal: (id: string) => void;
  onFocusOnMap?: (id: string) => void;
  onPdfExported?: (fileName: string) => void;
  onCopyShareLink?: (url: string) => void;
}

export const RcInfographicView: React.FC<RcInfographicViewProps> = ({
  proposals,
  yearFilter = 'ALL',
  yearFilterLabel,
  sektorFilter = 'ALL',
  sectorFilterLabel = 'Semua Sektor Teknis',
  fundingOptions,
  totalBeforeFundingCount,
  selectedFundingSources,
  onChangeFundingSources,
  onPreviewProposal,
  onFocusOnMap,
  onPdfExported,
  onCopyShareLink,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tierFilter, setTierFilter] = useState<RcTierFilter>('ALL');
  const [selectedStatuses, setSelectedStatuses] = useState<string[] | null>(null);
  const [localSelectedFunding, setLocalSelectedFunding] = useState<string[] | null>(null);
  const [selectedSectors, setSelectedSectors] =
    useState<SektorCiptaKarya[]>(ALL_SEKTORS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [signatories, setSignatories] = useState<PdfSignatoriesConfig>(
    loadInitialRcSignatories
  );
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [showShareLinkPanel, setShowShareLinkPanel] = useState<boolean>(false);
  const [sharePreferSharedHost, setSharePreferSharedHost] = useState<boolean>(true);
  const [shareLayoutMode, setShareLayoutMode] = useState<RcPdfLayoutMode>('multi');
  const [shareLinkCopied, setShareLinkCopied] = useState<boolean>(false);

  useEffect(() => {
    void loadPuLogoDataUrl();
  }, []);

  useEffect(() => {
    saveRcSignatories(signatories);
  }, [signatories]);

  const activeFundingSelection =
    onChangeFundingSources !== undefined
      ? (selectedFundingSources ?? null)
      : localSelectedFunding;

  const handleFundingChange =
    onChangeFundingSources ?? setLocalSelectedFunding;

  const computedData = useMemo(
    () =>
      buildRcInfographicData({
        proposals,
        yearFilter: 'ALL',
        yearFilterLabel,
        sektorFilter: 'ALL',
        sectorFilterLabel,
        selectedFundingSources:
          onChangeFundingSources !== undefined ? null : localSelectedFunding,
        selectedSectors,
        selectedStatuses,
        tierFilter,
        sortOrder,
        searchQuery,
        signatories,
      }),
    [
      proposals,
      yearFilterLabel,
      sectorFilterLabel,
      onChangeFundingSources,
      localSelectedFunding,
      selectedSectors,
      selectedStatuses,
      tierFilter,
      sortOrder,
      searchQuery,
      signatories,
    ]
  );

  const effectiveFundingChecklistOptions =
    fundingOptions ?? computedData.fundingChecklistOptions;
  const availableInputSectors = computedData.availableInputSectors;
  const allRanked = computedData.allRanked;
  const statusChecklistOptions = computedData.statusChecklistOptions;
  const effectiveSelectedStatuses = computedData.effectiveSelectedStatuses;
  const statusScoped = computedData.statusScoped;
  const filteredRanked = computedData.filteredRanked;
  const summaryStats = computedData.summaryStats;
  const sectorAverages = computedData.sectorAverages;
  const regionalAverages = computedData.regionalAverages;
  const tierFilterLabel = computedData.tierFilterLabel;
  const statusFilterLabel = computedData.statusFilterLabel;
  const effectiveSectorFilterLabel = computedData.effectiveSectorFilterLabel;
  const mengesahkanCount = computedData.mengesahkanCount;

  const fundingFilterLabel = useMemo(() => {
    if (activeFundingSelection === null) return 'Semua Sumber Pendanaan';
    if (activeFundingSelection.length === 0) return 'Tidak Ada Sumber Pendanaan Dipilih';
    if (activeFundingSelection.length <= 3) return activeFundingSelection.join(', ');
    return `${activeFundingSelection.slice(0, 2).join(', ')} (+${activeFundingSelection.length - 2} lainnya)`;
  }, [activeFundingSelection]);

  const pdfContext = useMemo(
    () => ({
      ...computedData.pdfContext,
      fundingFilterLabel,
    }),
    [computedData.pdfContext, fundingFilterLabel]
  );

  const isOnlyNonBpbPreset =
    selectedSectors.length === NON_BPB_SEKTORS.length &&
    NON_BPB_SEKTORS.every((s) => selectedSectors.includes(s));

  const isAllSectorsSelected = selectedSectors.length === ALL_SEKTORS.length;

  const toggleSectorSelection = (sek: SektorCiptaKarya) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sek)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== sek);
      }
      return ALL_SEKTORS.filter((item) => item === sek || prev.includes(item));
    });
  };

  const shareHostInfo = useMemo(() => getShareHostInfo(), []);
  const rcPdfShareUrl = useMemo(
    () =>
      buildRcInfographicPdfShareUrl({
        preferSharedHost: sharePreferSharedHost,
        year: yearFilter,
        sektor: sektorFilter,
        sectors: selectedSectors,
        fundingSources: activeFundingSelection,
        tier: tierFilter,
        sortOrder,
        layoutMode: shareLayoutMode,
        searchQuery,
      }),
    [
      sharePreferSharedHost,
      yearFilter,
      sektorFilter,
      selectedSectors,
      activeFundingSelection,
      tierFilter,
      sortOrder,
      shareLayoutMode,
      searchQuery,
    ]
  );

  const handleExportRankingCsv = () => {
    const headers = [
      'Peringkat',
      'Skor RC (%)',
      'Kategori Kesiapan',
      'Kode Usulan',
      'Nama Program',
      'Sektor',
      'Kabupaten/Kota',
      'Pagu Total (Rp Miliar)',
      'Status Matriks',
    ];
    const rows = filteredRanked.map((item, idx) => [
      String(idx + 1),
      String(item.rcPercentage),
      item.tierLabel,
      item.proposal.kodeUsulan,
      item.proposal.namaProgram,
      SEKTOR_SHORT_LABELS[item.proposal.sektor],
      item.proposal.kabupatenKota,
      String(Number(item.totalPagu.toFixed(2))),
      item.statusDisplay,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `infografis-peringkat-rc-${sortOrder}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async (layoutMode: RcPdfLayoutMode = 'multi') => {
    const [logoDataUrl, batikAssets] = await Promise.all([
      loadPuLogoDataUrl(),
      loadPuBatikAssets(),
    ]);
    const fileName = exportRcInfographicPdf(
      filteredRanked,
      summaryStats,
      sectorAverages,
      regionalAverages,
      { ...pdfContext, logoDataUrl, batikAssets, layoutMode }
    );
    onPdfExported?.(fileName);
  };

  const handleScrollToSignatories = () => {
    const el = document.getElementById('rc-pdf-signatory-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const highShare =
    summaryStats.totalCount > 0
      ? Math.round((summaryStats.highCount / summaryStats.totalCount) * 100)
      : 0;
  const mediumShare =
    summaryStats.totalCount > 0
      ? Math.round((summaryStats.mediumCount / summaryStats.totalCount) * 100)
      : 0;
  const lowShare =
    summaryStats.totalCount > 0
      ? Math.max(0, 100 - highShare - mediumShare)
      : 0;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print-only Batik PU Institutional Header (Ctrl+P fallback) */}
      <div className="hidden print:block space-y-2">
        <div className="h-2.5 w-full batik-pu-strip border-b-2 border-[#E89611]" />
        <div className="batik-pu-banner text-white px-4 py-3 border-l-4 border-[#E89611] border-b-2 border-b-[#E89611] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={PU_LOGO_SRC}
              alt="Logo Kementerian Pekerjaan Umum"
              className="w-14 h-14 object-contain rounded bg-white p-0.5 border border-[#E89611] shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-wider text-amber-200 uppercase">
                Kementerian Pekerjaan Umum · SIMPRA BPBPK Nusa Tenggara Barat
              </div>
              <h1 className="text-lg font-bold text-white">
                Infografis Peringkat Skor Readiness Criteria (RC)
              </h1>
              <p className="text-xs font-medium text-indigo-100 mt-0.5">
                Usulan Program Infrastruktur Cipta Karya - BPBPK Nusa Tenggara Barat
              </p>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Sektor Teknis: {effectiveSectorFilterLabel}
                {fundingFilterLabel !== 'Semua Sumber Pendanaan'
                  ? ` · Sumber Pendanaan: ${fundingFilterLabel}`
                  : ''}{' '}
                · {yearFilterLabel} · {tierFilterLabel} · {statusFilterLabel} ·{' '}
                {filteredRanked.length} dari {statusScoped.length} Paket
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-indigo-100 font-mono shrink-0">
            <div>
              {sortOrder === 'desc' ? 'Tertinggi ke Terendah' : 'Terendah ke Tertinggi'}
            </div>
            <div>
              Dicetak:{' '}
              {new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }).format(new Date())}
            </div>
          </div>
        </div>
      </div>

      {/* Header & Controls Bar */}
      <section className="bg-white border border-[#D7E0F0] rounded-xl p-5 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#061459] tracking-tight">
              Infografis Peringkat Skor Readiness Criteria (RC)
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#0A1D6E] mt-0.5">
              Usulan Program Infrastruktur Cipta Karya - BPBPK Nusa Tenggara Barat
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Sektor Teknis:{' '}
              <span className="font-medium text-slate-700">{effectiveSectorFilterLabel}</span>
              <span aria-hidden="true"> · </span>
              <span>{yearFilterLabel}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{statusScoped.length}</span> Paket
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className="inline-flex items-center p-1 bg-[#EEF2FA] rounded-lg"
              role="group"
              aria-label="Urutan Skor RC"
            >
              <button
                type="button"
                onClick={() => setSortOrder('desc')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sortOrder === 'desc'
                    ? 'bg-white text-[#061459] shadow-xs'
                    : 'text-slate-600 hover:text-[#061459]'
                }`}
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5 text-[#0A1D6E]" />
                <span>Tertinggi ke Terendah</span>
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('asc')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sortOrder === 'asc'
                    ? 'bg-white text-[#061459] shadow-xs'
                    : 'text-slate-600 hover:text-[#061459]'
                }`}
              >
                <ArrowUpWideNarrow className="w-3.5 h-3.5 text-[#E89611]" />
                <span>Terendah ke Tertinggi</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportRankingCsv}
              disabled={filteredRanked.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#061459] bg-white border border-[#C7D3E8] hover:bg-[#F3F6FB] disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#0A1D6E]" />
              <span>Ekspor Peringkat CSV</span>
            </button>

            <button
              type="button"
              onClick={handleScrollToSignatories}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#061459] bg-white border border-[#C7D3E8] hover:bg-[#F3F6FB] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Isi data Mengesahkan & Menyetujui untuk Cetak PDF"
            >
              <PenLine className="w-3.5 h-3.5 text-[#0A1D6E]" />
              <span>Pengesahan PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShareLinkPanel((prev) => !prev)}
              disabled={statusScoped.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                showShareLinkPanel
                  ? 'bg-[#E89611] text-[#051044] border-[#E89611] font-semibold'
                  : 'text-[#061459] bg-white border-[#C7D3E8] hover:bg-[#F3F6FB]'
              }`}
              title="Generate Link Perlihat Saja (View Dokumen PDF Infografis Skor RC)"
            >
              <Link2 className={`w-3.5 h-3.5 ${showShareLinkPanel ? 'text-[#051044]' : 'text-[#0A1D6E]'}`} />
              <span>Link Perlihat PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPdfPreview(true)}
              disabled={statusScoped.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#061459] bg-white border border-[#C7D3E8] hover:bg-[#F3F6FB] disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Lihat pratinjau hasil Cetak PDF sebelum mengunduh"
            >
              <Eye className="w-3.5 h-3.5 text-[#0A1D6E]" />
              <span>Preview PDF</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportPdf('multi')}
              disabled={statusScoped.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#07165B] hover:bg-[#0A1D6E] disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Unduh laporan Infografis Skor RC dalam format PDF (multi halaman)"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Cetak PDF</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportPdf('single-sheet')}
              disabled={statusScoped.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#051044] bg-[#E89611] hover:bg-amber-400 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Alternatif Cetak PDF: padatkan seluruh halaman/paket menjadi 1 kertas A4"
            >
              <Printer className="w-3.5 h-3.5 text-[#051044]" />
              <span>Cetak PDF (1 Kertas)</span>
            </button>
          </div>
        </div>

        {showShareLinkPanel && (
          <div className="p-3.5 bg-[#F3F6FB] border border-[#C7D3E8] rounded-xl flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#061459]">
                  <Link2 className="w-3.5 h-3.5 text-[#E89611]" />
                  <span>Link Perlihat Saja · Dokumen PDF Infografis Skor RC</span>
                </span>
                <div className="inline-flex items-center rounded-md border border-[#C7D3E8] bg-white p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShareLayoutMode('multi')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      shareLayoutMode === 'multi'
                        ? 'bg-[#061459] text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Multi Halaman
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareLayoutMode('single-sheet')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      shareLayoutMode === 'single-sheet'
                        ? 'bg-[#E89611] text-[#051044] font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1 Kertas (Ringkas)
                  </button>
                </div>
                {shareHostInfo.isDevHost && (
                  <div className="inline-flex items-center rounded-md border border-[#C7D3E8] bg-white p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSharePreferSharedHost(true)}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        sharePreferSharedHost
                          ? 'bg-[#061459] text-white font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Link Publik
                    </button>
                    <button
                      type="button"
                      onClick={() => setSharePreferSharedHost(false)}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        !sharePreferSharedHost
                          ? 'bg-[#061459] text-white font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dev Preview
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowShareLinkPanel(false)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-white cursor-pointer"
                aria-label="Tutup panel link infografis PDF"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="text"
                readOnly
                value={rcPdfShareUrl}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Link langsung Dokumen PDF Infografis Peringkat Skor RC"
                className="flex-1 min-w-0 h-8 px-2.5 font-mono text-[11px] bg-white border border-[#C7D3E8] rounded-lg text-slate-800 focus:outline-none focus:border-[#0A1D6E]"
              />
              <button
                type="button"
                onClick={() => {
                  void copyTextToClipboard(rcPdfShareUrl).then((ok) => {
                    if (ok) {
                      setShareLinkCopied(true);
                      onCopyShareLink?.(rcPdfShareUrl);
                      window.setTimeout(() => setShareLinkCopied(false), 2500);
                    }
                  });
                }}
                className={`inline-flex items-center gap-1 px-3 h-8 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  shareLinkCopied
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#0A1D6E] hover:bg-[#061459] text-white'
                }`}
              >
                {shareLinkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-300" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
              <a
                href={rcPdfShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 h-8 text-xs font-medium text-[#061459] bg-white border border-[#C7D3E8] hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Buka link Dokumen PDF Infografis Skor RC di tab baru"
              >
                <span>Buka</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Filter Bar: Tier, Status Usulan & Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-3 border-t border-[#E5ECF7]">
          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EEF2FA] rounded-lg"
            role="group"
            aria-label="Filter Tingkat Kesiapan RC"
          >
            {(
              [
                { id: 'ALL', label: `Semua (${summaryStats.totalCount})` },
                { id: 'HIGH', label: `Siap ≥80% (${summaryStats.highCount})` },
                { id: 'MEDIUM', label: `Proses 50–79% (${summaryStats.mediumCount})` },
                { id: 'LOW', label: `Kurang <50% (${summaryStats.lowCount})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTierFilter(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  tierFilter === opt.id
                    ? 'bg-white text-[#061459] shadow-xs'
                    : 'text-slate-600 hover:text-[#061459]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 w-full xl:w-auto">
            <StatusChecklistFilter
              options={effectiveFundingChecklistOptions}
              totalCount={totalBeforeFundingCount ?? proposals.length}
              selectedValues={activeFundingSelection}
              onChange={handleFundingChange}
              ariaLabel="Ceklist Filter Sumber Pendanaan"
              allLabel="Semua Sumber Pendanaan"
              dialogLabel="Ceklist Filter Sumber Pendanaan"
              emptyDataLabel="Belum ada data sumber pendanaan"
              zeroSelectedLabel="0 Sumber Dana Dipilih"
              pluralLabel="Sumber Dana"
              icon="wallet"
              buttonClassName="w-full sm:w-56"
            />

            <StatusChecklistFilter
              options={statusChecklistOptions}
              totalCount={allRanked.length}
              selectedValues={effectiveSelectedStatuses}
              onChange={setSelectedStatuses}
              ariaLabel="Ceklist Filter Status Usulan"
              buttonClassName="w-full sm:w-56"
            />

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari paket, kode, kabupaten, status..."
                aria-label="Cari paket pada infografis skor RC"
                className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A1D6E]/20 focus:border-[#0A1D6E]"
              />
            </div>
          </div>
        </div>

        {availableInputSectors.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E5ECF7]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#061459] mr-1">
                Cakupan Sektor Cetak:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSectors(ALL_SEKTORS)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                  isAllSectorsSelected
                    ? 'bg-[#061459] text-white border-[#061459]'
                    : 'bg-white text-slate-600 border-[#C7D3E8] hover:text-[#061459]'
                }`}
              >
                Semua Sektor (4 Bidang)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSectors(NON_BPB_SEKTORS)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                  isOnlyNonBpbPreset
                    ? 'bg-[#E89611] text-[#051044] border-[#E89611] font-semibold'
                    : 'bg-white text-slate-600 border-[#C7D3E8] hover:text-[#061459]'
                }`}
                title="Hanya Sektor Air Minum, Sanitasi, dan PKS (Mengesahkan otomatis menjadi 2 kolom)"
              >
                Air Minum, Sanitasi &amp; PKS (2 Mengesahkan)
              </button>
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Pilih sektor yang ditampilkan pada infografis dan PDF"
            >
              {availableInputSectors.map((sek) => {
                const active = selectedSectors.includes(sek);
                return (
                  <button
                    key={sek}
                    type="button"
                    onClick={() => toggleSectorSelection(sek)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#EEF2FA] text-[#061459] border-[#0A1D6E]/40 font-semibold'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                  >
                    {SEKTOR_SHORT_LABELS[sek]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Summary Infographic Metrics Row */}
      <section
        aria-label="Ikhtisar Ekstrem Skor RC"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Skor RC Tertinggi</div>
          {summaryStats.highest ? (
            <>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-mono text-2xl font-bold tabular-nums text-emerald-700">
                  {summaryStats.highest.rcPercentage}%
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {summaryStats.highest.proposal.kodeUsulan}
                </span>
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-900 line-clamp-1">
                {summaryStats.highest.proposal.namaProgram}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                {summaryStats.highest.proposal.kabupatenKota}
                <span aria-hidden="true"> · </span>
                {SEKTOR_SHORT_LABELS[summaryStats.highest.proposal.sektor]}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-400">Belum ada paket usulan</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Skor RC Terendah</div>
          {summaryStats.lowest ? (
            <>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-mono text-2xl font-bold tabular-nums text-amber-700">
                  {summaryStats.lowest.rcPercentage}%
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {summaryStats.lowest.proposal.kodeUsulan}
                </span>
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-900 line-clamp-1">
                {summaryStats.lowest.proposal.namaProgram}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                {summaryStats.lowest.proposal.kabupatenKota}
                <span aria-hidden="true"> · </span>
                {SEKTOR_SHORT_LABELS[summaryStats.lowest.proposal.sektor]}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-400">Belum ada paket usulan</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              Jumlah Usulan per Kesiapan
            </span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-500">
              {summaryStats.totalCount} Paket
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {(
              [
                {
                  tier: 'HIGH' as const,
                  label: 'Usulan yang Siap (≥80%)',
                  count: summaryStats.highCount,
                  share: highShare,
                  barClass: 'bg-emerald-600',
                  textClass: 'text-emerald-700',
                },
                {
                  tier: 'MEDIUM' as const,
                  label: 'Jumlah yang Proses (50–79%)',
                  count: summaryStats.mediumCount,
                  share: mediumShare,
                  barClass: 'bg-blue-600',
                  textClass: 'text-blue-700',
                },
                {
                  tier: 'LOW' as const,
                  label: 'Jumlah yang Kurang (<50%)',
                  count: summaryStats.lowCount,
                  share: lowShare,
                  barClass: 'bg-amber-500',
                  textClass: 'text-amber-700',
                },
              ] as const
            ).map((row) => {
              const isSelected = tierFilter === row.tier;
              return (
                <button
                  key={row.tier}
                  type="button"
                  onClick={() =>
                    setTierFilter((prev) => (prev === row.tier ? 'ALL' : row.tier))
                  }
                  aria-pressed={isSelected}
                  title={`Filter peringkat: ${row.label}`}
                  className={`w-full text-left block rounded-md px-1.5 py-1 -mx-1.5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-slate-700 font-medium truncate">
                      {row.label}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums shrink-0 ${row.textClass}`}
                    >
                      {row.count} Paket · {row.share}%
                    </span>
                  </div>
                  <div className="mt-1 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${row.barClass}`}
                      style={{
                        width: `${row.count > 0 ? Math.max(4, row.share) : 0}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Infographic Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 print:block gap-6 items-start">
        {/* Ranked Bar Chart List + PDF Signatories Panel */}
        <div className="lg:col-span-8 print:col-span-12 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Grafik Peringkat Skor RC per Paket Usulan (
                  {sortOrder === 'desc' ? 'Tertinggi – Terendah' : 'Terendah – Tertinggi'})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan <span className="font-mono tabular-nums">{filteredRanked.length}</span>{' '}
                  dari <span className="font-mono tabular-nums">{statusScoped.length}</span> paket
                  beserta perbandingan ambang kesiapan 80%
                </p>
              </div>
            </div>

            {filteredRanked.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-xs text-slate-500">
                  Tidak ada paket usulan yang cocok dengan filter status, kesiapan, atau pencarian saat ini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTierFilter('ALL');
                    setSelectedStatuses(null);
                    handleFundingChange(null);
                    setSelectedSectors(ALL_SEKTORS);
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Reset Filter Infografis
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRanked.map((item, idx) => {
                  const p = item.proposal;
                  const tierMeta = getTierMeta(item.rcPercentage);
                  const rankNumber = String(idx + 1).padStart(2, '0');
                  const barWidth = Math.max(2, Math.min(100, item.rcPercentage));

                  return (
                    <div
                      key={p.id}
                      className="py-4 first:pt-4 last:pb-1 hover:bg-slate-50/70 transition-colors rounded-lg px-2 -mx-2 break-inside-avoid"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span
                            className={`font-mono text-sm font-bold tabular-nums w-7 shrink-0 pt-0.5 ${
                              idx < 3 && sortOrder === 'desc'
                                ? 'text-blue-700'
                                : 'text-slate-400'
                            }`}
                          >
                            #{rankNumber}
                          </span>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onPreviewProposal(p.id)}
                              className="text-left text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors cursor-pointer line-clamp-2"
                            >
                              {p.namaProgram}
                            </button>

                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                              <span className="font-mono text-slate-600">{p.kodeUsulan}</span>
                              <span aria-hidden="true">·</span>
                              <span>{SEKTOR_SHORT_LABELS[p.sektor]}</span>
                              <span aria-hidden="true">·</span>
                              <span>{p.kabupatenKota}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-slate-700">
                                {formatRpMiliar(item.totalPagu)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{item.statusDisplay}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div
                              className={`font-mono text-base font-bold tabular-nums ${tierMeta.textColor}`}
                            >
                              {item.rcPercentage}%
                            </div>
                            <div className="text-[11px] text-slate-500 whitespace-nowrap">
                              {tierMeta.tierLabel}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 print:hidden">
                            <button
                              type="button"
                              onClick={() => onPreviewProposal(p.id)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                              title="Pratinjau lembar usulan"
                              aria-label={`Pratinjau ${p.namaProgram}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {onFocusOnMap && (
                              <button
                                type="button"
                                onClick={() => onFocusOnMap(p.id)}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                                title="Fokus pada peta spasial"
                                aria-label={`Lokasi peta ${p.namaProgram}`}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Visual Horizontal Progress Bar with 80% Readiness Benchmark */}
                      <div className="mt-2.5 pl-10">
                        <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: tierMeta.barColor,
                            }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-px bg-slate-400/80"
                            style={{ left: '80%' }}
                            title="Ambang Kesiapan 80%"
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                          <span>
                            {item.isManualScore
                              ? 'Skor RC manual'
                              : `Terpenuhi ${item.rcCompleted}/${item.rcTotal} kriteria`}
                          </span>
                          <span>Ambang 80%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Data Pengesahan & Persetujuan Cetak PDF (Mengesahkan Kiri & Menyetujui Kanan) */}
          <section
            id="rc-pdf-signatory-panel"
            aria-label="Data Pengesahan Cetak PDF"
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 break-inside-avoid"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 print:hidden">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Data Pengesahan &amp; Persetujuan (Cetak PDF)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mengesahkanCount === 2
                    ? 'Cakupan hanya Sektor Air Minum, Sanitasi, dan/atau PKS — otomatis menampilkan 2 kolom Mengesahkan dan 1 kolom Menyetujui.'
                    : 'Ditampilkan di bagian bawah setelah Grafik Peringkat Skor RC per Paket Usulan saat Cetak PDF (3 kolom Mengesahkan dan 1 kolom Menyetujui).'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSignatories(createEmptySignatories())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Kosongkan nama dan jabatan pengesah"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Kolom</span>
              </button>
            </div>

            <div className="print:hidden space-y-4">
              <div className="max-w-xs">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Tempat &amp; Tanggal (Sebelah Kanan)
                </label>
                <input
                  type="text"
                  value={signatories.tempatTanggal}
                  onChange={(e) =>
                    setSignatories((prev) => ({
                      ...prev,
                      tempatTanggal: e.target.value,
                    }))
                  }
                  placeholder="Contoh: Mataram, 17 November 2026"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div
                className={`grid gap-4 pt-1 ${
                  mengesahkanCount === 2
                    ? 'grid-cols-1 md:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                }`}
              >
                {/* Mengesahkan 1 */}
                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-900">
                    Mengesahkan 1
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jabatan
                    </label>
                    <JabatanSelectField
                      variant="slate"
                      ariaLabel="Jabatan Mengesahkan 1"
                      value={signatories.mengesahkan.jabatan}
                      onChange={(val) =>
                        setSignatories((prev) => ({
                          ...prev,
                          mengesahkan: {
                            ...prev.mengesahkan,
                            jabatan: val,
                          },
                        }))
                      }
                      placeholder="Ketik jabatan mengesahkan 1 secara manual"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Lengkap &amp; Gelar
                    </label>
                    <input
                      type="text"
                      value={signatories.mengesahkan.nama}
                      onChange={(e) =>
                        setSignatories((prev) => ({
                          ...prev,
                          mengesahkan: {
                            ...prev.mengesahkan,
                            nama: e.target.value,
                          },
                        }))
                      }
                      placeholder="Nama pejabat yang mengesahkan"
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Mengesahkan 2 */}
                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-900">
                    Mengesahkan 2
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jabatan
                    </label>
                    <JabatanSelectField
                      variant="slate"
                      ariaLabel="Jabatan Mengesahkan 2"
                      value={signatories.mengesahkan2?.jabatan ?? ''}
                      onChange={(val) =>
                        setSignatories((prev) => ({
                          ...prev,
                          mengesahkan2: {
                            jabatan: val,
                            nama: prev.mengesahkan2?.nama ?? '',
                          },
                        }))
                      }
                      placeholder="Ketik jabatan mengesahkan 2 secara manual"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Lengkap &amp; Gelar
                    </label>
                    <input
                      type="text"
                      value={signatories.mengesahkan2?.nama ?? ''}
                      onChange={(e) =>
                        setSignatories((prev) => ({
                          ...prev,
                          mengesahkan2: {
                            jabatan: prev.mengesahkan2?.jabatan ?? '',
                            nama: e.target.value,
                          },
                        }))
                      }
                      placeholder="Nama pejabat yang mengesahkan"
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Mengesahkan 3 (hanya muncul bila Sektor BPB masuk dalam cakupan) */}
                {mengesahkanCount === 3 && (
                  <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <div className="text-xs font-bold text-slate-900">
                      Mengesahkan 3
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Jabatan
                      </label>
                      <JabatanSelectField
                        variant="slate"
                        ariaLabel="Jabatan Mengesahkan 3"
                        value={signatories.mengesahkan3?.jabatan ?? ''}
                        onChange={(val) =>
                          setSignatories((prev) => ({
                            ...prev,
                            mengesahkan3: {
                              jabatan: val,
                              nama: prev.mengesahkan3?.nama ?? '',
                            },
                          }))
                        }
                        placeholder="Ketik jabatan mengesahkan 3 secara manual"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Nama Lengkap &amp; Gelar
                      </label>
                      <input
                        type="text"
                        value={signatories.mengesahkan3?.nama ?? ''}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            mengesahkan3: {
                              jabatan: prev.mengesahkan3?.jabatan ?? '',
                              nama: e.target.value,
                            },
                          }))
                        }
                        placeholder="Nama pejabat yang mengesahkan"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>
                )}

                {/* Sebelah Kanan: Menyetujui */}
                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-900">
                    Menyetujui (Sebelah Kanan)
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jabatan
                    </label>
                    <input
                      type="text"
                      value={signatories.menyetujui.jabatan}
                      onChange={(e) =>
                        setSignatories((prev) => ({
                          ...prev,
                          menyetujui: {
                            ...prev.menyetujui,
                            jabatan: e.target.value,
                          },
                        }))
                      }
                      placeholder="Contoh: Ketua Tim Sinkronisasi Program"
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Lengkap &amp; Gelar
                    </label>
                    <input
                      type="text"
                      value={signatories.menyetujui.nama}
                      onChange={(e) =>
                        setSignatories((prev) => ({
                          ...prev,
                          menyetujui: {
                            ...prev.menyetujui,
                            nama: e.target.value,
                          },
                        }))
                      }
                      placeholder="Nama pejabat yang menyetujui"
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Print-only Formal Signature Block */}
            <div
              className={`hidden print:grid gap-4 py-2 text-center text-xs text-slate-900 ${
                mengesahkanCount === 2 ? 'print:grid-cols-3' : 'print:grid-cols-4'
              }`}
            >
              {(mengesahkanCount === 2
                ? [
                    signatories.mengesahkan,
                    signatories.mengesahkan2 ?? { jabatan: '', nama: '' },
                  ]
                : [
                    signatories.mengesahkan,
                    signatories.mengesahkan2 ?? { jabatan: '', nama: '' },
                    signatories.mengesahkan3 ?? { jabatan: '', nama: '' },
                  ]
              ).map((party, idx) => (
                <div
                  key={`rc-print-mengesahkan-${idx}`}
                  className="flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div>
                    <div className="h-4" />
                    <div className="font-bold">Mengesahkan,</div>
                    {party.jabatan.trim() && (
                      <div className="text-[11px] text-slate-700 mt-0.5 max-w-[190px]">
                        {party.jabatan.trim()}
                      </div>
                    )}
                  </div>
                  <div className="pt-12">
                    <div className="font-bold underline underline-offset-4">
                      {party.nama.trim() || '( .............................. )'}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col items-center justify-between min-h-[120px]">
                <div>
                  <div className="text-[11px] text-slate-700 h-4">
                    {signatories.tempatTanggal.trim()}
                  </div>
                  <div className="font-bold">Menyetujui,</div>
                  {signatories.menyetujui.jabatan.trim() && (
                    <div className="text-[11px] text-slate-700 mt-0.5 max-w-[190px]">
                      {signatories.menyetujui.jabatan.trim()}
                    </div>
                  )}
                </div>
                <div className="pt-12">
                  <div className="font-bold underline underline-offset-4">
                    {signatories.menyetujui.nama.trim() ||
                      '( .............................. )'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebars: Sector & Kabupaten/Kota RC Comparison (hidden on print) */}
        <aside className="lg:col-span-4 space-y-6 print:hidden">
          {/* Rata-rata RC per Sektor */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 print:hidden">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Rata-Rata Skor RC per Sektor
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan tingkat kesiapan teknis antar bidang Cipta Karya
              </p>
            </div>

            <div className="space-y-3.5">
              {sectorAverages.map((sec) => {
                const meta = getTierMeta(sec.avgPct);
                return (
                  <div key={sec.sektor} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 truncate">
                        {sec.shortLabel}
                      </span>
                      <span className={`font-mono font-bold tabular-nums ${meta.textColor}`}>
                        {sec.avgPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(sec.count > 0 ? 3 : 0, sec.avgPct)}%`,
                          backgroundColor: meta.barColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>
                        {sec.count} paket · {formatRpMiliar(sec.totalPagu)}
                      </span>
                      {sec.count > 0 && (
                        <span>
                          {sec.minPct}%–{sec.maxPct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Rata-rata RC per Kabupaten/Kota */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 print:hidden">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Peringkat Skor RC per Kabupaten/Kota
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rata-rata skor kesiapan wilayah pengusul di NTB
              </p>
            </div>

            {regionalAverages.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                Belum ada data wilayah pengusul.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {regionalAverages.map((reg, idx) => {
                  const meta = getTierMeta(reg.avgPct);
                  return (
                    <div key={reg.kabupaten} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <span className="font-medium text-slate-900 truncate">
                            {reg.kabupaten}
                          </span>
                        </div>
                        <span className={`font-mono font-bold tabular-nums shrink-0 ${meta.textColor}`}>
                          {reg.avgPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(3, reg.avgPct)}%`,
                            backgroundColor: meta.barColor,
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {reg.count} paket · {formatRpMiliar(reg.totalPagu)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      <RcInfographicPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        onDownloadPdf={(mode) => void handleExportPdf(mode)}
        onEditSignatories={() => {
          window.setTimeout(handleScrollToSignatories, 80);
        }}
        rankedItems={filteredRanked}
        summaryStats={summaryStats}
        sectorAverages={sectorAverages}
        regionalAverages={regionalAverages}
        context={pdfContext}
        initialLayoutMode={shareLayoutMode}
        shareUrl={rcPdfShareUrl}
        onCopyPdfLink={onCopyShareLink}
      />
    </div>
  );
};
