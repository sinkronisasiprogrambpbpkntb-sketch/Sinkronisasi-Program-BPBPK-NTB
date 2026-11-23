import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const MENGESAHKAN_JABATAN_OPTIONS = [
  'Kepala Balai PBPK NTB',
  'Kasi Pelaksanaan Wilayah I',
  'Kasi Pelaksanaan Wilayah II',
  'PPK Perencanaan BPBPK NTB',
] as const;

const CUSTOM_OPTION_VALUE = '__CUSTOM__';

interface JabatanSelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'pu' | 'slate';
  placeholder?: string;
  ariaLabel?: string;
}

export const JabatanSelectField: React.FC<JabatanSelectFieldProps> = ({
  value,
  onChange,
  variant = 'pu',
  placeholder = 'Ketik jabatan lainnya secara manual',
  ariaLabel = 'Jabatan Pengesah',
}) => {
  const isPreset = (MENGESAHKAN_JABATAN_OPTIONS as readonly string[]).includes(value);
  const [isManualSelected, setIsManualSelected] = useState(
    () => value.trim() !== '' && !isPreset
  );

  const internalClearRef = useRef(false);
  const prevValueRef = useRef(value);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (prevValueRef.current !== '' && value === '' && !internalClearRef.current) {
      setIsManualSelected(false);
    }
    internalClearRef.current = false;
    prevValueRef.current = value;
  }, [value]);

  const showManualInput = isManualSelected || (value !== '' && !isPreset);
  const selectValue = isPreset
    ? value
    : showManualInput
      ? CUSTOM_OPTION_VALUE
      : '';

  const controlClasses =
    variant === 'pu'
      ? 'w-full h-9 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]'
      : 'w-full h-9 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === CUSTOM_OPTION_VALUE) {
      setIsManualSelected(true);
      if (isPreset || value === '') {
        internalClearRef.current = true;
        onChange('');
      }
      requestAnimationFrame(() => {
        manualInputRef.current?.focus();
      });
      return;
    }

    setIsManualSelected(false);
    internalClearRef.current = next === '';
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          aria-label={ariaLabel}
          value={selectValue}
          onChange={handleSelectChange}
          className={`${controlClasses} appearance-none pl-3 pr-8 cursor-pointer font-medium`}
        >
          <option value="">-- Pilih Jabatan --</option>
          {MENGESAHKAN_JABATAN_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={CUSTOM_OPTION_VALUE}>
            Lainnya (Ketik Manual)...
          </option>
        </select>
        <ChevronDown
          className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
      </div>

      {showManualInput && (
        <input
          ref={manualInputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${controlClasses} px-3`}
        />
      )}
    </div>
  );
};
