import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarRange, X } from 'lucide-react';
import { formatRpMiliar, getTotalPaguUsulan } from '../data/initialProposals';
import { PaguTahunan, UsulanProgram } from '../types/ciptaKarya';

const YEAR_KEYS = ['y2027', 'y2028', 'y2029', 'y2030'] as const;
const YEAR_LABELS = ['TA 2027', 'TA 2028', 'TA 2029', 'TA 2030'] as const;

export interface ShiftPaguResult {
  nextPagu: PaguTahunan;
  droppedAmount: number;
}

export function shiftPaguByYears(
  pagu: PaguTahunan,
  delta: number,
  clampAtBounds: boolean
): ShiftPaguResult {
  const nextValues: [number, number, number, number] = [0, 0, 0, 0];
  let droppedAmount = 0;

  for (let i = 0; i < YEAR_KEYS.length; i += 1) {
    const val = Number(pagu[YEAR_KEYS[i]] || 0);
    if (!Number.isFinite(val) || val === 0) continue;

    const targetIdx = i + delta;
    if (targetIdx >= 0 && targetIdx < YEAR_KEYS.length) {
      nextValues[targetIdx] += val;
    } else if (clampAtBounds) {
      const clampedIdx = targetIdx < 0 ? 0 : YEAR_KEYS.length - 1;
      nextValues[clampedIdx] += val;
    } else {
      droppedAmount += val;
    }
  }

  return {
    nextPagu: {
      y2027: Number(nextValues[0].toFixed(2)),
      y2028: Number(nextValues[1].toFixed(2)),
      y2029: Number(nextValues[2].toFixed(2)),
      y2030: Number(nextValues[3].toFixed(2)),
    },
    droppedAmount: Number(droppedAmount.toFixed(2)),
  };
}

interface ShiftYearModalProps {
  isOpen: boolean;
  targets: UsulanProgram[];
  scopeLabel?: string;
  onClose: () => void;
  onApply: (
    updates: Array<{ id: string; nextPagu: PaguTahunan }>,
    delta: number
  ) => Promise<void> | void;
}

const DELTA_OPTIONS: Array<{ delta: number; label: string; hint: string }> = [
  { delta: -3, label: '-3 Tahun', hint: 'Mundur 3 thn' },
  { delta: -2, label: '-2 Tahun', hint: 'Mundur 2 thn' },
  { delta: -1, label: '-1 Tahun', hint: 'Mundur 1 thn' },
  { delta: 1, label: '+1 Tahun', hint: 'Maju 1 thn' },
  { delta: 2, label: '+2 Tahun', hint: 'Maju 2 thn' },
  { delta: 3, label: '+3 Tahun', hint: 'Maju 3 thn' },
];

