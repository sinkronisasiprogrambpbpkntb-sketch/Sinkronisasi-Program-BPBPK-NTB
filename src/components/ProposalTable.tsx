import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  LocateFixed,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import {
  formatActiveYears,
  formatRpMiliar,
  getReadinessScore,
  getTotalPaguUsulan,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import {
  ResolvedPlaceInfo,
  StatusVerifikasi,
  UsulanProgram,
} from '../types/ciptaKarya';

interface ProposalTableProps {
  proposals: UsulanProgram[];
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  selectedProposalId: string | null;
  canEdit: boolean;
  isSavingAll?: boolean;
  canManageProposal?: (proposal: UsulanProgram) => boolean;
  onSelectProposal: (id: string) => void;
  onPreviewProposal: (id: string) => void;
  onEditProposal: (proposal: UsulanProgram) => void;
  onUpdateSkorRc: (id: string, skorRc: number) => void;
  onDeleteProposals: (targets: UsulanProgram[]) => void;
  onJumpToMap: (id: string) => void;
  onAddNew: () => void;
  onSaveAll?: () => void;
  onExportCsv: () => void;
  onExportGeoJson: () => void;
  onOpenTemplateDemo?: () => void;
}

interface ManualRcCellInputProps {
  value: number;
  hasExplicitManual: boolean;
  ariaLabel: string;
  onCommit: (nextVal: number) => void;
}

const ManualRcCellInput: React.FC<ManualRcCellInputProps> = ({
  value,
  hasExplicitManual,
  ariaLabel,
  onCommit,
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    setDraft(String(value));
    setIsDirty(false);
  }, [value]);

  useEffect(() => {
    if (!isDirty) return;
    const trimmed = draft.trim();
    if (trimmed === '') return;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return;

    const timer = window.setTimeout(() => {
      const clamped = Math.min(100, Math.max(0, Number(parsed.toFixed(1))));
      if (clamped !== value || !hasExplicitManual) {
        onCommit(clamped);
      }
      setIsDirty(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [draft, isDirty, value, hasExplicitManual, onCommit]);

  const commit = () => {
    setIsDirty(false);
    const parsed = Number(draft);
    if (draft.trim() === '' || Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(100, Math.max(0, Number(parsed.toFixed(1))));
    setDraft(String(clamped));
    if (clamped !== value || !hasExplicitManual) {
      onCommit(clamped);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1"
    >
      <div
        className="inline-flex items-center bg-white border border-slate-300 rounded px-1.5 py-0.5 focus-within:border-blue-700 w-16"
        title="Ketik Skor RC manual (0–100) lalu klik tombol simpan atau tekan Enter"
      >
        <input
          type="number"
          min="0"
          max="100"
          step="any"
          aria-label={ariaLabel}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setIsDirty(true);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="w-full font-mono text-xs font-semibold tabular-nums text-right text-slate-900 bg-transparent focus:outline-none"
        />
        <span className="font-mono text-[10px] text-slate-500 ml-0.5 select-none">%</span>
      </div>
      {isDirty && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }}
          className="inline-flex items-center justify-center p-1 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer"
          title="Klik untuk menyimpan Skor RC"
          aria-label="Simpan Skor RC"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

type SortKey = 'kode' | 'pagu' | 'rc' | 'kabupaten';

export const ProposalTable: React.FC<ProposalTableProps> = ({
  proposals,
  resolvedPlaces,
  selectedProposalId,
  canEdit,
  isSavingAll = false,
  canManageProposal,
  onSelectProposal,
  onPreviewProposal,
  onEditProposal,
  onUpdateSkorRc,
  onDeleteProposals,
  onJumpToMap,
  onAddNew,
  onSaveAll,
  onExportCsv,
  onExportGeoJson,
  onOpenTemplateDemo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [kabupatenFilter, setKabupatenFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('pagu');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const kabupatenOptions = useMemo(() => {
    return Array.from(new Set(proposals.map((p) => p.kabupatenKota))).sort();
  }, [proposals]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = proposals.filter((p) => {
      if (kabupatenFilter !== 'ALL' && p.kabupatenKota !== kabupatenFilter) return false;
      if (statusFilter !== 'ALL' && p.statusVerifikasi !== statusFilter) return false;
      if (!q) return true;
      return (
        p.namaProgram.toLowerCase().includes(q) ||
        p.kodeUsulan.toLowerCase().includes(q) ||
        p.kabupatenKota.toLowerCase().includes(q) ||
        p.kecamatanKawasan.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'kode') cmp = a.kodeUsulan.localeCompare(b.kodeUsulan);
      if (sortKey === 'kabupaten') cmp = a.kabupatenKota.localeCompare(b.kabupatenKota);
      if (sortKey === 'pagu') cmp = getTotalPaguUsulan(a.pagu) - getTotalPaguUsulan(b.pagu);
      if (sortKey === 'rc') {
        cmp =
          getReadinessScore(a.readiness, a.skorRc).percentage -
          getReadinessScore(b.readiness, b.skorRc).percentage;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [proposals, searchQuery, kabupatenFilter, statusFilter, sortKey, sortAsc]);

  const manageableVisibleItems = useMemo(() => {
    if (!canEdit) return [];
    return filteredAndSorted.filter((p) => (canManageProposal ? canManageProposal(p) : true));
  }, [canEdit, filteredAndSorted, canManageProposal]);

  const visibleCheckedItems = useMemo(() => {
    return manageableVisibleItems.filter((p) => checkedIds.has(p.id));
  }, [manageableVisibleItems, checkedIds]);

  const allVisibleChecked =
    manageableVisibleItems.length > 0 &&
    visibleCheckedItems.length === manageableVisibleItems.length;

  const toggleCheckAllVisible = () => {
    if (allVisibleChecked) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        manageableVisibleItems.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        manageableVisibleItems.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const toggleCheckRow = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Filter & Export Bar */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-3 h-9 w-64 focus-within:bg-white focus-within:border-blue-700">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode, paket, kawasan..."
              className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
            />
          </div>

          <select
            value={kabupatenFilter}
            onChange={(e) => setKabupatenFilter(e.target.value)}
            aria-label="Filter Kabupaten atau Kota"
            className="h-9 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-700"
          >
            <option value="ALL">Semua Kabupaten/Kota</option>
            {kabupatenOptions.map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter Status Verifikasi"
            className="h-9 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-700"
          >
            <option value="ALL">Semua Status RC</option>
            {Object.values(StatusVerifikasi).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && visibleCheckedItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onDeleteProposals(visibleCheckedItems);
                setCheckedIds(new Set());
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({visibleCheckedItems.length})</span>
            </button>
          )}

          {canEdit && onSaveAll && (
            <button
              type="button"
              disabled={isSavingAll}
              onClick={onSaveAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingAll ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Usulan</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportGeoJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh GeoJSON</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="py-16 px-6 text-center">
          <p className="text-sm font-semibold text-slate-900 mb-1">
            {proposals.length === 0
              ? 'Daftar usulan kegiatan kosong (0 Paket)'
              : 'Tidak ada usulan kegiatan yang sesuai kriteria filter'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            {proposals.length === 0
              ? 'Seluruh daftar usulan lama telah dihapus. Silakan tambahkan usulan kegiatan baru atau buka Template Preview untuk melihat tampilan lembar paparan usulan.'
              : 'Ubah kata kunci pencarian atau sesuaikan filter tahun anggaran/sektor untuk menampilkan matriks usulan TA 2027–2030.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {canEdit && (
              <button
                type="button"
                onClick={onAddNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Usulan Kegiatan</span>
              </button>
            )}
            {onOpenTemplateDemo && (
              <button
                type="button"
                onClick={onOpenTemplateDemo}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-4 h-4 text-blue-700" />
                <span>Lihat Template Preview</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                {canEdit && (
                  <th className="py-3 pl-4 pr-2 w-9">
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      disabled={manageableVisibleItems.length === 0}
                      onChange={toggleCheckAllVisible}
                      aria-label="Pilih semua baris usulan"
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer disabled:opacity-40"
                    />
                  </th>
                )}
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('kode')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Kode & Paket Usulan</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('kabupaten')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Wilayah & Koordinat</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Volume Fisik</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">TA 2027</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">TA 2028</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">TA 2029</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">TA 2030</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('pagu')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    <span>Total Pagu</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('rc')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Skor RC (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredAndSorted.map((p) => {
                const total = getTotalPaguUsulan(p.pagu);
                const rc = getReadinessScore(p.readiness, p.skorRc);
                const pos = p.manualPosition ?? resolvedPlaces[p.locationQuery]?.position;
                const isSelected = p.id === selectedProposalId;
                const isChecked = checkedIds.has(p.id);
                const allowManageRow = canEdit && (canManageProposal ? canManageProposal(p) : true);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProposal(p.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {canEdit && (
                      <td
                        className="py-3 pl-4 pr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!allowManageRow}
                          onChange={() => toggleCheckRow(p.id)}
                          aria-label={`Pilih ${p.namaProgram}`}
                          className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer disabled:opacity-35"
                        />
                      </td>
                    )}

                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-[11px] text-slate-500 mb-0.5">
                        <span className="font-mono">{p.kodeUsulan}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{SEKTOR_SHORT_LABELS[p.sektor]}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{p.sumberDana}</span>
                      </div>
                      <div className="font-medium text-slate-900 leading-snug">
                        {p.namaProgram}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{p.kabupatenKota}</div>
                      <div className="text-[11px] text-slate-500">{p.kecamatanKawasan}</div>
                      {pos && (
                        <div className="font-mono text-[10px] tabular-nums text-slate-400 mt-0.5">
                          {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                      <div>{p.volumeTarget.toLocaleString('id-ID')}</div>
                      <div className="font-sans text-[11px] text-slate-400">{p.satuanTarget}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {p.pagu.y2027 > 0 ? p.pagu.y2027.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {p.pagu.y2028 > 0 ? p.pagu.y2028.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {p.pagu.y2029 > 0 ? p.pagu.y2029.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {p.pagu.y2030 > 0 ? p.pagu.y2030.toFixed(1) : '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap text-slate-900">
                      <div>{formatRpMiliar(total)}</div>
                      <div className="font-sans font-normal text-[10px] text-slate-400">
                        {formatActiveYears(p.pagu)}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {p.statusVerifikasi === StatusVerifikasi.TERVERIFIKASI && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        {p.statusVerifikasi === StatusVerifikasi.REVISI_RC && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        {p.statusVerifikasi === StatusVerifikasi.MENUNGGU_KONREG && (
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        {canEdit && !p.isLocked ? (
                          <ManualRcCellInput
                            value={rc.percentage}
                            hasExplicitManual={p.skorRc !== undefined}
                            ariaLabel={`Skor RC Manual ${p.namaProgram}`}
                            onCommit={(nextVal) => onUpdateSkorRc(p.id, nextVal)}
                          />
                        ) : (
                          <span className="font-mono font-semibold tabular-nums text-slate-800">
                            {rc.percentage}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{p.statusVerifikasi}</div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProposal(p.id);
                            onPreviewProposal(p.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          title="Pratinjau lembar usulan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau</span>
                        </button>

                        {allowManageRow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProposal(p.id);
                              onEditProposal(p);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                            title="Edit usulan program"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToMap(p.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          title="Fokus ke lokasi peta spasial"
                        >
                          <LocateFixed className="w-3.5 h-3.5" />
                          <span>Peta</span>
                        </button>

                        {allowManageRow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProposals([p]);
                            }}
                            className="inline-flex items-center p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Hapus usulan program"
                            aria-label={`Hapus ${p.namaProgram}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
