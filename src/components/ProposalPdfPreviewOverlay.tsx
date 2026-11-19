import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  ListChecks,
  MapPin,
  PenLine,
  PieChart,
  Printer,
  Square,
  Target,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  formatActiveYears,
  getRcChecklistFlags,
  KEMENPU_RC_ROWS,
} from '../data/initialProposals';
import { ReadinessCriteria } from '../types/ciptaKarya';
import {
  createProposalProfilePdfPreview,
  ProposalProfilePdfInput,
  ProposalProfilePdfPreviewPayload,
} from '../utils/exportProposalProfilePdf';
import {
  loadPuBatikAssets,
  loadPuWordmarkDataUrl,
  PU_WORDMARK_SRC,
} from '../utils/puLogoAsset';

interface ProposalPdfPreviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
  onPrintDirect: () => void;
  onEditSignatories?: () => void;
  onToggleIncludeDetailRc?: (nextVal: boolean) => void;
  pdfInput: ProposalProfilePdfInput;
}

type PreviewMode = 'sheet' | 'pdf';

const CORE_READINESS_PREVIEW_META: Array<{
  key: keyof ReadinessCriteria;
  label: string;
  desc: string;
}> = [
  {
    key: 'dokumenPerencanaan',
    label: 'Dokumen Perencanaan',
    desc: 'RISPAM / RIPS / RISPAL / RIPKS / Masterplan',
  },
  {
    key: 'dedRab',
    label: 'DED & RAB',
    desc: 'FS, Detailed Engineering Design & RAB',
  },
  {
    key: 'kesiapanLahan',
    label: 'Kesiapan Lahan',
    desc: 'Sertifikat / Status Lahan Clean & Clear',
  },
  {
    key: 'dokumenLingkungan',
    label: 'Dokumen Lingkungan',
    desc: 'AMDAL / UKL-UPL / SPPL',
  },
  {
    key: 'lembagaPengelola',
    label: 'Lembaga Pengelola',
    desc: 'Surat Minat & Komitmen Pemda / UPTD / BUMD',
  },
];

