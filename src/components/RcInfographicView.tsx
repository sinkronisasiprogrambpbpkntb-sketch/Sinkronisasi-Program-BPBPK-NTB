import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Download,
  Eye,
  MapPin,
  PenLine,
  Printer,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  formatRpMiliar,
  getReadinessScore,
  getTotalPaguUsulan,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import { SektorCiptaKarya, SumberDana, UsulanProgram } from '../types/ciptaKarya';
import {
  exportRcInfographicPdf,
  PdfExportContext,
  PdfSignatoriesConfig,
  RcPdfLayoutMode,
} from '../utils/exportRcInfographicPdf';
import {
  loadPuBatikAssets,
  loadPuLogoDataUrl,
  PU_LOGO_SRC,
} from '../utils/puLogoAsset';
import { RcInfographicPreviewModal } from './RcInfographicPreviewModal';
import { JabatanSelectField } from './JabatanSelectField';
import {
  StatusChecklistFilter,
  StatusFilterOption,
} from './StatusChecklistFilter';

interface RcInfographicViewProps {
  proposals: UsulanProgram[];
  yearFilterLabel: string;
  sectorFilterLabel?: string;
  fundingOptions?: StatusFilterOption[];
  totalBeforeFundingCount?: number;
  selectedFundingSources?: string[] | null;
  onChangeFundingSources?: (next: string[] | null) => void;
  onPreviewProposal: (id: string) => void;
  onFocusOnMap?: (id: string) => void;
  onPdfExported?: (fileName: string) => void;
}

type RcTierFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
type SortOrder = 'desc' | 'asc';

interface RankedProposalItem {
  proposal: UsulanProgram;
  rcPercentage: number;
  rcCompleted: number;
  rcTotal: number;
  isManualScore: boolean;
  totalPagu: number;
  tier: 'HIGH' | 'MEDIUM' | 'LOW';
  tierLabel: string;
  statusDisplay: string;
}

function getTierMeta(pct: number): {
  tier: 'HIGH' | 'MEDIUM' | 'LOW';
  tierLabel: string;
  barColor: string;
  textColor: string;
} {
  if (pct >= 80) {
    return {
      tier: 'HIGH',
      tierLabel: 'Siap (≥80%)',
      barColor: '#059669',
      textColor: 'text-emerald-700',
    };
  }
  if (pct >= 50) {
    return {
      tier: 'MEDIUM',
      tierLabel: 'Proses (50–79%)',
      barColor: '#2563eb',
      textColor: 'text-blue-700',
    };
  }
  return {
    tier: 'LOW',
    tierLabel: 'Perlu Lengkapi (<50%)',
    barColor: '#d97706',
    textColor: 'text-amber-700',
  };
}

const PDF_SIGNATORIES_STORAGE_KEY = 'simpra_ntb_rc_pdf_signatories_v1';

function getDefaultTempatTanggal(): string {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return `Mataram, ${formatted}`;
}

function createEmptySignatories(): PdfSignatoriesConfig {
  return {
    tempatTanggal: getDefaultTempatTanggal(),
    mengesahkan: { jabatan: '', nama: '' },
    mengesahkan2: { jabatan: '', nama: '' },
    mengesahkan3: { jabatan: '', nama: '' },
    menyetujui: { jabatan: '', nama: '' },
  };
}

function loadInitialSignatories(): PdfSignatoriesConfig {
  const fallback = createEmptySignatories();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PDF_SIGNATORIES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PdfSignatoriesConfig>;
    return {
      tempatTanggal:
        typeof parsed.tempatTanggal === 'string'
          ? parsed.tempatTanggal
          : fallback.tempatTanggal,
      mengesahkan: {
        jabatan: parsed.mengesahkan?.jabatan ?? '',
        nama: parsed.mengesahkan?.nama ?? '',
      },
      mengesahkan2: {
        jabatan: parsed.mengesahkan2?.jabatan ?? '',
        nama: parsed.mengesahkan2?.nama ?? '',
      },
      mengesahkan3: {
        jabatan: parsed.mengesahkan3?.jabatan ?? '',
        nama: parsed.mengesahkan3?.nama ?? '',
      },
      menyetujui: {
        jabatan: parsed.menyetujui?.jabatan ?? '',
        nama: parsed.menyetujui?.nama ?? '',
      },
    };
  } catch {
    return fallback;
  }
}

const ALL_SEKTORS: SektorCiptaKarya[] = [
  SektorCiptaKarya.AIR_MINUM,
  SektorCiptaKarya.SANITASI,
  SektorCiptaKarya.KAWASAN_STRATEGIS,
  SektorCiptaKarya.BINA_PENATAAN_BANGUNAN,
];

