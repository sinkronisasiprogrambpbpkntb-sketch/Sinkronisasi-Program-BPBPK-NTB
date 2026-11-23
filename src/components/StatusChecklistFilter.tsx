import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ListFilter, Wallet } from 'lucide-react';

export interface StatusFilterOption {
  value: string;
  label: string;
  count: number;
}

interface StatusChecklistFilterProps {
  options: StatusFilterOption[];
  totalCount: number;
  /** null means all items are selected */
  selectedValues: string[] | null;
  onChange: (next: string[] | null) => void;
  ariaLabel?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  allLabel?: string;
  dialogLabel?: string;
  emptyDataLabel?: string;
  zeroSelectedLabel?: string;
  pluralLabel?: string;
  icon?: 'filter' | 'wallet';
}

export const StatusChecklistFilter: React.FC<StatusChecklistFilterProps> = ({
  options,
  totalCount,
  selectedValues,
  onChange,
  ariaLabel = 'Filter Status Usulan',
  buttonClassName = '',
  align = 'left',
  allLabel = 'Semua Status Usulan',
  dialogLabel = 'Ceklist Filter Status Usulan',
  emptyDataLabel = 'Belum ada data status usulan',
  zeroSelectedLabel = '0 Status Dipilih',
  pluralLabel = 'Status',
  icon = 'filter',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const masterCheckboxRef = useRef<HTMLInputElement | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
  }>({ top: 0, left: 0, width: 280, openUpwards: false });

  const allValues = useMemo(() => options.map((o) => o.value), [options]);

  const isAllSelected = selectedValues === null;
  const activeCount = useMemo(() => {
    if (selectedValues === null) return options.length;
    return selectedValues.length;
  }, [selectedValues, options.length]);

  const isPartialSelected =
    selectedValues !== null &&
    selectedValues.length > 0 &&
    selectedValues.length < options.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isPartialSelected;
    }
  }, [isPartialSelected, isOpen]);

  const matchedItemCount = useMemo(() => {
    if (selectedValues === null) return totalCount;
    if (selectedValues.length === 0) return 0;
    const allowed = new Set(selectedValues);
    return options.reduce(
      (sum, opt) => (allowed.has(opt.value) ? sum + opt.count : sum),
      0
    );
  }, [selectedValues, options, totalCount]);

  const buttonSummaryLabel = useMemo(() => {
    if (selectedValues === null) {
      return `${allLabel} (${totalCount})`;
    }
    if (selectedValues.length === 0) {
      return zeroSelectedLabel;
    }
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      if (match) return `${match.label} (${match.count})`;
    }
    return `${selectedValues.length} dari ${options.length} ${pluralLabel} (${matchedItemCount})`;
  }, [
    selectedValues,
    allLabel,
    totalCount,
    zeroSelectedLabel,
    options,
    pluralLabel,
    matchedItemCount,
  ]);

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const minMenuWidth = Math.max(rect.width, 280);
    const maxMenuWidth = Math.min(340, window.innerWidth - 16);
    const menuWidth = Math.min(minMenuWidth, maxMenuWidth);

    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(340, 100 + options.length * 36);
    const openUpwards = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    let left =
      align === 'right' ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    if (left < 8) {
      left = 8;
    }

    const top = openUpwards ? rect.top - 6 : rect.bottom + 6;
    setCoords({ top, left, width: menuWidth, openUpwards });
  }, [align, options.length]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, updatePosition]);

  const handleToggleMaster = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(null);
    }
  };

  const handleToggleItem = (val: string) => {
    if (options.length === 0) return;
    const currentSet =
      selectedValues === null ? new Set(allValues) : new Set(selectedValues);

    if (currentSet.has(val)) {
      currentSet.delete(val);
    } else {
      currentSet.add(val);
    }

    if (currentSet.size >= allValues.length) {
      onChange(null);
    } else {
      onChange(allValues.filter((v) => currentSet.has(v)));
    }
  };

  const handleSelectOnly = (val: string) => {
    if (allValues.length <= 1) {
      onChange(null);
      return;
    }
    onChange([val]);
  };

  const isFiltered = selectedValues !== null;
  const IconComp = icon === 'wallet' ? Wallet : ListFilter;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`h-9 px-3 text-xs border rounded-lg inline-flex items-center justify-between gap-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0A1D6E]/20 ${
          isFiltered
            ? selectedValues && selectedValues.length === 0
              ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold'
              : 'bg-[#EEF2FA] border-[#0A1D6E]/50 text-[#061459] font-semibold'
            : 'bg-white border-[#C7D3E8] text-slate-700 hover:border-[#0A1D6E]/60'
        } ${buttonClassName}`}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <IconComp
            className={`w-3.5 h-3.5 shrink-0 ${
              isFiltered ? 'text-[#061459]' : 'text-slate-400'
            }`}
          />
          <span className="truncate">{buttonSummaryLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={dialogLabel}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUpwards ? 'translateY(-100%)' : undefined,
            }}
            className="z-[9999] bg-white border border-[#C7D3E8] rounded-xl shadow-xl overflow-hidden"
          >
            {/* Master Checklist Header */}
            <div className="px-3 py-2.5 bg-[#F4F7FC] border-b border-[#D7E0F0] flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer min-w-0">
                <input
                  ref={masterCheckboxRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleMaster}
                  className="w-3.5 h-3.5 rounded border-[#94A8CC] accent-[#061459] cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-[#061459] truncate">
                  {allLabel} ({totalCount})
                </span>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                {!isAllSelected && (
                  <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="text-[11px] font-semibold text-[#0A1D6E] hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                )}
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-[11px] font-medium text-slate-500 hover:text-red-600 hover:underline cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>
            </div>

            {/* Individual Options */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {options.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 text-center">
                  {emptyDataLabel}
                </div>
              ) : (
                options.map((opt) => {
                  const checked =
                    selectedValues === null ||
                    selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className="group flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#F3F6FB] transition-colors"
                    >
                      <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleItem(opt.value)}
                          className="w-3.5 h-3.5 rounded border-slate-300 accent-[#061459] cursor-pointer shrink-0"
                        />
                        <span className="text-xs text-slate-800 truncate">
                          {opt.label}
                        </span>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectOnly(opt.value)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] font-semibold text-[#0A1D6E] hover:underline cursor-pointer transition-opacity"
                          title={`Tampilkan hanya ${opt.label}`}
                        >
                          Hanya
                        </button>
                        <span className="font-mono text-[11px] tabular-nums text-slate-500 min-w-[20px] text-right">
                          {opt.count}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Menampilkan{' '}
                <strong className="font-mono tabular-nums text-slate-700">
                  {matchedItemCount}
                </strong>{' '}
                dari{' '}
                <strong className="font-mono tabular-nums text-slate-700">
                  {totalCount}
                </strong>{' '}
                paket
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-[11px] font-semibold text-[#061459] bg-white border border-[#C7D3E8] hover:bg-[#EEF2FA] rounded-md cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
