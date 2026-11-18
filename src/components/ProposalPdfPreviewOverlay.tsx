import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
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
  pdfInput: ProposalProfilePdfInput;
}

type PreviewMode = 'sheet' | 'pdf';

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

  if (!isOpen) return null;

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
          <div className="flex justify-center">
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

              {/* Signature Block: 2 Kolom Mengesahkan & 1 Kolom Menyetujui */}
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

              {/* Footer */}
              <div className="pt-2 border-t border-[#C7D3E8] flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  SIMPRA BPBPK NTB · Profil Usulan Program ({proposal.kodeUsulan})
                </span>
                <span>Dicetak: {printTimestamp} · Halaman 1 dari 1</span>
              </div>
              </div>

              {/* Bottom Batik PU Ornamental Ribbon */}
              <div className="h-2 w-full batik-pu-strip border-t-2 border-[#E89611]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