const NON_BPB_SEKTORS: SektorCiptaKarya[] = [
  SektorCiptaKarya.AIR_MINUM,
  SektorCiptaKarya.SANITASI,
  SektorCiptaKarya.KAWASAN_STRATEGIS,
];

export const RcInfographicView: React.FC<RcInfographicViewProps> = ({
  proposals,
  yearFilterLabel,
  sectorFilterLabel = 'Semua Sektor Teknis',
  fundingOptions,
  totalBeforeFundingCount,
  selectedFundingSources,
  onChangeFundingSources,
  onPreviewProposal,
  onFocusOnMap,
  onPdfExported,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tierFilter, setTierFilter] = useState<RcTierFilter>('ALL');
  const [selectedStatuses, setSelectedStatuses] = useState<string[] | null>(null);
  const [localSelectedFunding, setLocalSelectedFunding] = useState<string[] | null>(null);
  const [selectedSectors, setSelectedSectors] =
    useState<SektorCiptaKarya[]>(ALL_SEKTORS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [signatories, setSignatories] = useState<PdfSignatoriesConfig>(
    loadInitialSignatories
  );
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);

  useEffect(() => {
    void loadPuLogoDataUrl();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PDF_SIGNATORIES_STORAGE_KEY,
        JSON.stringify(signatories)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [signatories]);

  const effectiveFundingChecklistOptions = useMemo<StatusFilterOption[]>(() => {
    if (fundingOptions) return fundingOptions;
    const countMap = new Map<string, number>();
    for (const sd of Object.values(SumberDana)) {
      countMap.set(sd, 0);
    }
    for (const p of proposals) {
      countMap.set(p.sumberDana, (countMap.get(p.sumberDana) ?? 0) + 1);
    }
    return Array.from(countMap.entries()).map(([label, count]) => ({
      value: label,
      label,
      count,
    }));
  }, [fundingOptions, proposals]);

  const activeFundingSelection =
    onChangeFundingSources !== undefined
      ? (selectedFundingSources ?? null)
      : localSelectedFunding;

  const handleFundingChange =
    onChangeFundingSources ?? setLocalSelectedFunding;

  const fundingScopedProposals = useMemo(() => {
    if (onChangeFundingSources !== undefined || localSelectedFunding === null) {
      return proposals;
    }
    if (localSelectedFunding.length === 0) return [];
    const allowed = new Set(localSelectedFunding);
    return proposals.filter((p) => allowed.has(p.sumberDana));
  }, [proposals, onChangeFundingSources, localSelectedFunding]);

  const availableInputSectors = useMemo(
    () => ALL_SEKTORS.filter((sek) => fundingScopedProposals.some((p) => p.sektor === sek)),
    [fundingScopedProposals]
  );

  const sectorScopedProposals = useMemo(() => {
    if (availableInputSectors.length <= 1) return fundingScopedProposals;
    return fundingScopedProposals.filter((p) => selectedSectors.includes(p.sektor));
  }, [fundingScopedProposals, availableInputSectors.length, selectedSectors]);

  const allRanked = useMemo<RankedProposalItem[]>(() => {
    const items = sectorScopedProposals.map((p) => {
      const score = getReadinessScore(p.readiness, p.skorRc);
      const tierMeta = getTierMeta(score.percentage);
      const totalPagu = getTotalPaguUsulan(p.pagu);
      const statusDisplay = p.templateDetails?.statusManual?.trim() || 'Belum diisi status';

      return {
        proposal: p,
        rcPercentage: score.percentage,
        rcCompleted: score.completed,
        rcTotal: score.total,
        isManualScore: typeof p.skorRc === 'number' && !Number.isNaN(p.skorRc),
        totalPagu,
        tier: tierMeta.tier,
        tierLabel: tierMeta.tierLabel,
        statusDisplay,
      };
    });

    items.sort((a, b) => {
      if (b.rcPercentage !== a.rcPercentage) {
        return sortOrder === 'desc'
          ? b.rcPercentage - a.rcPercentage
          : a.rcPercentage - b.rcPercentage;
      }
      if (b.totalPagu !== a.totalPagu) {
        return b.totalPagu - a.totalPagu;
      }
      return a.proposal.kodeUsulan.localeCompare(b.proposal.kodeUsulan);
    });

    return items;
  }, [sectorScopedProposals, sortOrder]);

  const statusChecklistOptions = useMemo<StatusFilterOption[]>(() => {
    const manualMap = new Map<string, number>();
    let emptyManualCount = 0;
    for (const item of allRanked) {
      const m = item.proposal.templateDetails?.statusManual?.trim() ?? '';
      if (m) {
        manualMap.set(m, (manualMap.get(m) ?? 0) + 1);
      } else {
        emptyManualCount += 1;
      }
    }

    const opts: StatusFilterOption[] = Array.from(manualMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'id-ID'))
      .map(([label, count]) => ({
        value: `manual:${label}`,
        label,
        count,
      }));

    if (emptyManualCount > 0) {
      opts.push({
        value: 'manual:__EMPTY__',
        label: 'Belum Diisi Status',
        count: emptyManualCount,
      });
    }

    return opts;
  }, [allRanked]);

  const effectiveSelectedStatuses = useMemo(() => {
    if (selectedStatuses === null) return null;
    if (selectedStatuses.length === 0) return [];
    const validKeys = new Set(statusChecklistOptions.map((o) => o.value));
    const kept = selectedStatuses.filter((k) => validKeys.has(k));
    if (kept.length === 0) return null;
    if (kept.length === statusChecklistOptions.length) return null;
    return kept;
  }, [selectedStatuses, statusChecklistOptions]);

  const statusScoped = useMemo(() => {
    if (effectiveSelectedStatuses === null) return allRanked;
    if (effectiveSelectedStatuses.length === 0) return [];
    const allowed = new Set(effectiveSelectedStatuses);
    return allRanked.filter((item) => {
      const m = item.proposal.templateDetails?.statusManual?.trim() ?? '';
      const key = m ? `manual:${m}` : 'manual:__EMPTY__';
      return allowed.has(key);
    });
  }, [allRanked, effectiveSelectedStatuses]);

  const filteredRanked = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return statusScoped.filter((item) => {
      if (tierFilter !== 'ALL' && item.tier !== tierFilter) return false;
      if (!q) return true;
      const p = item.proposal;
      return (
        p.namaProgram.toLowerCase().includes(q) ||
        p.kodeUsulan.toLowerCase().includes(q) ||
        p.kabupatenKota.toLowerCase().includes(q) ||
        SEKTOR_SHORT_LABELS[p.sektor].toLowerCase().includes(q) ||
        (p.templateDetails?.statusManual ?? '').toLowerCase().includes(q)
      );
    });
  }, [statusScoped, tierFilter, searchQuery]);

  const summaryStats = useMemo(() => {
    if (statusScoped.length === 0) {
      return {
        highest: null as RankedProposalItem | null,
        lowest: null as RankedProposalItem | null,
        averagePct: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalCount: 0,
      };
    }

    const sortedDesc = [...statusScoped].sort((a, b) =>
      b.rcPercentage !== a.rcPercentage
        ? b.rcPercentage - a.rcPercentage
        : b.totalPagu - a.totalPagu
    );

    const highCount = statusScoped.filter((x) => x.tier === 'HIGH').length;
    const mediumCount = statusScoped.filter((x) => x.tier === 'MEDIUM').length;
    const lowCount = statusScoped.filter((x) => x.tier === 'LOW').length;
    const sumPct = statusScoped.reduce((acc, x) => acc + x.rcPercentage, 0);

    return {
      highest: sortedDesc[0],
      lowest: sortedDesc[sortedDesc.length - 1],
      averagePct: Math.round(sumPct / statusScoped.length),
      highCount,
      mediumCount,
      lowCount,
      totalCount: statusScoped.length,
    };
  }, [statusScoped]);

  const sectorAverages = useMemo(() => {
    const activeSectorList =
      availableInputSectors.length <= 1
        ? ALL_SEKTORS
        : ALL_SEKTORS.filter((sek) => selectedSectors.includes(sek));
    const list = activeSectorList.map((sek) => {
      const items = statusScoped.filter((x) => x.proposal.sektor === sek);
      const count = items.length;
      const avgPct =
        count > 0
          ? Math.round(items.reduce((acc, x) => acc + x.rcPercentage, 0) / count)
          : 0;
      const maxPct = count > 0 ? Math.max(...items.map((x) => x.rcPercentage)) : 0;
      const minPct = count > 0 ? Math.min(...items.map((x) => x.rcPercentage)) : 0;
      const totalPagu = items.reduce((acc, x) => acc + x.totalPagu, 0);
      return {
        sektor: sek,
        shortLabel: SEKTOR_SHORT_LABELS[sek],
        count,
        avgPct,
        maxPct,
        minPct,
        totalPagu: Number(totalPagu.toFixed(1)),
      };
    });

    return list.sort((a, b) =>
      sortOrder === 'desc' ? b.avgPct - a.avgPct : a.avgPct - b.avgPct
    );
  }, [statusScoped, sortOrder, availableInputSectors.length, selectedSectors]);

  const regionalAverages = useMemo(() => {
    const map: Record<
      string,
      { kabupaten: string; count: number; sumPct: number; totalPagu: number }
    > = {};

    for (const item of statusScoped) {
      const kab = item.proposal.kabupatenKota;
      if (!map[kab]) {
        map[kab] = { kabupaten: kab, count: 0, sumPct: 0, totalPagu: 0 };
      }
      map[kab].count += 1;
      map[kab].sumPct += item.rcPercentage;
      map[kab].totalPagu += item.totalPagu;
    }

    return Object.values(map)
      .map((entry) => ({
        kabupaten: entry.kabupaten,
        count: entry.count,
        avgPct: Math.round(entry.sumPct / Math.max(1, entry.count)),
        totalPagu: Number(entry.totalPagu.toFixed(1)),
      }))
      .sort((a, b) =>
        sortOrder === 'desc' ? b.avgPct - a.avgPct : a.avgPct - b.avgPct
      );
  }, [statusScoped, sortOrder]);

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

  const tierFilterLabel =
    tierFilter === 'ALL'
      ? 'Semua Tingkat Kesiapan'
      : tierFilter === 'HIGH'
        ? 'Siap (>=80%)'
        : tierFilter === 'MEDIUM'
          ? 'Proses (50-79%)'
          : 'Kurang (<50%)';

  const statusFilterLabel = useMemo(() => {
    if (effectiveSelectedStatuses === null) return 'Semua Status Usulan';
    if (effectiveSelectedStatuses.length === 0) return 'Tidak Ada Status Dipilih';
    const labels = effectiveSelectedStatuses.map((key) =>
      key === 'manual:__EMPTY__'
        ? 'Belum Diisi Status'
        : key.startsWith('manual:')
          ? key.slice('manual:'.length)
          : key
    );
    if (labels.length <= 3) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} (+${labels.length - 2} status lainnya)`;
  }, [effectiveSelectedStatuses]);

  const fundingFilterLabel = useMemo(() => {
    if (activeFundingSelection === null) return 'Semua Sumber Pendanaan';
    if (activeFundingSelection.length === 0) return 'Tidak Ada Sumber Pendanaan Dipilih';
    if (activeFundingSelection.length <= 3) return activeFundingSelection.join(', ');
    return `${activeFundingSelection.slice(0, 2).join(', ')} (+${activeFundingSelection.length - 2} lainnya)`;
  }, [activeFundingSelection]);

  const isOnlyNonBpbPreset =
    selectedSectors.length === NON_BPB_SEKTORS.length &&
    NON_BPB_SEKTORS.every((s) => selectedSectors.includes(s));

  const isAllSectorsSelected = selectedSectors.length === ALL_SEKTORS.length;

  const effectiveSectorFilterLabel = useMemo(() => {
    if (availableInputSectors.length <= 1 || isAllSectorsSelected) {
      return sectorFilterLabel;
    }
    return selectedSectors.map((s) => SEKTOR_SHORT_LABELS[s]).join(', ');
  }, [
    availableInputSectors.length,
    isAllSectorsSelected,
    sectorFilterLabel,
    selectedSectors,
  ]);

  const mengesahkanCount = useMemo<2 | 3>(() => {
    const itemsToInspect =
      filteredRanked.length > 0
        ? filteredRanked
        : statusScoped.length > 0
          ? statusScoped
          : allRanked;

    if (itemsToInspect.length > 0) {
      const hasBpb = itemsToInspect.some(
        (item) => item.proposal.sektor === SektorCiptaKarya.BINA_PENATAAN_BANGUNAN
      );
      return hasBpb ? 3 : 2;
    }

    return selectedSectors.includes(SektorCiptaKarya.BINA_PENATAAN_BANGUNAN)
      ? 3
      : 2;
  }, [filteredRanked, statusScoped, allRanked, selectedSectors]);

  const toggleSectorSelection = (sek: SektorCiptaKarya) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sek)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== sek);
      }
      return ALL_SEKTORS.filter((item) => item === sek || prev.includes(item));
    });
  };

  const pdfContext = useMemo<PdfExportContext>(
    () => ({
      yearFilterLabel,
      sectorFilterLabel: effectiveSectorFilterLabel,
      fundingFilterLabel,
      sortOrder,
      tierFilterLabel,
      statusFilterLabel,
      searchQuery,
      signatories,
      mengesahkanCount,
    }),
    [
      yearFilterLabel,
      effectiveSectorFilterLabel,
      fundingFilterLabel,
      sortOrder,
      tierFilterLabel,
      statusFilterLabel,
      searchQuery,
      signatories,
      mengesahkanCount,
    ]
  );

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
      />
    </div>
  );
};
