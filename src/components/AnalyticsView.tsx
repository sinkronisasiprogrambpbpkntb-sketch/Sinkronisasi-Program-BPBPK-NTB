import React, { useMemo } from 'react';
import {
  formatRpMiliar,
  getReadinessScore,
  getTotalPaguUsulan,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import { SektorCiptaKarya, SumberDana, UsulanProgram } from '../types/ciptaKarya';

interface AnalyticsViewProps {
  proposals: UsulanProgram[];
  compact?: boolean;
}

const SEKTOR_LIST = [
  SektorCiptaKarya.AIR_MINUM,
  SektorCiptaKarya.SANITASI,
  SektorCiptaKarya.KAWASAN_STRATEGIS,
  SektorCiptaKarya.BINA_PENATAAN_BANGUNAN,
];

const SEKTOR_SVG_FILL: Record<SektorCiptaKarya, string> = {
  [SektorCiptaKarya.AIR_MINUM]: '#1d4ed8',
  [SektorCiptaKarya.SANITASI]: '#0f766e',
  [SektorCiptaKarya.KAWASAN_STRATEGIS]: '#d97706',
  [SektorCiptaKarya.BINA_PENATAAN_BANGUNAN]: '#334155',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ proposals, compact = false }) => {
  // 1. Yearly Stacked Breakdown (2027 - 2030) by Sektor
  const yearlyData = useMemo(() => {
    const years = [
      { key: 'y2027' as const, label: 'TA 2027' },
      { key: 'y2028' as const, label: 'TA 2028' },
      { key: 'y2029' as const, label: 'TA 2029' },
      { key: 'y2030' as const, label: 'TA 2030' },
    ];

    return years.map((yr) => {
      const bySektor: Record<SektorCiptaKarya, number> = {
        [SektorCiptaKarya.AIR_MINUM]: 0,
        [SektorCiptaKarya.SANITASI]: 0,
        [SektorCiptaKarya.KAWASAN_STRATEGIS]: 0,
        [SektorCiptaKarya.BINA_PENATAAN_BANGUNAN]: 0,
      };
      let total = 0;
      for (const p of proposals) {
        const val = p.pagu[yr.key];
        bySektor[p.sektor] += val;
        total += val;
      }
      return {
        yearLabel: yr.label,
        total: Number(total.toFixed(1)),
        bySektor,
      };
    });
  }, [proposals]);

  const maxYearTotal = useMemo(() => {
    return Math.max(10, ...yearlyData.map((d) => d.total));
  }, [yearlyData]);

  // 2. Sector Total Summary
  const sectorSummary = useMemo(() => {
    const grandTotal = Math.max(
      0.01,
      proposals.reduce((acc, p) => acc + getTotalPaguUsulan(p.pagu), 0)
    );

    return SEKTOR_LIST.map((sek) => {
      const items = proposals.filter((p) => p.sektor === sek);
      const pagu = items.reduce((acc, p) => acc + getTotalPaguUsulan(p.pagu), 0);
      const jiwa = items.reduce((acc, p) => acc + p.penerimaManfaatJiwa, 0);
      return {
        sektor: sek,
        shortLabel: SEKTOR_SHORT_LABELS[sek],
        count: items.length,
        pagu: Number(pagu.toFixed(1)),
        sharePercent: Math.round((pagu / grandTotal) * 100),
        jiwa,
      };
    });
  }, [proposals]);

  // 3. Regional Kabupaten/Kota Allocation
  const regionalRanking = useMemo(() => {
    const map: Record<
      string,
      { kabupaten: string; pagu: number; count: number; avgRc: number }
    > = {};

    for (const p of proposals) {
      if (!map[p.kabupatenKota]) {
        map[p.kabupatenKota] = {
          kabupaten: p.kabupatenKota,
          pagu: 0,
          count: 0,
          avgRc: 0,
        };
      }
      map[p.kabupatenKota].pagu += getTotalPaguUsulan(p.pagu);
      map[p.kabupatenKota].count += 1;
      map[p.kabupatenKota].avgRc += getReadinessScore(p.readiness, p.skorRc).percentage;
    }

    return Object.values(map)
      .map((item) => ({
        ...item,
        pagu: Number(item.pagu.toFixed(1)),
        avgRc: Math.round(item.avgRc / Math.max(1, item.count)),
      }))
      .sort((a, b) => b.pagu - a.pagu);
  }, [proposals]);

  const maxRegionalPagu = Math.max(1, ...regionalRanking.map((r) => r.pagu));

  // 4. Funding Source Breakdown
  const fundingBreakdown = useMemo(() => {
    const grandTotal = Math.max(
      0.01,
      proposals.reduce((acc, p) => acc + getTotalPaguUsulan(p.pagu), 0)
    );
    return Object.values(SumberDana)
      .map((sd) => {
        const items = proposals.filter((p) => p.sumberDana === sd);
        const pagu = items.reduce((acc, p) => acc + getTotalPaguUsulan(p.pagu), 0);
        return {
          sumberDana: sd,
          count: items.length,
          pagu: Number(pagu.toFixed(1)),
          percent: Math.round((pagu / grandTotal) * 100),
        };
      })
      .filter((x) => x.count > 0);
  }, [proposals]);

  return (
    <div className="space-y-6">
      {/* Row 1: Stacked SVG Trajectory 2027-2030 + Sector Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stacked SVG Multi-Year Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Proyeksi Kebutuhan Pagu Tahunan (TA 2027–2030)
              </h3>
              <p className="text-xs text-slate-500">
                Distribusi pagu indikatif per tahun anggaran berdasarkan sektor Cipta Karya (Rp Miliar)
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 560 230"
              className="w-full h-56 select-none"
              role="img"
              aria-label="Grafik batang bertumpuk proyeksi anggaran Cipta Karya 2027 hingga 2030"
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = 185 - ratio * 145;
                const labelVal = Math.round(maxYearTotal * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={56}
                      y1={y}
                      x2={536}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray={ratio === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={48}
                      y={y + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {labelVal}M
                    </text>
                  </g>
                );
              })}

              {/* Stacked Bars for 2027, 2028, 2029, 2030 */}
              {yearlyData.map((d, colIdx) => {
                const barWidth = 68;
                const x = 92 + colIdx * 116;
                let cumulativeHeight = 0;

                return (
                  <g key={d.yearLabel}>
                    {SEKTOR_LIST.map((sek) => {
                      const val = d.bySektor[sek];
                      if (val <= 0) return null;
                      const h = (val / maxYearTotal) * 145;
                      const y = 185 - cumulativeHeight - h;
                      cumulativeHeight += h;
                      return (
                        <rect
                          key={sek}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(1.5, h)}
                          fill={SEKTOR_SVG_FILL[sek]}
                          rx={2}
                        >
                          <title>{`${d.yearLabel} · ${SEKTOR_SHORT_LABELS[sek]}: Rp ${val.toFixed(
                            1
                          )} Miliar`}</title>
                        </rect>
                      );
                    })}

                    {/* Total Value Above Bar */}
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(18, 185 - cumulativeHeight - 8)}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {d.total.toFixed(1)}M
                    </text>

                    {/* Year Label */}
                    <text
                      x={x + barWidth / 2}
                      y={206}
                      textAnchor="middle"
                      fill="#334155"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {d.yearLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-xs bg-blue-700" />
              <span>Air Minum</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-xs bg-teal-700" />
              <span>Sanitasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-xs bg-amber-600" />
              <span>Pengembangan Kawasan Strategis (PKS)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-xs bg-slate-700" />
              <span>Bina Penataan Bangunan (BPB)</span>
            </div>
          </div>
        </div>

        {/* Sector Composition Table */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Komposisi Pagu & Manfaat per Sektor
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Akumulasi usulan program infrastruktur TA 2027–2030
            </p>

            <div className="divide-y divide-slate-200">
              {sectorSummary.map((item) => (
                <div key={item.sektor} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                    <span className="font-semibold text-slate-900">{item.shortLabel}</span>
                    <span className="font-mono font-semibold tabular-nums text-slate-900">
                      {formatRpMiliar(item.pagu)} ({item.sharePercent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.count} paket usulan</span>
                    <span className="font-mono tabular-nums">
                      {item.jiwa.toLocaleString('id-ID')} jiwa terlayani
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Funding Sources Strip */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-900 mb-2">
              Bauran Sumber Pendanaan
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fundingBreakdown.map((fb) => (
                <div
                  key={fb.sumberDana}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80"
                >
                  <div className="text-[11px] text-slate-500 truncate">{fb.sumberDana}</div>
                  <div className="font-mono text-xs font-semibold tabular-nums text-slate-900 mt-0.5">
                    {fb.pagu.toFixed(1)} M
                  </div>
                  <div className="font-mono text-[10px] tabular-nums text-slate-400">
                    {fb.percent}% porsi
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 (Full Analytics View Only): Regional Distribution Matrix */}
      {!compact && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Distribusi Kewilayahan Kabupaten/Kota & Rata-Rata Kesiapan Teknis
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan alokasi pagu indikatif TA 2027–2030 dan tingkat pemenuhan Readiness
              Criteria per daerah
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 pr-4">Kabupaten / Kota</th>
                  <th className="py-2.5 px-3 text-right">Jumlah Paket</th>
                  <th className="py-2.5 px-3 w-64">Proporsi Alokasi Wilayah</th>
                  <th className="py-2.5 px-3 text-right">Total Pagu (2027–2030)</th>
                  <th className="py-2.5 pl-3 text-right">Rata-rata RC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionalRanking.map((reg) => {
                  const widthPct = Math.max(4, Math.round((reg.pagu / maxRegionalPagu) * 100));
                  return (
                    <tr key={reg.kabupaten} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {reg.kabupaten}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {reg.count}
                      </td>
                      <td className="py-2.5 px-3">
                        <svg viewBox="0 0 200 10" className="w-full h-2.5">
                          <rect x={0} y={1} width={200} height={8} rx={4} fill="#f1f5f9" />
                          <rect
                            x={0}
                            y={1}
                            width={widthPct * 2}
                            height={8}
                            rx={4}
                            fill="#1d4ed8"
                          />
                        </svg>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {formatRpMiliar(reg.pagu)}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-slate-700">
                        {reg.avgRc}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