function getRcDetailStatusMeta(flags: {
  ada: boolean;
  kurang: boolean;
  sesuai: boolean;
}): {
  label: string;
  badgeClass: string;
} {
  if (flags.sesuai && !flags.kurang) {
    return {
      label: 'Sesuai & Lengkap',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (flags.ada && flags.kurang) {
    return {
      label: 'Ada · Perlu Dilengkapi',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (flags.kurang) {
    return {
      label: 'Kurang / Revisi',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (flags.ada) {
    return {
      label: 'Ada (Dalam Reviu)',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }
  return {
    label: 'Belum Tersedia',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  };
}

function formatNumberMiliar(val: number): string {
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

export const ProposalPdfPreviewOverlay: React.FC<ProposalPdfPreviewOverlayProps> = ({
  isOpen,
  onClose,
  onDownloadPdf,
  onPrintDirect,
  onEditSignatories,
  onToggleIncludeDetailRc,
  pdfInput,
}) => {
  const [mode, setMode] = useState<PreviewMode>('sheet');
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [pdfPayload, setPdfPayload] = useState<ProposalProfilePdfPreviewPayload | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let generatedUrl: string | null = null;

    void (async () => {
      const [wordmarkDataUrl, batikAssets] = await Promise.all([
        pdfInput.wordmarkDataUrl
          ? Promise.resolve(pdfInput.wordmarkDataUrl)
          : loadPuWordmarkDataUrl(),
        pdfInput.batikAssets ? Promise.resolve(pdfInput.batikAssets) : loadPuBatikAssets(),
      ]);
      if (cancelled) return;
      const payload = createProposalProfilePdfPreview({
        ...pdfInput,
        wordmarkDataUrl,
        batikAssets,
      });
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
  }, [isOpen, pdfInput]);

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

  const {
    proposal,
    details,
    totalPagu,
    rcPercentage,
    rcTable,
    position,
    imageDataUrl,
    signatories,
  } = pdfInput;

  const includeDetailRc = pdfInput.includeDetailRc !== false;
  const customRcItems = useMemo(
    () => pdfInput.customRcItems ?? details.customRcItems ?? [],
    [pdfInput.customRcItems, details.customRcItems]
  );
  const totalDetailDocs = KEMENPU_RC_ROWS.length + customRcItems.length;
  const detailSummaryCounts = useMemo(() => {
    let ada = 0;
    let kurang = 0;
    let sesuai = 0;
    KEMENPU_RC_ROWS.forEach((row) => {
      const f = getRcChecklistFlags(rcTable[row.key]);
      if (f.ada) ada += 1;
      if (f.kurang) kurang += 1;
      if (f.sesuai) sesuai += 1;
    });
    customRcItems.forEach((item) => {
      const f = getRcChecklistFlags(item);
      if (f.ada) ada += 1;
      if (f.kurang) kurang += 1;
      if (f.sesuai) sesuai += 1;
    });
    return { ada, kurang, sesuai, total: totalDetailDocs };
  }, [rcTable, customRcItems, totalDetailDocs]);

  if (!isOpen) return null;

  const signatureBlockNode = (
    <div className="border border-[#C7D3E8] border-t-2 border-t-[#061459] rounded-xl px-5 py-4 bg-white">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-900">
        {(
          [
            { key: 'm1', party: signatories?.mengesahkan },
            { key: 'm3', party: signatories?.mengesahkan3 },
          ] as const
        ).map(({ key, party }) => (
          <div
            key={key}
            className="flex flex-col items-center justify-between min-h-[100px]"
          >
            <div>
              <div className="h-4" />
              <div className="font-bold">Mengesahkan,</div>
              {party?.jabatan?.trim() && (
                <div className="text-[11px] text-slate-600 mt-0.5 max-w-[200px]">
                  {party.jabatan.trim()}
                </div>
              )}
            </div>
            <div className="pt-9">
              <div className="font-bold underline underline-offset-4">
                {party?.nama?.trim() || '( .............................. )'}
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center justify-between min-h-[100px]">
          <div>
            <div className="text-[11px] text-slate-600 h-4">
              {signatories?.tempatTanggal.trim()}
            </div>
            <div className="font-bold">Menyetujui,</div>
            {signatories?.menyetujui.jabatan.trim() && (
              <div className="text-[11px] text-slate-600 mt-0.5 max-w-[200px]">
                {signatories.menyetujui.jabatan.trim()}
              </div>
            )}
          </div>
          <div className="pt-9">
            <div className="font-bold underline underline-offset-4">
              {signatories?.menyetujui.nama.trim() ||
                '( .............................. )'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-[1px] flex flex-col print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profil-pdf-preview-title"
    >
      {/* Top Preview Toolbar */}
      <header className="bg-[#061459] text-white border-b-2 border-[#E89611] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#E89611] text-[#051044] flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2
              id="profil-pdf-preview-title"
              className="text-sm font-bold tracking-tight truncate"
            >
              Preview Cetak PDF · Profil Usulan ({proposal.kodeUsulan})
            </h2>
            <p className="text-[11px] text-amber-200/95 truncate">
              Format A4 Landscape ·{' '}
              {pdfPayload ? `${pdfPayload.pageCount} Halaman PDF` : 'Menyiapkan dokumen...'} ·{' '}
              {proposal.kabupatenKota}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center p-1 bg-[#040E42] border border-white/15 rounded-lg"
            role="group"
            aria-label="Mode Pratinjau Profil Usulan"
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

          {onToggleIncludeDetailRc && (
            <button
              type="button"
              onClick={() => onToggleIncludeDetailRc(!includeDetailRc)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                includeDetailRc
                  ? 'bg-emerald-700/90 hover:bg-emerald-700 text-white border-emerald-400/50'
                  : 'bg-white/10 hover:bg-white/15 text-indigo-100 border-white/15'
              }`}
              title="Sertakan halaman Detail Status Readiness Criteria (RC) ke dalam PDF"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Detail RC: {includeDetailRc ? 'Disertakan' : 'Tidak Disertakan'}</span>
            </button>
          )}

          {onEditSignatories && (
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
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              window.setTimeout(onPrintDirect, 120);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Cetak Printer</span>
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#051044] bg-[#E89611] hover:bg-amber-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup Preview Cetak PDF Profil Usulan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Preview Body */}
      <div
        className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-800/85"
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
              title="Pratinjau Dokumen PDF Profil Usulan"
              className="w-full flex-1 min-h-[600px] bg-white rounded-lg border border-slate-700 shadow-2xl"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div
              className="batik-pu-watermark text-slate-900 shadow-2xl rounded-sm border border-[#C7D3E8] w-full max-w-[1122px] overflow-hidden origin-top transition-transform"
              style={
                zoomPct !== 100
                  ? {
                      transform: `scale(${zoomPct / 100})`,
                      marginBottom: `${Math.max(0, (zoomPct - 100) * 6)}px`,
                    }
                  : undefined
              }
            >
              {/* Top Batik PU Ornamental Ribbon */}
              <div className="h-2.5 w-full batik-pu-strip border-b-2 border-[#E89611]" />

              <div className="p-6 sm:p-7 space-y-4">
              {/* Header KEMENPU */}
              <div className="bg-white border border-[#C7D3E8] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-stretch gap-3 min-w-0">
                  <div className="flex shrink-0 select-none" aria-hidden="true">
                    <div className="w-2 bg-[#061459]" />
                    <div className="w-2.5 bg-[#E89611]" />
                  </div>
                  <div className="min-w-0 py-0.5">
                    <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#061459] uppercase leading-snug">
                      {proposal.namaProgram}
                    </h3>
                    <div className="mt-0.5 text-xs sm:text-sm font-semibold text-[#476691] uppercase tracking-wide">
                      {proposal.kabupatenKota} ·{' '}
                      {details.provinsi ?? 'Nusa Tenggara Barat'} ({proposal.kodeUsulan} ·{' '}
                      {formatActiveYears(proposal.pagu)})
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0 select-none">
                  <img
                    src={PU_WORDMARK_SRC}
                    alt="Kementerian Pekerjaan Umum"
                    className="h-11 sm:h-12 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Row 1: Gambaran Umum | Urgensi Strategis | Lingkup Pekerjaan */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                <div className="lg:col-span-5 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                    <Target className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">Gambaran Umum</h4>
                  </div>
                  <div className="p-3.5">
                  <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
                    <li>
                      <strong className="text-slate-800">Latar belakang: </strong>
                      {details.latarBelakang}
                    </li>
                    <li>
                      <strong className="text-slate-800">Dasar penugasan: </strong>
                      {details.dasarPenugasan}
                    </li>
                  </ul>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                    <AlertTriangle className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Urgensi Strategis
                    </h4>
                  </div>
                  <div className="p-3.5">
                  <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
                    <li>
                      <strong className="text-slate-800">Dukungan Prioritas: </strong>
                      {proposal.prioritasNasional}
                    </li>
                    <li>
                      <strong className="text-slate-800">Manfaat kegiatan: </strong>
                      {details.manfaatKegiatan}
                    </li>
                  </ul>
                  </div>
                </div>

                <div className="lg:col-span-3 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                    <ListChecks className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Lingkup Pekerjaan
                    </h4>
                  </div>
                  <div className="p-3.5">
                  <ul className="space-y-1 text-[11px] text-slate-700 leading-relaxed">
                    {(details.lingkupPekerjaan ?? []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Square className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  </div>
                </div>
              </div>

              {/* Row 2: Kebutuhan Anggaran | Output & Outcome */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                    <Wallet className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Kebutuhan Anggaran
                    </h4>
                  </div>
                  <div className="p-3.5 text-[11px] text-slate-700 space-y-1">
                    <p>
                      Estimasi total kebutuhan anggaran sebesar{' '}
                      <strong className="font-mono text-slate-900">
                        Rp {formatNumberMiliar(totalPagu)} Miliar
                      </strong>{' '}
                      <span className="text-slate-500">
                        ({proposal.sumberDana} · {formatActiveYears(proposal.pagu)})
                      </span>
                    </p>
                    <div>
                      ❖ Fisik Rp{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumberMiliar(details.biayaFisikMiliar ?? 0)}
                      </strong>{' '}
                      Miliar
                    </div>
                    <div>
                      ❖ Manajemen Konstruksi/Supervisi Rp{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumberMiliar(details.biayaSupervisiMiliar ?? 0)}
                      </strong>{' '}
                      Miliar
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                    <PieChart className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Output &amp; Outcome
                    </h4>
                  </div>
                  <div className="p-3.5 grid grid-cols-2 gap-3 text-[11px] text-slate-700 leading-relaxed">
                    <div>
                      <div className="font-bold text-slate-900">Output</div>
                      <div>❖ {details.outputTambahan || '—'}</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Outcome</div>
                      <div>❖ {details.outcomeTambahan || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Gambaran Lokasi Kegiatan | Status Readiness Criteria (RC) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                      <MapPin className="w-4 h-4 text-[#E89611] shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Gambaran Lokasi Kegiatan
                      </h4>
                    </div>
                    <div className="p-3.5">
                    {imageDataUrl ? (
                      <div className="h-[220px] w-full rounded-lg border border-slate-200 overflow-hidden bg-white">
                        <img
                          src={imageDataUrl}
                          alt={`Lokasi ${proposal.namaProgram}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-[220px] w-full rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between text-xs text-slate-700">
                        <div>
                          <div className="text-[11px] font-bold text-[#0b3c7c] uppercase tracking-wide">
                            Titik Koordinat &amp; Lokasi Spasial Usulan
                          </div>
                          <div className="mt-2 font-mono text-sm font-bold text-slate-900">
                            Lat: {position.lat.toFixed(6)} &nbsp;|&nbsp; Lng:{' '}
                            {position.lng.toFixed(6)}
                          </div>
                          <div className="mt-2.5 space-y-1 text-[11px]">
                            <div>
                              <strong>Wilayah:</strong> {proposal.kecamatanKawasan},{' '}
                              {proposal.kabupatenKota}
                            </div>
                            <div>
                              <strong>Target:</strong>{' '}
                              {proposal.volumeTarget.toLocaleString('id-ID')}{' '}
                              {proposal.satuanTarget}
                            </div>
                            <div>
                              <strong>Penerima Manfaat:</strong>{' '}
                              {proposal.penerimaManfaatJiwa.toLocaleString('id-ID')} Jiwa · Radius{' '}
                              {proposal.serviceRadiusKm} km
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 italic">
                          Unggah gambar skema/peta pada Profil Usulan jika ingin menyematkan gambar
                          visual di dokumen PDF.
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="px-3.5 pb-3.5 text-[11px] text-slate-700 leading-relaxed">
                    ❖ {details.deskripsiLokasi}
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-[#E89611] shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Status <span className="italic">Readiness Criteria</span> (RC)
                      </h4>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-200">
                      Skor RC: {rcPercentage}%
                    </span>
                  </div>

                  <div className="p-3.5">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-[#C7D3E8] bg-[#EEF2FA] text-[#061459]">
                        <th
                          rowSpan={2}
                          className="py-1.5 px-2 text-center font-bold border-r border-slate-300 w-[37%]"
                        >
                          Dokumen
                        </th>
                        <th
                          colSpan={3}
                          className="py-1 px-1.5 text-center font-bold border-r border-slate-300 border-b border-slate-300"
                        >
                          Status
                        </th>
                        <th rowSpan={2} className="py-1.5 px-2 text-center font-bold w-[36%]">
                          Keterangan
                        </th>
                      </tr>
                      <tr className="border-b border-slate-300 bg-slate-50/50 text-[10px] text-slate-700">
                        <th className="py-1 px-1 text-center font-semibold border-r border-slate-300">
                          Ada
                        </th>
                        <th className="py-1 px-1 text-center font-semibold border-r border-slate-300">
                          Kurang
                        </th>
                        <th className="py-1 px-1 text-center font-semibold border-r border-slate-300">
                          Sesuai
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-slate-700">
                      {KEMENPU_RC_ROWS.map((row) => {
                        const entry = rcTable[row.key] ?? { status: '', keterangan: '' };
                        const flags = getRcChecklistFlags(entry);
                        const docLabel =
                          row.key === 'lainnya' && entry.customLabel?.trim()
                            ? entry.customLabel
                            : row.defaultLabel;
                        return (
                          <tr key={row.key}>
                            <td className="py-1.5 px-2 border-r border-slate-300">{docLabel}</td>
                            <td className="py-1.5 px-1 border-r border-slate-300 text-center font-bold text-emerald-700">
                              {flags.ada ? '✓' : ''}
                            </td>
                            <td className="py-1.5 px-1 border-r border-slate-300 text-center font-bold text-amber-700">
                              {flags.kurang ? '✓' : ''}
                            </td>
                            <td className="py-1.5 px-1 border-r border-slate-300 text-center font-bold text-blue-700">
                              {flags.sesuai ? '✓' : ''}
                            </td>
                            <td className="py-1.5 px-2">{entry.keterangan || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>

              {/* Fallback Signature Block on Halaman 1 only when Detail Status RC is excluded */}
              {!includeDetailRc && signatureBlockNode}

              {/* Footer */}
              <div className="pt-2 border-t border-[#C7D3E8] flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  SIMPRA BPBPK NTB · Profil Usulan Program ({proposal.kodeUsulan})
                </span>
                <span>
                  Dicetak: {printTimestamp} · Halaman 1 dari{' '}
                  {pdfPayload?.pageCount ?? (includeDetailRc ? 2 : 1)}
                </span>
              </div>
              </div>

              {/* Bottom Batik PU Ornamental Ribbon */}
              <div className="h-2 w-full batik-pu-strip border-t-2 border-[#E89611]" />
            </div>

            {/* HALAMAN 2+: DETAIL STATUS READINESS CRITERIA (RC) */}
            {includeDetailRc && (
              <div
                className="batik-pu-watermark text-slate-900 shadow-2xl rounded-sm border border-[#C7D3E8] w-full max-w-[1122px] overflow-hidden origin-top transition-transform"
                style={
                  zoomPct !== 100
                    ? {
                        transform: `scale(${zoomPct / 100})`,
                        marginBottom: `${Math.max(0, (zoomPct - 100) * 6)}px`,
                      }
                    : undefined
                }
              >
                <div className="h-2.5 w-full batik-pu-strip border-b-2 border-[#E89611]" />

                <div className="p-6 sm:p-7 space-y-4">
                  {/* Header Detail Status RC */}
                  <div className="bg-white border border-[#C7D3E8] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-stretch gap-3 min-w-0">
                      <div className="flex shrink-0 select-none" aria-hidden="true">
                        <div className="w-2 bg-[#061459]" />
                        <div className="w-2.5 bg-[#E89611]" />
                      </div>
                      <div className="min-w-0 py-0.5">
                        <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-[#061459] uppercase leading-snug">
                          Detail Status Readiness Criteria (RC) — {proposal.namaProgram}
                        </h3>
                        <div className="mt-0.5 text-xs font-semibold text-[#476691] uppercase tracking-wide">
                          {proposal.kodeUsulan} · {proposal.kabupatenKota} · Skor RC:{' '}
                          {rcPercentage}% · Total {detailSummaryCounts.total} Dokumen RC
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0 select-none">
                      <img
                        src={PU_WORDMARK_SRC}
                        alt="Kementerian Pekerjaan Umum"
                        className="h-11 sm:h-12 w-auto object-contain"
                      />
                    </div>
                  </div>

                  {/* Metadata Verifikasi RC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                      <div className="text-[11px] font-medium text-slate-500">
                        Status Verifikasi / Matriks
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-[#061459]">
                        {details.statusManual?.trim() || proposal.statusVerifikasi}
                      </div>
                    </div>

                    <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                      <div className="text-[11px] font-medium text-slate-500">
                        Pembahasan BPBPK NTB
                      </div>
                      <div className="mt-0.5 font-mono text-xs font-bold text-[#061459] tabular-nums">
                        {details.jumlahPembahasanBpbpk ?? 0} Kali Pembahasan
                      </div>
                    </div>

                    <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                      <div className="text-[11px] font-medium text-slate-500">
                        Kelengkapan Dokumen RC
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-slate-800 font-mono tabular-nums">
                        Ada {detailSummaryCounts.ada}/{detailSummaryCounts.total} · Sesuai{' '}
                        {detailSummaryCounts.sesuai}/{detailSummaryCounts.total} · Kurang{' '}
                        {detailSummaryCounts.kurang}/{detailSummaryCounts.total}
                      </div>
                    </div>

                    <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                      <div className="text-[11px] font-medium text-slate-500">
                        Tautan Berkas / Data RC
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-slate-700 truncate">
                        {details.linkDataRc?.trim() ? (
                          <span className="inline-flex items-center gap-1 text-blue-700">
                            <span className="truncate">{details.linkDataRc.trim()}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum diisi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabel Rincian Detail Status RC */}
                  <div className="bg-white border border-[#C7D3E8] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-[#E89611] shrink-0" />
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Rincian Lengkap Status <span className="italic">Readiness Criteria</span>{' '}
                          (RC)
                        </h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-200">
                        {detailSummaryCounts.total} Dokumen · Skor RC: {rcPercentage}%
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#EEF2FA] border-b border-[#C7D3E8] text-[#061459]">
                            <th className="py-2 px-2 text-center font-bold border-r border-[#C7D3E8] w-9">
                              No
                            </th>
                            <th className="py-2 px-2.5 text-left font-bold border-r border-[#C7D3E8] w-[22%]">
                              Dokumen Readiness Criteria
                            </th>
                            <th className="py-2 px-2.5 text-left font-bold border-r border-[#C7D3E8] w-[21%]">
                              Acuan / Standar Kelengkapan
                            </th>
                            <th className="py-2 px-1.5 text-center font-bold border-r border-[#C7D3E8] w-10">
                              Ada
                            </th>
                            <th className="py-2 px-1.5 text-center font-bold border-r border-[#C7D3E8] w-12">
                              Kurang
                            </th>
                            <th className="py-2 px-1.5 text-center font-bold border-r border-[#C7D3E8] w-12">
                              Sesuai
                            </th>
                            <th className="py-2 px-2 text-center font-bold border-r border-[#C7D3E8] w-[13%]">
                              Status Detail
                            </th>
                            <th className="py-2 px-2.5 text-left font-bold">
                              Keterangan &amp; Catatan Verifikasi Lengkap
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C7D3E8] text-slate-700">
                          {KEMENPU_RC_ROWS.map((row, idx) => {
                            const entry = rcTable[row.key] ?? { status: '', keterangan: '' };
                            const flags = getRcChecklistFlags(entry);
                            const statusMeta = getRcDetailStatusMeta(flags);
                            const docLabel =
                              row.key === 'lainnya' && entry.customLabel?.trim()
                                ? entry.customLabel
                                : row.defaultLabel;
                            return (
                              <tr key={`sheet-detail-${row.key}`}>
                                <td className="py-2 px-2 border-r border-[#C7D3E8] text-center font-mono font-semibold text-slate-500 align-top">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2.5 border-r border-[#C7D3E8] font-semibold text-[#061459] align-top">
                                  {docLabel}
                                </td>
                                <td className="py-2 px-2.5 border-r border-[#C7D3E8] text-[10px] text-slate-600 align-top">
                                  {row.placeholderNote}
                                </td>
                                <td className="py-2 px-1.5 border-r border-[#C7D3E8] text-center font-bold text-emerald-700 align-top">
                                  {flags.ada ? '✓' : '—'}
                                </td>
                                <td className="py-2 px-1.5 border-r border-[#C7D3E8] text-center font-bold text-amber-700 align-top">
                                  {flags.kurang ? '✓' : '—'}
                                </td>
                                <td className="py-2 px-1.5 border-r border-[#C7D3E8] text-center font-bold text-blue-700 align-top">
                                  {flags.sesuai ? '✓' : '—'}
                                </td>
                                <td className="py-2 px-2 border-r border-[#C7D3E8] text-center align-top">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap ${statusMeta.badgeClass}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 align-top whitespace-pre-wrap">
                                  {entry.keterangan || 'Belum ada keterangan tambahan.'}
                                </td>
                              </tr>
                            );
                          })}

                          {customRcItems.map((item, customIdx) => {
                            const flags = getRcChecklistFlags(item);
                            const statusMeta = getRcDetailStatusMeta(flags);
                            return (
                              <tr key={`sheet-detail-custom-${item.id}`} className="bg-amber-50/35">
                                <td className="py-2 px-2 border-r border-[#C7D3E8] text-center font-mono font-semibold text-[#061459] align-top">
                                  {KEMENPU_RC_ROWS.length + customIdx + 1}
                                </td>
                                <td className="py-2 px-2.5 border-r border-[#C7D3E8] align-top">
                                  <div className="font-semibold text-[#061459]">
                                    {item.namaDokumen}
                                  </div>
                                  <span className="inline-block mt-0.5 text-[9px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-1 py-0.5 rounded">
                                    Isian Tambahan
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 border-r border-[#C7D3E8] text-[10px] text-slate-600 align-top">
                                  {item.acuanStandar ||
                                    'Dokumen pendukung tambahan sesuai kebutuhan verifikasi.'}
                                </td>
                                <td className="py-2 px-1.5 border-r border-[#C7D3E8] text-center font-bold text-emerald-700 align-top">
                                  {flags.ada ? '✓' : '—'}
                                </td>
                                <td className="py-2 px-1.5 border-r border-[#C7D3E8] text-center font-bold text-amber-700 align-top">
                                  {flags.kurang ? '✓' : '—'}
                                </td>
                                <td className="py-2 px-1.5 border-r border-[#C7D3E8] text-center font-bold text-blue-700 align-top">
                                  {flags.sesuai ? '✓' : '—'}
                                </td>
                                <td className="py-2 px-2 border-r border-[#C7D3E8] text-center align-top">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap ${statusMeta.badgeClass}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 align-top whitespace-pre-wrap">
                                  {item.keterangan || 'Belum ada keterangan tambahan.'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 5 Indikator Inti & Catatan Teknis Balai */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                    <div className="lg:col-span-7 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                        <h4 className="text-xs font-bold text-white">
                          5 Indikator Inti Readiness Criteria (RC)
                        </h4>
                      </div>
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CORE_READINESS_PREVIEW_META.map((item) => {
                          const checked = Boolean(proposal.readiness[item.key]);
                          return (
                            <div
                              key={`sheet-core-${item.key}`}
                              className="flex items-start gap-2 p-2 rounded-lg bg-[#F8FAFE] border border-[#C7D3E8]"
                            >
                              {checked ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-slate-800">
                                  {item.label}
                                </div>
                                <div className="text-[10px] text-slate-500">{item.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-white border border-[#C7D3E8] rounded-xl overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-[#061459] text-white border-b-2 border-[#E89611]">
                        <h4 className="text-xs font-bold text-white">
                          Catatan Teknis &amp; Tindak Lanjut Verifikasi Balai
                        </h4>
                      </div>
                      <div className="p-3.5 text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {proposal.catatanTeknis?.trim() ||
                          'Belum ada catatan teknis tambahan untuk usulan ini.'}
                      </div>
                    </div>
                  </div>

                  {/* Pengesahan di Bagian Bawah Detail Status RC (di bawah 5 Indikator Inti RC) */}
                  {signatureBlockNode}

                  {/* Footer Halaman 2 */}
                  <div className="pt-2 border-t border-[#C7D3E8] flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      SIMPRA BPBPK NTB · Detail Status Readiness Criteria (RC) (
                      {proposal.kodeUsulan})
                    </span>
                    <span>
                      Dicetak: {printTimestamp} · Halaman 2 dari {pdfPayload?.pageCount ?? 2}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full batik-pu-strip border-t-2 border-[#E89611]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
