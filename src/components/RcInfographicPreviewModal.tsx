import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FileText,
  PenLine,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatRpMiliar, SEKTOR_SHORT_LABELS } from '../data/initialProposals';
import {
  createRcInfographicPdfPreview,
  PdfExportContext,
  PdfRankedProposalItem,
  PdfRegionalAverage,
  PdfSectorAverage,
  PdfSummaryStats,
  RcPdfLayoutMode,
  RcPdfPreviewPayload,
} from '../utils/exportRcInfographicPdf';
import { loadPuLogoDataUrl, PU_LOGO_SRC } from '../utils/puLogoAsset';

interface RcInfographicPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: (layoutMode: RcPdfLayoutMode) => void;
  onEditSignatories: () => void;
  rankedItems: PdfRankedProposalItem[];
  summaryStats: PdfSummaryStats;
  sectorAverages: PdfSectorAverage[];
  regionalAverages: PdfRegionalAverage[];
  context: PdfExportContext;
  initialLayoutMode?: RcPdfLayoutMode;
}

type PreviewMode = 'sheet' | 'pdf';

function getTierHex(pct: number): { bar: string; textClass: string } {
  if (pct >= 80) return { bar: '#059669', textClass: 'text-emerald-700' };
  if (pct >= 50) return { bar: '#2563eb', textClass: 'text-blue-700' };
  return { bar: '#d97706', textClass: 'text-amber-700' };
}

