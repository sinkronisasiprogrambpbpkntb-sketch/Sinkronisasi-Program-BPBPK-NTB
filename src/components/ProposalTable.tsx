import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CalendarRange,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  LocateFixed,
  Minus,
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
  tryParseNumberFlexible,
} from '../data/initialProposals';
import { PaguTahunan, ResolvedPlaceInfo, SumberDana, UsulanProgram } from '../types/ciptaKarya';
import { ShiftYearModal } from './ShiftYearModal';
import {
  StatusChecklistFilter,
  StatusFilterOption,
} from './StatusChecklistFilter';

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
  onUpdateStatusManual?: (id: string, statusManual: string) => void;
  onUpdateJumlahPembahasan?: (id: string, count: number) => void;
  onUpdateLinkDataRc?: (id: string, linkDataRc: string) => void;
  onDeleteProposals: (targets: UsulanProgram[]) => void;
  onDuplicateProposals?: (targets: UsulanProgram[]) => Promise<void> | void;
  onShiftProposalYears?: (
    updates: Array<{ id: string; nextPagu: PaguTahunan }>,
    delta: number
  ) => Promise<void> | void;
  onJumpToMap?: (id: string) => void;
  onAddNew: () => void;
  onSaveAll?: () => void;
  onExportCsv: () => void;
  onExportGeoJson: () => void;
  onOpenTemplateDemo?: () => void;
  fundingOptions?: StatusFilterOption[];
  totalBeforeFundingCount?: number;
  selectedFundingSources?: string[] | null;
  onChangeFundingSources?: (next: string[] | null) => void;
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
    const parsed = tryParseNumberFlexible(draft);
    if (parsed === null || parsed < 0 || parsed > 100) return;

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
    const parsed = tryParseNumberFlexible(draft);
    if (parsed === null) {
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
        className="inline-flex items-center bg-amber-50/90 border-2 border-[#E89611] rounded-lg px-2 py-1 shadow-xs focus-within:border-[#061459] focus-within:ring-2 focus-within:ring-[#E89611]/30 w-20"
        title="Ketik Skor RC manual (0–100) lalu klik tombol simpan atau tekan Enter"
      >
        <input
          type="text"
          inputMode="decimal"
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
          className="w-full font-mono text-base font-extrabold tabular-nums text-right text-[#061459] bg-transparent focus:outline-none"
        />
        <span className="font-mono text-xs font-bold text-[#9A5B00] ml-0.5 select-none">%</span>
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

interface ManualStatusCellInputProps {
  value: string;
  ariaLabel: string;
  onCommit: (nextVal: string) => void;
}

const ManualStatusCellInput: React.FC<ManualStatusCellInputProps> = ({
  value,
  ariaLabel,
  onCommit,
}) => {
  const [draft, setDraft] = useState<string>(value);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    setDraft(value);
    setIsDirty(false);
  }, [value]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setTimeout(() => {
      const trimmed = draft.trim();
      if (trimmed !== value) {
        onCommit(trimmed);
      }
      setIsDirty(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [draft, isDirty, value, onCommit]);

  const commit = () => {
    setIsDirty(false);
    const trimmed = draft.trim();
    setDraft(trimmed);
    if (trimmed !== value) {
      onCommit(trimmed);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1"
    >
      <div
        className="flex items-center bg-white border border-slate-300 rounded px-2 py-1 focus-within:border-blue-700 w-36"
        title="Ketik Status usulan secara manual lalu tekan Enter atau klik simpan"
      >
        <input
          type="text"
          aria-label={ariaLabel}
          value={draft}
          placeholder="Isi status..."
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
          className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
        />
      </div>
      {isDirty && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }}
          className="inline-flex items-center justify-center p-1 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer shrink-0"
          title="Klik untuk menyimpan Status"
          aria-label="Simpan Status Manual"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return null;
}

interface ManualLinkCellInputProps {
  value: string;
  ariaLabel: string;
  onCommit: (nextVal: string) => void;
}

const ManualLinkCellInput: React.FC<ManualLinkCellInputProps> = ({
  value,
  ariaLabel,
  onCommit,
}) => {
  const [draft, setDraft] = useState<string>(value);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    setDraft(value);
    setIsDirty(false);
  }, [value]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setTimeout(() => {
      const trimmed = draft.trim();
      if (trimmed !== value) {
        onCommit(trimmed);
      }
      setIsDirty(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [draft, isDirty, value, onCommit]);

  const commit = () => {
    setIsDirty(false);
    const trimmed = draft.trim();
    setDraft(trimmed);
    if (trimmed !== value) {
      onCommit(trimmed);
    }
  };

  const validHref = normalizeExternalUrl(draft);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1"
    >
      <div
        className="flex items-center bg-white border border-slate-300 rounded px-2 py-1 focus-within:border-blue-700 w-44"
        title="Tempel atau ketik tautan Link Data RC lalu tekan Enter atau klik simpan"
      >
        <input
          type="text"
          aria-label={ariaLabel}
          value={draft}
          placeholder="https://drive.google.com/..."
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
          className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
        />
      </div>
      {isDirty && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }}
          className="inline-flex items-center justify-center p-1 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer shrink-0"
          title="Klik untuk menyimpan Link Data RC"
          aria-label="Simpan Link Data RC"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
      {validHref && (
        <a
          href={validHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center p-1 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-blue-700 transition-colors shrink-0"
          title="Buka Link Data RC pada tab baru"
          aria-label="Buka Link Data RC"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};

interface ManualMeetingCountCellInputProps {
  value: number;
  ariaLabel: string;
  onCommit: (nextVal: number) => void;
}

const ManualMeetingCountCellInput: React.FC<ManualMeetingCountCellInputProps> = ({
  value,
  ariaLabel,
  onCommit,
}) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const [draft, setDraft] = useState<string>(String(safeValue));
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    setDraft(String(safeValue));
    setIsDirty(false);
  }, [safeValue]);

  useEffect(() => {
    if (!isDirty) return;
    const trimmed = draft.trim();
    if (trimmed === '') return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    const timer = window.setTimeout(() => {
      const clamped = Math.min(999, Math.max(0, Math.round(parsed)));
      if (clamped !== safeValue) {
        onCommit(clamped);
      }
      setIsDirty(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [draft, isDirty, safeValue, onCommit]);

  const commit = () => {
    setIsDirty(false);
    const trimmed = draft.trim();
    const parsed = trimmed === '' ? 0 : Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(String(safeValue));
      return;
    }
    const clamped = Math.min(999, Math.max(0, Math.round(parsed)));
    setDraft(String(clamped));
    if (clamped !== safeValue) {
      onCommit(clamped);
    }
  };

  const stepBy = (delta: number) => {
    setIsDirty(false);
    const current = Number(draft);
    const base = Number.isFinite(current) && current >= 0 ? Math.round(current) : safeValue;
    const next = Math.min(999, Math.max(0, base + delta));
    setDraft(String(next));
    if (next !== safeValue) {
      onCommit(next);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1"
      title="Jumlah pertemuan/pembahasan Penajaman Usulan Program dengan BPBPK NTB"
    >
      <div className="inline-flex items-center bg-white border border-slate-300 rounded overflow-hidden focus-within:border-blue-700">
        <button
          type="button"
          onClick={() => stepBy(-1)}
          disabled={safeValue <= 0 && (Number(draft) || 0) <= 0}
          className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35 transition-colors cursor-pointer"
          title="Kurangi jumlah pertemuan"
          aria-label="Kurangi jumlah pertemuan"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={draft}
          onChange={(e) => {
            const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
            setDraft(digitsOnly);
            setIsDirty(true);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="w-8 font-mono text-xs font-semibold tabular-nums text-center text-slate-900 bg-transparent focus:outline-none py-0.5"
        />
        <button
          type="button"
          onClick={() => stepBy(1)}
          className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tambah jumlah pertemuan"
          aria-label="Tambah jumlah pertemuan"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <span className="text-[11px] text-slate-500 select-none">Kali</span>
      {isDirty && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }}
          className="inline-flex items-center justify-center p-1 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer shrink-0"
          title="Klik untuk menyimpan jumlah pembahasan"
          aria-label="Simpan Jumlah Pembahasan"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

type SortKey = 'kode' | 'pagu' | 'sumber' | 'rc' | 'kabupaten' | 'status' | 'pembahasan';

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
  onUpdateStatusManual,
  onUpdateJumlahPembahasan,
  onUpdateLinkDataRc,
  onDeleteProposals,
  onDuplicateProposals,
  onShiftProposalYears,
  onJumpToMap,
  onAddNew,
  onSaveAll,
  onExportCsv,
  onExportGeoJson,
  onOpenTemplateDemo,
  fundingOptions,
  totalBeforeFundingCount,
  selectedFundingSources,
  onChangeFundingSources,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [kabupatenFilter, setKabupatenFilter] = useState<string>('ALL');
  const [selectedStatuses, setSelectedStatuses] = useState<string[] | null>(null);
  const [localSelectedFunding, setLocalSelectedFunding] = useState<string[] | null>(null);
  const [shiftYearModalState, setShiftYearModalState] = useState<{
    targets: UsulanProgram[];
    scopeLabel?: string;
  } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('pagu');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const kabupatenOptions = useMemo(() => {
    return Array.from(new Set(proposals.map((p) => p.kabupatenKota))).sort();
  }, [proposals]);

  const statusChecklistOptions = useMemo<StatusFilterOption[]>(() => {
    const countMap = new Map<string, number>();
    let emptyCount = 0;
    for (const p of proposals) {
      const m = p.templateDetails?.statusManual?.trim() ?? '';
      if (m) {
        countMap.set(m, (countMap.get(m) ?? 0) + 1);
      } else {
        emptyCount += 1;
      }
    }
    const opts: StatusFilterOption[] = Array.from(countMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'id-ID'))
      .map(([label, count]) => ({
        value: label,
        label,
        count,
      }));
    if (emptyCount > 0) {
      opts.push({
        value: '__EMPTY__',
        label: 'Belum Diisi Status',
        count: emptyCount,
      });
    }
    return opts;
  }, [proposals]);

  const effectiveSelectedStatuses = useMemo(() => {
    if (selectedStatuses === null) return null;
    if (selectedStatuses.length === 0) return [];
    const validKeys = new Set(statusChecklistOptions.map((o) => o.value));
    const kept = selectedStatuses.filter((k) => validKeys.has(k));
    if (kept.length === 0) return null;
    if (kept.length === statusChecklistOptions.length) return null;
    return kept;
  }, [selectedStatuses, statusChecklistOptions]);

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

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const allowedStatuses =
      effectiveSelectedStatuses !== null
        ? new Set(effectiveSelectedStatuses)
        : null;
    const allowedLocalFunding =
      onChangeFundingSources === undefined && localSelectedFunding !== null
        ? new Set(localSelectedFunding)
        : null;
    const list = proposals.filter((p) => {
      if (kabupatenFilter !== 'ALL' && p.kabupatenKota !== kabupatenFilter) return false;
      if (allowedLocalFunding !== null && !allowedLocalFunding.has(p.sumberDana)) {
        return false;
      }
      const m = p.templateDetails?.statusManual?.trim() ?? '';
      if (allowedStatuses !== null) {
        const statusKey = m === '' ? '__EMPTY__' : m;
        if (!allowedStatuses.has(statusKey)) return false;
      }
      if (!q) return true;
      return (
        p.namaProgram.toLowerCase().includes(q) ||
        p.kodeUsulan.toLowerCase().includes(q) ||
        p.kabupatenKota.toLowerCase().includes(q) ||
        p.kecamatanKawasan.toLowerCase().includes(q) ||
        p.sumberDana.toLowerCase().includes(q) ||
        (p.templateDetails?.outputTambahan ?? '').toLowerCase().includes(q) ||
        (p.templateDetails?.statusManual ?? '').toLowerCase().includes(q) ||
        (p.templateDetails?.linkDataRc ?? '').toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'kode') cmp = a.kodeUsulan.localeCompare(b.kodeUsulan);
      if (sortKey === 'kabupaten') cmp = a.kabupatenKota.localeCompare(b.kabupatenKota);
      if (sortKey === 'sumber') cmp = a.sumberDana.localeCompare(b.sumberDana);
      if (sortKey === 'status') {
        cmp = (a.templateDetails?.statusManual ?? '').localeCompare(
          b.templateDetails?.statusManual ?? ''
        );
      }
      if (sortKey === 'pembahasan') {
        cmp =
          (a.templateDetails?.jumlahPembahasanBpbpk ?? 0) -
          (b.templateDetails?.jumlahPembahasanBpbpk ?? 0);
      }
      if (sortKey === 'pagu') cmp = getTotalPaguUsulan(a.pagu) - getTotalPaguUsulan(b.pagu);
      if (sortKey === 'rc') {
        cmp =
          getReadinessScore(a.readiness, a.skorRc).percentage -
          getReadinessScore(b.readiness, b.skorRc).percentage;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [
    proposals,
    searchQuery,
    kabupatenFilter,
    effectiveSelectedStatuses,
    onChangeFundingSources,
    localSelectedFunding,
    sortKey,
    sortAsc,
  ]);

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
    <div className="bg-white border border-[#D7E0F0] rounded-xl overflow-hidden">
      {/* Filter & Export Bar */}
      <div className="px-5 py-4 border-b border-[#D7E0F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#F3F6FB] border border-[#C7D3E8] rounded-lg px-3 h-9 w-64 focus-within:bg-white focus-within:border-[#0A1D6E]">
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
            className="h-9 px-3 text-xs border border-[#C7D3E8] rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#0A1D6E]"
          >
            <option value="ALL">Semua Kabupaten/Kota</option>
            {kabupatenOptions.map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>

          <StatusChecklistFilter
            options={statusChecklistOptions}
            totalCount={proposals.length}
            selectedValues={effectiveSelectedStatuses}
            onChange={setSelectedStatuses}
            ariaLabel="Ceklist Filter Status Usulan"
            buttonClassName="min-w-[205px]"
          />

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
            buttonClassName="min-w-[215px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && visibleCheckedItems.length > 0 && onDuplicateProposals && (
            <button
              type="button"
              onClick={() => {
                void onDuplicateProposals(visibleCheckedItems);
                setCheckedIds(new Set());
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#061459] bg-amber-50 border border-[#E89611] hover:bg-amber-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Duplikat seluruh baris usulan yang tercentang"
            >
              <Copy className="w-3.5 h-3.5 text-[#C27803]" />
              <span>Duplikat ({visibleCheckedItems.length})</span>
            </button>
          )}

          {canEdit && visibleCheckedItems.length > 0 && onShiftProposalYears && (
            <button
              type="button"
              onClick={() =>
                setShiftYearModalState({
                  targets: visibleCheckedItems,
                  scopeLabel: `${visibleCheckedItems.length} Paket Terpilih`,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#061459] bg-[#EEF2FA] border border-[#C7D3E8] hover:bg-[#E1E8F5] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Geser tahun pelaksanaan & jadwal pagu untuk paket yang tercentang"
            >
              <CalendarRange className="w-3.5 h-3.5 text-[#0A1D6E]" />
              <span>Geser Tahun ({visibleCheckedItems.length})</span>
            </button>
          )}

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

          {canEdit &&
            visibleCheckedItems.length === 0 &&
            manageableVisibleItems.length > 0 &&
            onShiftProposalYears && (
              <button
                type="button"
                onClick={() =>
                  setShiftYearModalState({
                    targets: manageableVisibleItems,
                    scopeLabel: `Semua ${manageableVisibleItems.length} Paket yang Tampil`,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#061459] bg-[#EEF2FA] border border-[#C7D3E8] hover:bg-[#E1E8F5] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Geser tahun jadwal pagu (2027–2030) secara massal untuk paket yang tampil"
              >
                <CalendarRange className="w-3.5 h-3.5 text-[#0A1D6E]" />
                <span>Geser Tahun</span>
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0A1D6E] hover:bg-[#061459] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Tambah Usulan</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#061459] bg-white border border-[#C7D3E8] rounded-lg hover:bg-[#F3F6FB] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportGeoJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#061459] bg-white border border-[#C7D3E8] rounded-lg hover:bg-[#F3F6FB] cursor-pointer whitespace-nowrap shrink-0"
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
            {(totalBeforeFundingCount ?? proposals.length) === 0
              ? 'Daftar usulan kegiatan kosong (0 Paket)'
              : 'Tidak ada usulan kegiatan yang sesuai kriteria filter'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            {(totalBeforeFundingCount ?? proposals.length) === 0
              ? 'Seluruh daftar usulan lama telah dihapus. Silakan tambahkan usulan kegiatan baru atau buka Template Preview untuk melihat tampilan lembar paparan usulan.'
              : 'Ubah kata kunci pencarian atau sesuaikan filter kabupaten, status usulan, sumber pendanaan, tahun anggaran, atau sektor untuk menampilkan matriks usulan TA 2027–2030.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {(totalBeforeFundingCount ?? proposals.length) > 0 &&
              (searchQuery !== '' ||
                kabupatenFilter !== 'ALL' ||
                effectiveSelectedStatuses !== null ||
                activeFundingSelection !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setKabupatenFilter('ALL');
                    setSelectedStatuses(null);
                    handleFundingChange(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#061459] bg-[#EEF2FA] border border-[#C7D3E8] hover:bg-[#E1E8F5] rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <span>Reset Filter Matriks</span>
                </button>
              )}
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
              <tr className="border-b-2 border-[#E89611] bg-[#07165B] text-[11px] font-semibold text-indigo-50">
                {canEdit && (
                  <th className="py-3 pl-4 pr-2 w-9">
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      disabled={manageableVisibleItems.length === 0}
                      onChange={toggleCheckAllVisible}
                      aria-label="Pilih semua baris usulan"
                      className="rounded border-indigo-300 text-[#E89611] focus:ring-[#E89611] cursor-pointer disabled:opacity-40"
                    />
                  </th>
                )}
                {canEdit && onDuplicateProposals && (
                  <th
                    className="py-3 px-2 text-center w-16 whitespace-nowrap"
                    title="Duplikat usulan pada baris ini"
                  >
                    Duplikat
                  </th>
                )}
                <th className="py-3 px-2.5 text-center w-11 whitespace-nowrap">No</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('kode')}
                    className="inline-flex items-center gap-1 hover:text-amber-300 cursor-pointer"
                  >
                    <span>Kode & Paket Usulan</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('kabupaten')}
                    className="inline-flex items-center gap-1 hover:text-amber-300 cursor-pointer"
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
                    className="inline-flex items-center justify-end gap-1 hover:text-amber-300 cursor-pointer ml-auto"
                  >
                    <span>Total Pagu</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('sumber')}
                    className="inline-flex items-center gap-1 hover:text-amber-300 cursor-pointer"
                  >
                    <span>Sumber Pendanaan</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap bg-[#0B227C] text-amber-300">
                  <button
                    type="button"
                    onClick={() => toggleSort('rc')}
                    className="inline-flex items-center gap-1 hover:text-amber-200 cursor-pointer font-bold"
                  >
                    <span>Skor RC (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('status')}
                    className="inline-flex items-center gap-1 hover:text-amber-300 cursor-pointer"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th
                  className="py-3 px-3 whitespace-nowrap"
                  title="Jumlah pertemuan/pembahasan Penajaman Usulan Program dengan BPBPK NTB"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('pembahasan')}
                    className="inline-flex items-center gap-1 hover:text-amber-300 cursor-pointer"
                  >
                    <span>Pembahasan dengan BPBPK NTB</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Link Data RC</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECF7] text-xs">
              {filteredAndSorted.map((p, idx) => {
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
                      isSelected ? 'bg-amber-50/70' : 'hover:bg-[#F3F6FB]'
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

                    {canEdit && onDuplicateProposals && (
                      <td
                        className="py-3 px-2 text-center whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {allowManageRow ? (
                          <button
                            type="button"
                            onClick={() => void onDuplicateProposals([p])}
                            className="inline-flex items-center justify-center p-1.5 text-[#061459] bg-amber-50 border border-[#E89611]/75 hover:bg-amber-100 rounded-md transition-colors cursor-pointer shadow-2xs"
                            title={`Duplikat ${p.kodeUsulan}`}
                            aria-label={`Duplikat ${p.namaProgram}`}
                          >
                            <Copy className="w-3.5 h-3.5 text-[#C27803]" />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-2.5 text-center font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-[11px] text-slate-500 mb-0.5">
                        <span className="font-mono">{p.kodeUsulan}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{SEKTOR_SHORT_LABELS[p.sektor]}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{p.skemaKontrak}</span>
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

                    <td className="py-3 px-3 text-right text-slate-700 max-w-[190px]">
                      {p.templateDetails?.outputTambahan?.trim() ? (
                        <div className="text-xs font-medium text-slate-800 leading-snug">
                          {p.templateDetails.outputTambahan.trim()}
                        </div>
                      ) : p.volumeTarget > 0 ? (
                        <div className="font-mono tabular-nums whitespace-nowrap">
                          <div>{p.volumeTarget}</div>
                          <div className="font-sans text-[11px] text-slate-400">{p.satuanTarget}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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

                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                      {p.sumberDana}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap bg-amber-50/45">
                      {canEdit && !p.isLocked ? (
                        <ManualRcCellInput
                          value={rc.percentage}
                          hasExplicitManual={p.skorRc !== undefined}
                          ariaLabel={`Skor RC Manual ${p.namaProgram}`}
                          onCommit={(nextVal) => onUpdateSkorRc(p.id, nextVal)}
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 border-2 border-[#E89611] font-mono text-base font-extrabold tabular-nums text-[#061459] shadow-xs">
                          {rc.percentage}%
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {canEdit && !p.isLocked && onUpdateStatusManual ? (
                        <ManualStatusCellInput
                          value={p.templateDetails?.statusManual ?? ''}
                          ariaLabel={`Status Manual ${p.namaProgram}`}
                          onCommit={(nextVal) => onUpdateStatusManual(p.id, nextVal)}
                        />
                      ) : (
                        <span className="text-xs text-slate-700">
                          {p.templateDetails?.statusManual?.trim() || '—'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {canEdit && !p.isLocked && onUpdateJumlahPembahasan ? (
                        <ManualMeetingCountCellInput
                          value={p.templateDetails?.jumlahPembahasanBpbpk ?? 0}
                          ariaLabel={`Jumlah Pembahasan dengan BPBPK NTB ${p.namaProgram}`}
                          onCommit={(nextVal) => onUpdateJumlahPembahasan(p.id, nextVal)}
                        />
                      ) : (
                        <span className="font-mono text-xs font-medium tabular-nums text-slate-800">
                          {p.templateDetails?.jumlahPembahasanBpbpk ?? 0} Kali
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {canEdit && !p.isLocked && onUpdateLinkDataRc ? (
                        <ManualLinkCellInput
                          value={p.templateDetails?.linkDataRc ?? ''}
                          ariaLabel={`Link Data RC ${p.namaProgram}`}
                          onCommit={(nextVal) => onUpdateLinkDataRc(p.id, nextVal)}
                        />
                      ) : (() => {
                        const rawLink = p.templateDetails?.linkDataRc?.trim() ?? '';
                        const href = normalizeExternalUrl(rawLink);
                        if (href) {
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline max-w-[160px] truncate"
                              title={rawLink}
                            >
                              <span className="truncate">{rawLink}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          );
                        }
                        return (
                          <span className="text-xs text-slate-700">
                            {rawLink || '—'}
                          </span>
                        );
                      })()}
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          title="Lihat Profil Usulan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profil Usulan</span>
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

                        {allowManageRow && onShiftProposalYears && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShiftYearModalState({
                                targets: [p],
                                scopeLabel: p.kodeUsulan,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0A1D6E] bg-[#EEF2FA] border border-[#C7D3E8] hover:bg-[#E1E8F5] rounded-md transition-colors cursor-pointer whitespace-nowrap"
                            title="Geser tahun jadwal pagu usulan ini"
                          >
                            <CalendarRange className="w-3.5 h-3.5" />
                            <span>Geser Tahun</span>
                          </button>
                        )}

                        {onJumpToMap && (
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
                        )}

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

      <ShiftYearModal
        isOpen={Boolean(shiftYearModalState)}
        targets={shiftYearModalState?.targets ?? []}
        scopeLabel={shiftYearModalState?.scopeLabel}
        onClose={() => setShiftYearModalState(null)}
        onApply={async (updates, delta) => {
          await onShiftProposalYears?.(updates, delta);
          setCheckedIds(new Set());
        }}
      />
    </div>
  );
};
