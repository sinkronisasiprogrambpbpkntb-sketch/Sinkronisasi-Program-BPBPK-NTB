import React, { useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Download,
  Eye,
  MapPin,
  Printer,
  Search,
} from 'lucide-react';
import {
  formatRpMiliar,
  getReadinessScore,
  getTotalPaguUsulan,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import { SektorCiptaKarya, UsulanProgram } from '../types/ciptaKarya';
import { exportRcInfographicPdf } from '../utils/exportRcInfographicPdf';

interface RcInfographicViewProps {
  proposals: UsulanProgram[];
  yearFilterLabel: string;
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

export const RcInfographicView: React.FC<RcInfographicViewProps> = ({
  proposals,
  yearFilterLabel,
  onPreviewProposal,
  onFocusOnMap,
  onPdfExported,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tierFilter, setTierFilter] = useState<RcTierFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allRanked = useMemo<RankedProposalItem[]>(() => {
    const items = proposals.map((p) => {
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
  }, [proposals, sortOrder]);

  const statusOptions = useMemo(() => {
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

    const manualOptions = Array.from(manualMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'id-ID'))
      .map(([label, count]) => ({
        value: `manual:${label}`,
        label,
        count,
      }));

    return {
      manualOptions,
      emptyManualCount,
    };
  }, [allRanked]);

  const effectiveStatusFilter = useMemo(() => {
    if (statusFilter === 'ALL') return 'ALL';
    if (statusFilter === 'manual:__EMPTY__') {
      return statusOptions.emptyManualCount > 0 ? statusFilter : 'ALL';
    }
    if (statusFilter.startsWith('manual:')) {
      return statusOptions.manualOptions.some((o) => o.value === statusFilter)
        ? statusFilter
        : 'ALL';
    }
    return 'ALL';
  }, [statusFilter, statusOptions]);

  const statusScoped = useMemo(() => {
    if (effectiveStatusFilter === 'ALL') return allRanked;
    if (effectiveStatusFilter === 'manual:__EMPTY__') {
      return allRanked.filter(
        (item) => !(item.proposal.templateDetails?.statusManual?.trim() ?? '')
      );
    }
    if (effectiveStatusFilter.startsWith('manual:')) {
      const target = effectiveStatusFilter.slice('manual:'.length);
      return allRanked.filter(
        (item) => (item.proposal.templateDetails?.statusManual?.trim() ?? '') === target
      );
    }
    return allRanked;
  }, [allRanked, effectiveStatusFilter]);

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
    const list = Object.values(SektorCiptaKarya).map((sek) => {
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
  }, [statusScoped, sortOrder]);

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
    if (effectiveStatusFilter === 'ALL') return 'Semua Status Usulan';
    if (effectiveStatusFilter === 'manual:__EMPTY__') return 'Belum Diisi Status';
    if (effectiveStatusFilter.startsWith('manual:')) {
      return effectiveStatusFilter.slice('manual:'.length);
    }
    return 'Semua Status Usulan';
  }, [effectiveStatusFilter]);

  const handleExportPdf = () => {
    const fileName = exportRcInfographicPdf(
      filteredRanked,
      summaryStats,
      sectorAverages,
      regionalAverages,
      {
        yearFilterLabel,
        sortOrder,
        tierFilterLabel,
        statusFilterLabel,
        searchQuery,
      }
    );
    onPdfExported?.(fileName);
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
      {/* Print-only Institutional Header (Ctrl+P fallback) */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <div className="text-[10px] font-semibold tracking-wider text-blue-800 uppercase">
            Kementerian Pekerjaan Umum · SIMPRA BPBPK Nusa Tenggara Barat
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Infografis Peringkat Skor Readiness Criteria (RC)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {yearFilterLabel} · {tierFilterLabel} · {statusFilterLabel} ·{' '}
            {filteredRanked.length} dari {statusScoped.length} Paket
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-500 font-mono">
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

      {/* Header & Controls Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Infografis Peringkat Skor Readiness Criteria (RC)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemeringkatan kesiapan teknis paket usulan dari skor tertinggi hingga terendah
              <span aria-hidden="true"> · </span>
              <span>{yearFilterLabel}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{statusScoped.length}</span> Paket
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="Urutan Skor RC"
            >
              <button
                type="button"
                onClick={() => setSortOrder('desc')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sortOrder === 'desc'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5 text-blue-700" />
                <span>Tertinggi ke Terendah</span>
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('asc')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sortOrder === 'asc'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpWideNarrow className="w-3.5 h-3.5 text-amber-600" />
                <span>Terendah ke Tertinggi</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportRankingCsv}
              disabled={filteredRanked.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Ekspor Peringkat CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={statusScoped.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Unduh laporan Infografis Skor RC dalam format PDF"
            >
              <Printer className="w-3.5 h-3.5 text-blue-300" />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Tier, Status Usulan & Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
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
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full xl:w-auto">
            <select
              value={effectiveStatusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status Usulan"
              className="h-9 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 w-full sm:w-64"
            >
              <option value="ALL">Semua Status Usulan ({allRanked.length})</option>
              {statusOptions.manualOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
              {statusOptions.emptyManualCount > 0 && (
                <option value="manual:__EMPTY__">
                  Belum Diisi Status ({statusOptions.emptyManualCount})
                </option>
              )}
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari paket, kode, kabupaten, status..."
                aria-label="Cari paket pada infografis skor RC"
                className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Summary Infographic Metrics Row */}
      <section
        aria-label="Ikhtisar Ekstrem Skor RC"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 print:grid-cols-4"
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
          <div className="text-xs font-medium text-slate-500">Rata-Rata Skor RC</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {summaryStats.averagePct}%
          </div>
          <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, summaryStats.averagePct))}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Ambang siap lelang optimal: <span className="font-mono tabular-nums">≥ 80%</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">
            Sebaran Tingkat Kesiapan
          </div>
          <div className="mt-3 w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            {highShare > 0 && (
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${highShare}%` }}
                title={`Siap (≥80%): ${summaryStats.highCount} paket (${highShare}%)`}
              />
            )}
            {mediumShare > 0 && (
              <div
                className="h-full bg-blue-600"
                style={{ width: `${mediumShare}%` }}
                title={`Proses (50–79%): ${summaryStats.mediumCount} paket (${mediumShare}%)`}
              />
            )}
            {lowShare > 0 && (
              <div
                className="h-full bg-amber-500"
                style={{ width: `${lowShare}%` }}
                title={`Kurang (<50%): ${summaryStats.lowCount} paket (${lowShare}%)`}
              />
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div>
              <div className="font-mono font-bold tabular-nums text-emerald-700">
                {summaryStats.highCount} ({highShare}%)
              </div>
              <div className="text-slate-500 truncate">Siap ≥80%</div>
            </div>
            <div>
              <div className="font-mono font-bold tabular-nums text-blue-700">
                {summaryStats.mediumCount} ({mediumShare}%)
              </div>
              <div className="text-slate-500 truncate">Proses 50–79%</div>
            </div>
            <div>
              <div className="font-mono font-bold tabular-nums text-amber-700">
                {summaryStats.lowCount} ({lowShare}%)
              </div>
              <div className="text-slate-500 truncate">Kurang &lt;50%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Infographic Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ranked Bar Chart List */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
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
                  setStatusFilter('ALL');
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

        {/* Right Sidebars: Sector & Kabupaten/Kota RC Comparison */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Rata-rata RC per Sektor */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
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
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
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
    </div>
  );
};