export const ShiftYearModal: React.FC<ShiftYearModalProps> = ({
  isOpen,
  targets,
  scopeLabel,
  onClose,
  onApply,
}) => {
  const [delta, setDelta] = useState<number>(1);
  const [clampAtBounds, setClampAtBounds] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setDelta(1);
    setClampAtBounds(false);
    setIsApplying(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApplying) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isApplying, onClose]);

  const previewRows = useMemo(() => {
    return targets.map((p) => {
      const shifted = shiftPaguByYears(p.pagu, delta, clampAtBounds);
      const beforeTotal = getTotalPaguUsulan(p.pagu);
      const afterTotal = getTotalPaguUsulan(shifted.nextPagu);
      return {
        proposal: p,
        beforePagu: p.pagu,
        afterPagu: shifted.nextPagu,
        droppedAmount: shifted.droppedAmount,
        beforeTotal,
        afterTotal,
      };
    });
  }, [targets, delta, clampAtBounds]);

  const totalDropped = useMemo(
    () =>
      Number(
        previewRows
          .reduce((sum, row) => sum + row.droppedAmount, 0)
          .toFixed(2)
      ),
    [previewRows]
  );

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (targets.length === 0 || delta === 0 || isApplying) return;
    setIsApplying(true);
    try {
      await onApply(
        previewRows.map((row) => ({
          id: row.proposal.id,
          nextPagu: row.afterPagu,
        })),
        delta
      );
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-year-modal-title"
      onClick={() => {
        if (!isApplying) onClose();
      }}
    >
      <div
        className="bg-white border border-[#C7D3E8] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#061459] text-white border-b-2 border-[#E89611] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E89611] text-[#051044] flex items-center justify-center shrink-0">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="shift-year-modal-title"
                className="text-sm sm:text-base font-bold text-white truncate"
              >
                Geser Tahun Anggaran (TA 2027–2030)
              </h3>
              <p className="text-[11px] text-indigo-200 truncate">
                {scopeLabel ||
                  (targets.length === 1
                    ? `${targets[0].kodeUsulan} · ${targets[0].namaProgram}`
                    : `${targets.length} Paket Usulan Terpilih`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isApplying && onClose()}
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup dialog geser tahun"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Step Selector */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#061459]">
              Pilih Arah &amp; Rentang Pergeseran Tahun
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DELTA_OPTIONS.map((opt) => {
                const active = delta === opt.delta;
                return (
                  <button
                    key={opt.delta}
                    type="button"
                    onClick={() => setDelta(opt.delta)}
                    className={`px-3 py-2 rounded-lg border text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#061459] text-white border-[#061459] shadow-xs'
                        : 'bg-[#F8FAFE] text-[#061459] border-[#C7D3E8] hover:bg-[#EEF2FA]'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold">
                      {opt.label}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        active ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Boundary Handling Toggle */}
          <div className="bg-[#F8FAFE] border border-[#D7E0F0] rounded-lg p-3.5 space-y-2">
            <div className="text-xs font-semibold text-[#061459]">
              Perlakuan Nilai Pagu Jika Melewati Rentang TA 2027–2030
            </div>
            <div className="flex flex-col sm:flex-row gap-3 text-xs">
              <label className="inline-flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shift-boundary-mode"
                  checked={!clampAtBounds}
                  onChange={() => setClampAtBounds(false)}
                  className="mt-0.5 accent-[#061459] cursor-pointer"
                />
                <span>
                  <strong className="text-slate-900">Geser Murni</strong>{' '}
                  <span className="text-slate-500">
                    (pagu di luar TA 2027–2030 dikosongkan)
                  </span>
                </span>
              </label>
              <label className="inline-flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shift-boundary-mode"
                  checked={clampAtBounds}
                  onChange={() => setClampAtBounds(true)}
                  className="mt-0.5 accent-[#061459] cursor-pointer"
                />
                <span>
                  <strong className="text-slate-900">Tahan di Batas Tahun</strong>{' '}
                  <span className="text-slate-500">
                    (gabungkan ke TA 2027 / TA 2030 agar total pagu tetap)
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Overflow Warning */}
          {totalDropped > 0 && !clampAtBounds && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Perhatian:</strong> Sebesar{' '}
                <strong className="font-mono">
                  {formatRpMiliar(totalDropped)}
                </strong>{' '}
                berada di luar rentang TA 2027–2030 setelah digeser{' '}
                <strong>{delta > 0 ? `+${delta}` : delta} tahun</strong> dan akan
                menjadi 0. Pilih <strong>Tahan di Batas Tahun</strong> jika ingin
                total pagu tetap utuh.
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#061459]">
                Pratinjau Perubahan Jadwal Pagu (Rp Miliar)
              </span>
              <span className="text-[11px] text-slate-500">
                Menampilkan {previewRows.length} paket
              </span>
            </div>

            <div className="border border-[#D7E0F0] rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#07165B] text-indigo-50 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Kode &amp; Paket Usulan</th>
                      {YEAR_LABELS.map((yr) => (
                        <th key={yr} className="py-2 px-2.5 text-right whitespace-nowrap">
                          {yr}
                        </th>
                      ))}
                      <th className="py-2 px-3 text-right whitespace-nowrap">
                        Total Pagu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5ECF7]">
                    {previewRows.map((row) => (
                      <tr key={row.proposal.id} className="hover:bg-[#F8FAFE]">
                        <td className="py-2 px-3 max-w-[230px]">
                          <div className="font-mono text-[10px] text-slate-500">
                            {row.proposal.kodeUsulan}
                          </div>
                          <div className="font-medium text-slate-900 truncate">
                            {row.proposal.namaProgram}
                          </div>
                        </td>

                        {YEAR_KEYS.map((key) => {
                          const before = Number(row.beforePagu[key] || 0);
                          const after = Number(row.afterPagu[key] || 0);
                          const changed = before !== after;
                          return (
                            <td
                              key={key}
                              className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap"
                            >
                              {changed ? (
                                <div className="inline-flex items-center justify-end gap-1">
                                  <span className="text-[10px] text-slate-400 line-through">
                                    {before > 0 ? before.toFixed(1) : '0'}
                                  </span>
                                  <ArrowRight className="w-2.5 h-2.5 text-[#E89611] shrink-0" />
                                  <span
                                    className={`font-bold ${
                                      after > 0 ? 'text-[#061459]' : 'text-slate-400'
                                    }`}
                                  >
                                    {after > 0 ? after.toFixed(1) : '—'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500">
                                  {before > 0 ? before.toFixed(1) : '—'}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              row.afterTotal !== row.beforeTotal
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {row.afterTotal.toFixed(1)} M
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isApplying}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isApplying || targets.length === 0 || delta === 0}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A1D6E] hover:bg-[#061459] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <CalendarRange className="w-3.5 h-3.5 text-[#E89611]" />
            <span>
              {isApplying
                ? 'Menyimpan Pergeseran...'
                : `Terapkan Geser ${delta > 0 ? `+${delta}` : delta} Tahun (${targets.length} Paket)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
