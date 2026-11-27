import {
  getReadinessScore,
  getTotalPaguUsulan,
  isActiveInYear,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import { SektorCiptaKarya, SumberDana, UsulanProgram } from '../types/ciptaKarya';
import {
  PdfExportContext,
  PdfRankedProposalItem,
  PdfRegionalAverage,
  PdfSectorAverage,
  PdfSignatoriesConfig,
  PdfSummaryStats,
} from './exportRcInfographicPdf';
import { StatusFilterOption } from '../components/StatusChecklistFilter';

export type RcTierFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SortOrder = 'desc' | 'asc';
export type YearFilterValue = 'ALL' | '2027' | '2028' | '2029' | '2030';

export interface RankedProposalItem extends PdfRankedProposalItem {
  statusDisplay: string;
}

export const ALL_SEKTORS: SektorCiptaKarya[] = [
  SektorCiptaKarya.AIR_MINUM,
  SektorCiptaKarya.SANITASI,
  SektorCiptaKarya.KAWASAN_STRATEGIS,
  SektorCiptaKarya.BINA_PENATAAN_BANGUNAN,
];

export const NON_BPB_SEKTORS: SektorCiptaKarya[] = [
  SektorCiptaKarya.AIR_MINUM,
  SektorCiptaKarya.SANITASI,
  SektorCiptaKarya.KAWASAN_STRATEGIS,
];

export const SEKTOR_ENUM_TO_CODE: Record<SektorCiptaKarya, string> = {
  [SektorCiptaKarya.AIR_MINUM]: 'SPAM',
  [SektorCiptaKarya.SANITASI]: 'SAN',
  [SektorCiptaKarya.KAWASAN_STRATEGIS]: 'PKS',
  [SektorCiptaKarya.BINA_PENATAAN_BANGUNAN]: 'BPB',
};

export const SEKTOR_CODE_TO_ENUM: Record<string, SektorCiptaKarya> = {
  SPAM: SektorCiptaKarya.AIR_MINUM,
  SAN: SektorCiptaKarya.SANITASI,
  PKS: SektorCiptaKarya.KAWASAN_STRATEGIS,
  BPB: SektorCiptaKarya.BINA_PENATAAN_BANGUNAN,
};

export function getTierMeta(pct: number): {
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

export const PDF_SIGNATORIES_STORAGE_KEY = 'simpra_ntb_rc_pdf_signatories_v1';

function getDefaultTempatTanggal(): string {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return `Mataram, ${formatted}`;
}

export function createEmptySignatories(): PdfSignatoriesConfig {
  return {
    tempatTanggal: getDefaultTempatTanggal(),
    mengesahkan: { jabatan: '', nama: '' },
    mengesahkan2: { jabatan: '', nama: '' },
    mengesahkan3: { jabatan: '', nama: '' },
    menyetujui: { jabatan: '', nama: '' },
  };
}

export function loadInitialRcSignatories(): PdfSignatoriesConfig {
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

export function saveRcSignatories(signatories: PdfSignatoriesConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PDF_SIGNATORIES_STORAGE_KEY,
      JSON.stringify(signatories)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export interface BuildRcInfographicParams {
  proposals: UsulanProgram[];
  yearFilter?: YearFilterValue;
  yearFilterLabel?: string;
  sektorFilter?: 'ALL' | SektorCiptaKarya;
  sectorFilterLabel?: string;
  selectedFundingSources?: string[] | null;
  selectedSectors?: SektorCiptaKarya[];
  selectedStatuses?: string[] | null;
  tierFilter?: RcTierFilter;
  sortOrder?: SortOrder;
  searchQuery?: string;
  signatories?: PdfSignatoriesConfig;
}

export interface ComputedRcInfographicData {
  fundingChecklistOptions: StatusFilterOption[];
  fundingScopedProposals: UsulanProgram[];
  availableInputSectors: SektorCiptaKarya[];
  sectorScopedProposals: UsulanProgram[];
  allRanked: RankedProposalItem[];
  statusChecklistOptions: StatusFilterOption[];
  effectiveSelectedStatuses: string[] | null;
  statusScoped: RankedProposalItem[];
  filteredRanked: RankedProposalItem[];
  summaryStats: PdfSummaryStats;
  sectorAverages: PdfSectorAverage[];
  regionalAverages: PdfRegionalAverage[];
  tierFilterLabel: string;
  statusFilterLabel: string;
  fundingFilterLabel: string;
  effectiveSectorFilterLabel: string;
  mengesahkanCount: 2 | 3;
  pdfContext: PdfExportContext;
}

export function buildRcInfographicData({
  proposals,
  yearFilter = 'ALL',
  yearFilterLabel,
  sektorFilter = 'ALL',
  sectorFilterLabel,
  selectedFundingSources = null,
  selectedSectors = ALL_SEKTORS,
  selectedStatuses = null,
  tierFilter = 'ALL',
  sortOrder = 'desc',
  searchQuery = '',
  signatories,
}: BuildRcInfographicParams): ComputedRcInfographicData {
  const preFiltered = proposals.filter((p) => {
    if (sektorFilter !== 'ALL' && p.sektor !== sektorFilter) return false;
    if (!isActiveInYear(p, yearFilter)) return false;
    return true;
  });

  const countMap = new Map<string, number>();
  for (const sd of Object.values(SumberDana)) {
    countMap.set(sd, 0);
  }
  for (const p of preFiltered) {
    countMap.set(p.sumberDana, (countMap.get(p.sumberDana) ?? 0) + 1);
  }
  const fundingChecklistOptions: StatusFilterOption[] = Array.from(
    countMap.entries()
  ).map(([label, count]) => ({
    value: label,
    label,
    count,
  }));

  const fundingScopedProposals = (() => {
    if (selectedFundingSources === null) return preFiltered;
    if (selectedFundingSources.length === 0) return [];
    const allowed = new Set(selectedFundingSources);
    return preFiltered.filter((p) => allowed.has(p.sumberDana));
  })();

  const availableInputSectors = ALL_SEKTORS.filter((sek) =>
    fundingScopedProposals.some((p) => p.sektor === sek)
  );

  const sectorScopedProposals =
    availableInputSectors.length <= 1
      ? fundingScopedProposals
      : fundingScopedProposals.filter((p) => selectedSectors.includes(p.sektor));

  const allRanked: RankedProposalItem[] = sectorScopedProposals.map((p) => {
    const score = getReadinessScore(p.readiness, p.skorRc);
    const tierMeta = getTierMeta(score.percentage);
    const totalPagu = getTotalPaguUsulan(p.pagu);
    const statusDisplay =
      p.templateDetails?.statusManual?.trim() || 'Belum diisi status';

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

  allRanked.sort((a, b) => {
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
  const statusChecklistOptions: StatusFilterOption[] = Array.from(
    manualMap.entries()
  )
    .sort(([a], [b]) => a.localeCompare(b, 'id-ID'))
    .map(([label, count]) => ({
      value: `manual:${label}`,
      label,
      count,
    }));

  if (emptyManualCount > 0) {
    statusChecklistOptions.push({
      value: 'manual:__EMPTY__',
      label: 'Belum Diisi Status',
      count: emptyManualCount,
    });
  }

  const effectiveSelectedStatuses = (() => {
    if (selectedStatuses === null) return null;
    if (selectedStatuses.length === 0) return [];
    const validKeys = new Set(statusChecklistOptions.map((o) => o.value));
    const kept = selectedStatuses.filter((k) => validKeys.has(k));
    if (kept.length === 0) return null;
    if (kept.length === statusChecklistOptions.length) return null;
    return kept;
  })();

  const statusScoped = (() => {
    if (effectiveSelectedStatuses === null) return allRanked;
    if (effectiveSelectedStatuses.length === 0) return [];
    const allowed = new Set(effectiveSelectedStatuses);
    return allRanked.filter((item) => {
      const m = item.proposal.templateDetails?.statusManual?.trim() ?? '';
      const key = m ? `manual:${m}` : 'manual:__EMPTY__';
      return allowed.has(key);
    });
  })();

  const q = searchQuery.trim().toLowerCase();
  const filteredRanked = statusScoped.filter((item) => {
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

  const summaryStats: PdfSummaryStats = (() => {
    if (statusScoped.length === 0) {
      return {
        highest: null,
        lowest: null,
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
  })();

  const activeSectorList =
    availableInputSectors.length <= 1
      ? ALL_SEKTORS
      : ALL_SEKTORS.filter((sek) => selectedSectors.includes(sek));

  const sectorAverages: PdfSectorAverage[] = activeSectorList
    .map((sek) => {
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
    })
    .sort((a, b) =>
      sortOrder === 'desc' ? b.avgPct - a.avgPct : a.avgPct - b.avgPct
    );

  const regionalMap: Record<
    string,
    { kabupaten: string; count: number; sumPct: number; totalPagu: number }
  > = {};
  for (const item of statusScoped) {
    const kab = item.proposal.kabupatenKota;
    if (!regionalMap[kab]) {
      regionalMap[kab] = { kabupaten: kab, count: 0, sumPct: 0, totalPagu: 0 };
    }
    regionalMap[kab].count += 1;
    regionalMap[kab].sumPct += item.rcPercentage;
    regionalMap[kab].totalPagu += item.totalPagu;
  }
  const regionalAverages: PdfRegionalAverage[] = Object.values(regionalMap)
    .map((entry) => ({
      kabupaten: entry.kabupaten,
      count: entry.count,
      avgPct: Math.round(entry.sumPct / Math.max(1, entry.count)),
      totalPagu: Number(entry.totalPagu.toFixed(1)),
    }))
    .sort((a, b) =>
      sortOrder === 'desc' ? b.avgPct - a.avgPct : a.avgPct - b.avgPct
    );

  const tierFilterLabel =
    tierFilter === 'ALL'
      ? 'Semua Tingkat Kesiapan'
      : tierFilter === 'HIGH'
        ? 'Siap (>=80%)'
        : tierFilter === 'MEDIUM'
          ? 'Proses (50-79%)'
          : 'Kurang (<50%)';

  const statusFilterLabel = (() => {
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
  })();

  const fundingFilterLabel = (() => {
    if (selectedFundingSources === null) return 'Semua Sumber Pendanaan';
    if (selectedFundingSources.length === 0) {
      return 'Tidak Ada Sumber Pendanaan Dipilih';
    }
    if (selectedFundingSources.length <= 3) {
      return selectedFundingSources.join(', ');
    }
    return `${selectedFundingSources.slice(0, 2).join(', ')} (+${selectedFundingSources.length - 2} lainnya)`;
  })();

  const resolvedYearLabel =
    yearFilterLabel ?? (yearFilter === 'ALL' ? 'TA 2027–2030' : `TA ${yearFilter}`);
  const baseSectorLabel =
    sectorFilterLabel ??
    (sektorFilter === 'ALL' ? 'Semua Sektor Teknis (4 Bidang)' : sektorFilter);
  const isAllSectorsSelected = selectedSectors.length === ALL_SEKTORS.length;
  const effectiveSectorFilterLabel =
    availableInputSectors.length <= 1 || isAllSectorsSelected
      ? baseSectorLabel
      : selectedSectors.map((s) => SEKTOR_SHORT_LABELS[s]).join(', ');

  const mengesahkanCount: 2 | 3 = (() => {
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
  })();

  const pdfContext: PdfExportContext = {
    yearFilterLabel: resolvedYearLabel,
    sectorFilterLabel: effectiveSectorFilterLabel,
    fundingFilterLabel,
    sortOrder,
    tierFilterLabel,
    statusFilterLabel,
    searchQuery,
    signatories: signatories ?? loadInitialRcSignatories(),
    mengesahkanCount,
  };

  return {
    fundingChecklistOptions,
    fundingScopedProposals,
    availableInputSectors,
    sectorScopedProposals,
    allRanked,
    statusChecklistOptions,
    effectiveSelectedStatuses,
    statusScoped,
    filteredRanked,
    summaryStats,
    sectorAverages,
    regionalAverages,
    tierFilterLabel,
    statusFilterLabel,
    fundingFilterLabel,
    effectiveSectorFilterLabel,
    mengesahkanCount,
    pdfContext,
  };
}
