import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatRpMiliar, getTotalPaguUsulan } from '../data/initialProposals';
import { UsulanProgram } from '../types/ciptaKarya';

interface DeleteConfirmModalProps {
  targets: UsulanProgram[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  targets,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (targets.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targets, onCancel]);

  if (targets.length === 0) return null;

  const isSingle = targets.length === 1;
  const singleItem = targets[0];
  const combinedPagu = targets.reduce((acc, p) => acc + getTotalPaguUsulan(p.pagu), 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 id="delete-modal-title" className="text-sm font-bold text-slate-900">
              {isSingle
                ? 'Konfirmasi Hapus Usulan Program'
                : `Konfirmasi Hapus ${targets.length} Usulan Program`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="Tutup dialog konfirmasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-600">
          {isSingle ? (
            <>
              <p>
                Apakah Anda yakin ingin menghapus paket usulan berikut dari matriks dan peta spasial
                SIMPRA BPBPK NTB? Penghapusan akan langsung tersimpan otomatis.
              </p>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-mono text-[11px] text-slate-500">
                  {singleItem.kodeUsulan} · {singleItem.kabupatenKota}
                </div>
                <div className="font-semibold text-slate-900 leading-snug">
                  {singleItem.namaProgram}
                </div>
                <div className="font-mono font-medium tabular-nums text-blue-700 pt-1">
                  Total Pagu: {formatRpMiliar(getTotalPaguUsulan(singleItem.pagu))}
                </div>
              </div>
            </>
          ) : (
            <>
              <p>
                Anda akan menghapus{' '}
                <strong className="font-semibold text-slate-900">{targets.length} paket usulan</strong>{' '}
                dengan total akumulasi pagu sebesar{' '}
                <strong className="font-mono font-semibold tabular-nums text-slate-900">
                  {formatRpMiliar(combinedPagu)}
                </strong>
                .
              </p>
              <div className="max-h-36 overflow-y-auto p-3 rounded-lg bg-slate-50 border border-slate-200 divide-y divide-slate-200/70">
                {targets.map((item) => (
                  <div key={item.id} className="py-1.5 first:pt-0 last:pb-0">
                    <span className="font-mono text-[11px] text-slate-500">
                      {item.kodeUsulan}
                    </span>{' '}
                    <span className="text-slate-800 font-medium">{item.namaProgram}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ya, Hapus Usulan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