export const RcInfographicPreviewModal: React.FC<RcInfographicPreviewModalProps> = ({
  isOpen,
  onClose,
  onDownloadPdf,
  onEditSignatories,
  rankedItems,
  summaryStats,
  sectorAverages,
  regionalAverages,
  context,
  initialLayoutMode = 'multi',
}) => {
  const [mode, setMode] = useState<PreviewMode>('sheet');
  const [layoutMode, setLayoutMode] = useState<RcPdfLayoutMode>(initialLayoutMode);
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [pdfPayload, setPdfPayload] = useState<RcPdfPreviewPayload | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLayoutMode(initialLayoutMode);
    }
  }, [isOpen, initialLayoutMode]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let generatedUrl: string | null = null;

    void (async () => {
      const logoDataUrl = context.logoDataUrl ?? (await loadPuLogoDataUrl());
      if (cancelled) return;
      const payload = createRcInfographicPdfPreview(
        rankedItems,
        summaryStats,
        sectorAverages,
        regionalAverages,
        { ...context, logoDataUrl, layoutMode }
      );
      if (cancelled) {
        URL.revokeObjectURL(payload.blobUrl);
        return;
      }
      generatedUrl = payload.blobUrl;
      setPdfPayload(payload);
    })();

    return () => {
      cancelled = true;
      if (generatedUrl) {
        URL.revokeObjectURL(generatedUrl);
      }
      setPdfPayload(null);
    };
  }, [isOpen, rankedItems, summaryStats, sectorAverages, regionalAverages, context, layoutMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const printTimestamp = useMemo(
    () =>
      new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    [isOpen]
  );

  if (!isOpen) return null;

  const totalCount = summaryStats.totalCount;
  const highShare =
    totalCount > 0 ? Math.round((summaryStats.highCount / totalCount) * 100) : 0;
  const mediumShare =
    totalCount > 0 ? Math.round((summaryStats.mediumCount / totalCount) * 100) : 0;
  const lowShare = totalCount > 0 ? Math.max(0, 100 - highShare - mediumShare) : 0;

  const sortLabel =
    context.sortOrder === 'desc' ? 'Tertinggi ke Terendah' : 'Terendah ke Tertinggi';
  const sig = context.signatories;

  const handlePrintNow = () => {
    onClose();
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-[1px] flex flex-col print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rc-pdf-preview-title"
    >
      {/* Top Preview Toolbar */}
      <header className="bg-[#061459] text-white border-b-2 border-[#E89611] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#E89611] text-[#051044] flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2
              id="rc-pdf-preview-title"
              className="text-sm font-bold tracking-tight truncate"
            >
              Preview Cetak PDF · Infografis Peringkat Skor RC
            </h2>
            <p className="text-[11px] text-amber-200/95 truncate">
              Format A4 Landscape ·{' '}
              {pdfPayload ? `${pdfPayload.pageCount} Halaman PDF` : 'Menyiapkan dokumen...'} ·{' '}
              {rankedItems.length} Paket Usulan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher between Guaranteed A4 Layout Preview & Embedded PDF Blob */}
          <div
            className="inline-flex items-center p-1 bg-[#040E42] border border-white/15 rounded-lg"
            role="group"
            aria-label="Mode Pratinjau"
          >
            <button
              type="button"
              onClick={() => setMode('sheet')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'sheet'
                  ? 'bg-[#E89611] text-[#051044] font-semibold'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tata Letak A4</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('pdf')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'pdf'
                  ? 'bg-[#E89611] text-[#051044] font-semibold'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dokumen PDF</span>
            </button>
          </div>

          {mode === 'sheet' && (
            <div className="hidden sm:inline-flex items-center gap-1 bg-[#040E42] border border-white/15 rounded-lg px-1.5 py-1">
              <button
                type="button"
                onClick={() => setZoomPct((z) => Math.max(75, z - 15))}
                disabled={zoomPct <= 75}
                className="p-1 text-indigo-100 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Perkecil"
                aria-label="Perkecil pratinjau"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono tabular-nums px-1.5 text-amber-200">
                {zoomPct}%
              </span>
              <button
                type="button"
                onClick={() => setZoomPct((z) => Math.min(130, z + 15))}
                disabled={zoomPct >= 130}
                className="p-1 text-indigo-100 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Perbesar"
                aria-label="Perbesar pratinjau"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Alternative Page Mode Switcher: Multi Halaman vs 1 Kertas */}
          <div
            className="inline-flex items-center p-1 bg-[#040E42] border border-white/15 rounded-lg"
            role="group"
            aria-label="Alternatif Susunan Kertas PDF"
          >
            <button
              type="button"
              onClick={() => setLayoutMode('multi')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                layoutMode === 'multi'
                  ? 'bg-white text-[#051044] font-semibold'
                  : 'text-indigo-100 hover:text-white'
              }`}
              title="Susunan standar berlanjut beberapa halaman bila paket banyak"
            >
              Multi Halaman
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('single-sheet')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                layoutMode === 'single-sheet'
                  ? 'bg-[#E89611] text-[#051044] font-semibold'
                  : 'text-indigo-100 hover:text-white'
              }`}
              title="Padatkan seluruh grafik dan pengesahan ke dalam 1 kertas A4"
            >
              1 Kertas (Ringkas)
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEditSignatories();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <PenLine className="w-3.5 h-3.5 text-amber-300" />
            <span>Edit Pengesahan</span>
          </button>

          <button
            type="button"
            onClick={handlePrintNow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Cetak Printer</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadPdf(layoutMode)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#051044] bg-[#E89611] hover:bg-amber-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{layoutMode === 'single-sheet' ? 'Unduh PDF (1 Kertas)' : 'Unduh PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup Preview Cetak PDF"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Preview Body */}
      <div
        className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-800/80"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {mode === 'pdf' && pdfPayload ? (
          <div className="max-w-[1160px] mx-auto h-full min-h-[540px] flex flex-col gap-3">
            <div className="bg-slate-900/90 text-slate-200 border border-slate-700 rounded-lg px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
              <span>
                Berkas: <strong className="font-mono text-amber-300">{pdfPayload.fileName}</strong>{' '}
                ({pdfPayload.pageCount} halaman A4 Landscape)
              </span>
              <span className="text-slate-400">
                Jika viewer PDF tidak muncul di browser Anda, gunakan tab{' '}
                <strong className="text-white">Tata Letak A4</strong> atau klik{' '}
                <strong className="text-amber-300">Unduh PDF</strong>.
              </span>
            </div>
            <iframe
              src={pdfPayload.blobUrl}
              title="Pratinjau Dokumen PDF Infografis Skor RC"
              className="w-full flex-1 min-h-[600px] bg-white rounded-lg border border-slate-700 shadow-2xl"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 w-full max-w-[1122px] p-6 sm:p-8 space-y-5 origin-top transition-transform"
              style={
                zoomPct !== 100
                  ? {
                      transform: `scale(${zoomPct / 100})`,
                      marginBottom: `${Math.max(0, (zoomPct - 100) * 6)}px`,
                    }
                  : undefined
              }
            >
              {/* Institutional Banner matching PDF */}
              <div className="bg-slate-900 text-white px-5 py-4 border-l-4 border-blue-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={PU_LOGO_SRC}
                    alt="Logo Kementerian Pekerjaan Umum"
                    className="w-14 h-14 object-contain rounded border border-amber-400/70 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium tracking-wider text-blue-300 uppercase">
                      KEMENTERIAN PEKERJAAN UMUM · SIMPRA BPBPK NUSA TENGGARA BARAT
                    </div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight mt-0.5">
                      INFOGRAFIS PERINGKAT SKOR READINESS CRITERIA (RC)
                    </h3>
                    <div className="text-xs text-amber-200 mt-0.5 font-medium">
                      Usulan Program Infrastruktur Cipta Karya - BPBPK Nusa Tenggara Barat
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right text-[11px] text-slate-300 font-mono space-y-0.5 shrink-0">
                  <div>Tahun Anggaran: {context.yearFilterLabel}</div>
                  <div>Dicetak: {printTimestamp}</div>
                  <div>
                    Cakupan Paket: {rankedItems.length} dari {summaryStats.totalCount} Usulan
                  </div>
                </div>
              </div>

              {/* Filter Context Strip */}
              <div className="bg-slate-100 border border-slate-200 rounded px-3.5 py-2 text-[11px] text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong>Sektor Teknis:</strong>{' '}
                  {context.sectorFilterLabel || 'Semua Sektor Teknis'}
                </span>
                <span>
                  <strong>Urutan:</strong> {sortLabel}
                </span>
                <span>
                  <strong>Kesiapan:</strong> {context.tierFilterLabel}
                </span>
                <span>
                  <strong>Status Usulan:</strong> {context.statusFilterLabel}
                </span>
                {context.searchQuery.trim() && (
                  <span>
                    <strong>Pencarian:</strong> &ldquo;{context.searchQuery.trim()}&rdquo;
                  </span>
                )}
              </div>

              {/* 3-Column KPI Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* KPI 1: Highest */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <div className="text-[11px] font-bold text-slate-500">Skor RC Tertinggi</div>
                  {summaryStats.highest ? (
                    <>
                      <div className="mt-1.5 flex items-baseline justify-between gap-2">
                        <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                          {summaryStats.highest.rcPercentage}%
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {summaryStats.highest.proposal.kodeUsulan}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-900 truncate">
                        {summaryStats.highest.proposal.namaProgram}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {summaryStats.highest.proposal.kabupatenKota} ·{' '}
                        {SEKTOR_SHORT_LABELS[summaryStats.highest.proposal.sektor]}
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">Belum ada paket usulan</div>
                  )}
                </div>

                {/* KPI 2: Lowest */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <div className="text-[11px] font-bold text-slate-500">Skor RC Terendah</div>
                  {summaryStats.lowest ? (
                    <>
                      <div className="mt-1.5 flex items-baseline justify-between gap-2">
                        <span className="font-mono text-2xl font-bold text-amber-700 tabular-nums">
                          {summaryStats.lowest.rcPercentage}%
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {summaryStats.lowest.proposal.kodeUsulan}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-900 truncate">
                        {summaryStats.lowest.proposal.namaProgram}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {summaryStats.lowest.proposal.kabupatenKota} ·{' '}
                        {SEKTOR_SHORT_LABELS[summaryStats.lowest.proposal.sektor]}
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">Belum ada paket usulan</div>
                  )}
                </div>

                {/* KPI 3: Infografis Jumlah Usulan per Kesiapan */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      Jumlah Usulan per Kesiapan
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {totalCount} Paket
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded bg-slate-100 overflow-hidden flex">
                    {summaryStats.highCount > 0 && (
                      <div
                        className="h-full bg-emerald-600"
                        style={{
                          width: `${(summaryStats.highCount / Math.max(1, totalCount)) * 100}%`,
                        }}
                      />
                    )}
                    {summaryStats.mediumCount > 0 && (
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${(summaryStats.mediumCount / Math.max(1, totalCount)) * 100}%`,
                        }}
                      />
                    )}
                    {summaryStats.lowCount > 0 && (
                      <div
                        className="h-full bg-amber-500"
                        style={{
                          width: `${(summaryStats.lowCount / Math.max(1, totalCount)) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="mt-2.5 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        Usulan yang Siap (≥80%)
                      </span>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        {summaryStats.highCount} ({highShare}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        Jumlah yang Proses (50–79%)
                      </span>
                      <span className="font-mono font-bold text-blue-700 tabular-nums">
                        {summaryStats.mediumCount} ({mediumShare}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Jumlah yang Kurang (&lt;50%)
                      </span>
                      <span className="font-mono font-bold text-amber-700 tabular-nums">
                        {summaryStats.lowCount} ({lowShare}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Grafik Peringkat Skor RC per Paket Usulan */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Grafik Peringkat Skor RC per Paket Usulan ({sortLabel})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Menampilkan {rankedItems.length} paket sesuai filter aktif · Garis putus pada bar
                      menandakan ambang batas 80%
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Siap ≥80%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600" /> Proses 50–79%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Kurang &lt;50%
                    </span>
                  </div>
                </div>

                {rankedItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada paket usulan yang sesuai filter.
                  </div>
                ) : layoutMode === 'single-sheet' ? (
                  <div
                    className={`p-3 grid gap-2 ${
                      rankedItems.length <= 8
                        ? 'grid-cols-1'
                        : rankedItems.length <= 24
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {rankedItems.map((item, idx) => {
                      const tier = getTierHex(item.rcPercentage);
                      return (
                        <div
                          key={item.proposal.id}
                          className="border border-slate-200 rounded px-2.5 py-1.5 bg-white space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[10px] font-bold text-slate-500 tabular-nums shrink-0">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="text-[11px] font-bold text-slate-900 truncate">
                                {item.proposal.namaProgram}
                              </span>
                            </div>
                            <span
                              className={`font-mono text-[11px] font-bold tabular-nums shrink-0 ${tier.textClass}`}
                            >
                              {item.rcPercentage}%
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-500 truncate pl-6">
                            {item.proposal.kabupatenKota} · {SEKTOR_SHORT_LABELS[item.proposal.sektor]} ·{' '}
                            {formatRpMiliar(item.totalPagu)}
                          </div>
                          <div className="pl-6">
                            <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(2, Math.min(100, item.rcPercentage))}%`,
                                  backgroundColor: tier.bar,
                                }}
                              />
                              <div
                                className="absolute top-0 bottom-0 w-px bg-slate-700"
                                style={{ left: '80%' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {rankedItems.map((item, idx) => {
                      const tier = getTierHex(item.rcPercentage);
                      return (
                        <div
                          key={item.proposal.id}
                          className={`px-4 py-2 flex items-center gap-3 ${
                            idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                          }`}
                        >
                          <div className="w-7 text-center font-mono text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {item.proposal.namaProgram}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {item.proposal.kodeUsulan} · {item.proposal.kabupatenKota} ·{' '}
                              {SEKTOR_SHORT_LABELS[item.proposal.sektor]} ·{' '}
                              {formatRpMiliar(item.totalPagu)}
                              {item.statusDisplay ? ` · Status: ${item.statusDisplay}` : ''}
                            </div>
                          </div>
                          <div className="w-12 text-right font-mono text-xs font-bold tabular-nums shrink-0">
                            <span className={tier.textClass}>{item.rcPercentage}%</span>
                          </div>
                          <div className="w-44 sm:w-56 relative h-2.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(2, Math.min(100, item.rcPercentage))}%`,
                                backgroundColor: tier.bar,
                              }}
                            />
                            <div
                              className="absolute top-0 bottom-0 w-px bg-slate-700"
                              style={{ left: '80%' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Signature Block: Mengesahkan (Left) & Menyetujui (Right) without NIP */}
              <div className="border border-slate-200 rounded-lg px-6 py-5 bg-white">
                <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-900">
                  <div className="flex flex-col items-center justify-between min-h-[108px]">
                    <div>
                      <div className="h-4" />
                      <div className="font-bold">Mengesahkan,</div>
                      {sig?.mengesahkan.jabatan.trim() && (
                        <div className="text-[11px] text-slate-600 mt-0.5 max-w-xs">
                          {sig.mengesahkan.jabatan.trim()}
                        </div>
                      )}
                    </div>
                    <div className="pt-10">
                      <div className="font-bold underline underline-offset-4">
                        {sig?.mengesahkan.nama.trim() ||
                          '( ........................................ )'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-between min-h-[108px]">
                    <div>
                      <div className="text-[11px] text-slate-600 h-4">
                        {sig?.tempatTanggal.trim()}
                      </div>
                      <div className="font-bold">Menyetujui,</div>
                      {sig?.menyetujui.jabatan.trim() && (
                        <div className="text-[11px] text-slate-600 mt-0.5 max-w-xs">
                          {sig.menyetujui.jabatan.trim()}
                        </div>
                      )}
                    </div>
                    <div className="pt-10">
                      <div className="font-bold underline underline-offset-4">
                        {sig?.menyetujui.nama.trim() ||
                          '( ........................................ )'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer matching PDF */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  SIMPRA BPBPK NTB TA. 2027-2030 · Infografis Peringkat Skor Readiness Criteria (RC)
                </span>
                <span>
                  {pdfPayload ? `${pdfPayload.pageCount} Halaman (A4 Landscape)` : 'A4 Landscape'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
