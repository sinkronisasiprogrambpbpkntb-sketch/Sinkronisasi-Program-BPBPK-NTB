import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Crosshair,
  Edit3,
  ExternalLink,
  Eye,
  LocateFixed,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  formatActiveYears,
  formatRcChecklistSummary,
  formatRpMiliar,
  getRcChecklistFlags,
  getReadinessScore,
  getTotalPaguUsulan,
  resolveProposalTemplateDetails,
  SEKTOR_SHORT_LABELS,
  tryParseNumberFlexible,
} from '../data/initialProposals';
import {
  CustomRcDocumentEntry,
  ReadinessCriteria,
  ResolvedPlaceInfo,
  UsulanProgram,
} from '../types/ciptaKarya';

interface ProposalDetailPanelProps {
  proposal: UsulanProgram | null;
  resolvedInfo?: ResolvedPlaceInfo;
  canEdit: boolean;
  canManageSelected?: boolean;
  onPreview: (id: string) => void;
  onFocusOnMap?: (id: string) => void;
  onStartPickCoordinate?: (proposal: UsulanProgram) => void;
  onToggleReadiness: (id: string, key: keyof ReadinessCriteria) => void;
  onUpdateSkorRc: (id: string, skorRc: number) => void;
  onSaveProposal?: (proposal: UsulanProgram) => void;
  onEdit: (proposal: UsulanProgram) => void;
  onDelete: (id: string) => void;
  onAddNew?: () => void;
  onOpenTemplateDemo?: () => void;
}

const RC_ITEMS: Array<{ key: keyof ReadinessCriteria; label: string; desc: string }> = [
  {
    key: 'dokumenPerencanaan',
    label: 'Dokumen Rencana Induk',
    desc: 'RISPAM, RIPS, RISPAL, RIPKS / Masterplan yang masih berlaku',
  },
  {
    key: 'dedRab',
    label: 'Dokumen FS, DED & RAB Teknis',
    desc: 'Studi Kelayakan (FS), gambar kerja rinci (DED) & reviu RAB Balai',
  },
  {
    key: 'kesiapanLahan',
    label: 'Kesiapan Lahan (Clean & Clear)',
    desc: 'Sertifikat / hibah lahan bebas sengketa',
  },
  {
    key: 'dokumenLingkungan',
    label: 'Persetujuan Lingkungan',
    desc: 'Dokumen AMDAL / UKL-UPL yang disahkan',
  },
  {
    key: 'lembagaPengelola',
    label: 'Lembaga Pengelola & O&P',
    desc: 'Komitmen Pemda / BUMD / UPTD pasca-konstruksi',
  },
];

export const ProposalDetailPanel: React.FC<ProposalDetailPanelProps> = ({
  proposal,
  resolvedInfo,
  canEdit,
  canManageSelected = true,
  onPreview,
  onFocusOnMap,
  onStartPickCoordinate,
  onToggleReadiness,
  onUpdateSkorRc,
  onSaveProposal,
  onEdit,
  onDelete,
  onAddNew,
  onOpenTemplateDemo,
}) => {
  const currentRcPercentage = proposal
    ? getReadinessScore(proposal.readiness, proposal.skorRc).percentage
    : 0;
  const [rcDraft, setRcDraft] = useState<string>(String(currentRcPercentage));
  const [rcDirty, setRcDirty] = useState<boolean>(false);
  const [showAddCustomRc, setShowAddCustomRc] = useState<boolean>(false);
  const [newRcNama, setNewRcNama] = useState<string>('');
  const [newRcAcuan, setNewRcAcuan] = useState<string>('');
  const [newRcAda, setNewRcAda] = useState<boolean>(true);
  const [newRcKurang, setNewRcKurang] = useState<boolean>(false);
  const [newRcSesuai, setNewRcSesuai] = useState<boolean>(false);
  const [newRcKeterangan, setNewRcKeterangan] = useState<string>('');
  const [newRcError, setNewRcError] = useState<string | null>(null);

  useEffect(() => {
    setRcDraft(String(currentRcPercentage));
    setRcDirty(false);
  }, [proposal?.id, currentRcPercentage]);

  useEffect(() => {
    setShowAddCustomRc(false);
    setNewRcNama('');
    setNewRcAcuan('');
    setNewRcAda(true);
    setNewRcKurang(false);
    setNewRcSesuai(false);
    setNewRcKeterangan('');
    setNewRcError(null);
  }, [proposal?.id]);

  useEffect(() => {
    if (!proposal || !canEdit || proposal.isLocked || !rcDirty) return;
    const parsed = tryParseNumberFlexible(rcDraft);
    if (parsed === null || parsed < 0 || parsed > 100) return;

    const timer = window.setTimeout(() => {
      const clamped = Math.min(100, Math.max(0, Number(parsed.toFixed(1))));
      if (clamped !== currentRcPercentage || proposal.skorRc === undefined) {
        onUpdateSkorRc(proposal.id, clamped);
      }
      setRcDirty(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [rcDraft, rcDirty, proposal, canEdit, currentRcPercentage, onUpdateSkorRc]);

  if (!proposal) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center items-center text-center min-h-[380px]">
        <p className="text-sm font-semibold text-slate-900 mb-1.5">
          Daftar usulan kegiatan kosong
        </p>
        <p className="text-xs text-slate-500 max-w-xs mb-5">
          Tambahkan usulan kegiatan baru untuk mengisi rincian teknis, pagu anggaran 2027–2030, dan
          menampilkan lembar Preview Usulan berformat KEMENPU.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {canEdit && onAddNew && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Usulan Kegiatan</span>
            </button>
          )}
          {onOpenTemplateDemo && (
            <button
              type="button"
              onClick={onOpenTemplateDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-blue-700" />
              <span>Lihat Template Preview</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalPagu = getTotalPaguUsulan(proposal.pagu);
  const rcScore = getReadinessScore(proposal.readiness, proposal.skorRc);
  const position = proposal.manualPosition ?? resolvedInfo?.position;
  const addressText = proposal.manualAddressLabel ?? resolvedInfo?.formattedAddress;

  const handleSaveManualRc = () => {
    setRcDirty(false);
    const num = tryParseNumberFlexible(rcDraft);
    if (num === null) {
      setRcDraft(String(rcScore.percentage));
      return;
    }
    const clamped = Math.min(100, Math.max(0, Number(num.toFixed(1))));
    setRcDraft(String(clamped));
    if (clamped !== rcScore.percentage || proposal.skorRc === undefined) {
      onUpdateSkorRc(proposal.id, clamped);
    }
  };

  const resolvedDetails = resolveProposalTemplateDetails(proposal);
  const customRcItems = resolvedDetails.customRcItems;

  const persistCustomRcItems = (nextItems: CustomRcDocumentEntry[]) => {
    if (!onSaveProposal || !canEdit || !canManageSelected || proposal.isLocked) return;
    onSaveProposal({
      ...proposal,
      templateDetails: {
        ...proposal.templateDetails,
        ...resolvedDetails,
        customRcItems: nextItems,
      },
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const handleAddCustomRc = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newRcNama.trim().slice(0, 200);
    if (!cleanName) {
      setNewRcError('Nama dokumen Readiness Criteria wajib diisi.');
      return;
    }
    const flags = { ada: newRcAda, kurang: newRcKurang, sesuai: newRcSesuai };
    const nextItem: CustomRcDocumentEntry = {
      id: `rc-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      namaDokumen: cleanName,
      acuanStandar: newRcAcuan.trim().slice(0, 240),
      ...flags,
      status: formatRcChecklistSummary(flags),
      keterangan: newRcKeterangan.trim().slice(0, 600),
    };
    persistCustomRcItems([...customRcItems, nextItem]);
    setNewRcNama('');
    setNewRcAcuan('');
    setNewRcAda(true);
    setNewRcKurang(false);
    setNewRcSesuai(false);
    setNewRcKeterangan('');
    setNewRcError(null);
    setShowAddCustomRc(false);
  };

  const handleToggleCustomFlag = (id: string, flag: 'ada' | 'kurang' | 'sesuai') => {
    const nextItems = customRcItems.map((item) => {
      if (item.id !== id) return item;
      const currentFlags = getRcChecklistFlags(item);
      const nextFlags = { ...currentFlags, [flag]: !currentFlags[flag] };
      return {
        ...item,
        ...nextFlags,
        status: formatRcChecklistSummary(nextFlags),
      };
    });
    persistCustomRcItems(nextItems);
  };

  const handleRemoveCustomItem = (id: string) => {
    persistCustomRcItems(customRcItems.filter((item) => item.id !== id));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col divide-y divide-slate-200">
      {/* Header Summary */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
          <div>
            <span className="font-mono">{proposal.kodeUsulan}</span>
            <span aria-hidden="true"> · </span>
            <span>{SEKTOR_SHORT_LABELS[proposal.sektor]}</span>
            <span aria-hidden="true"> · </span>
            <span>{proposal.skemaKontrak}</span>
          </div>
          {proposal.templateDetails?.statusManual?.trim() && (
            <span className="font-medium text-slate-700">
              {proposal.templateDetails.statusManual.trim()}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
          {proposal.namaProgram}
        </h3>

        <p className="text-xs text-slate-600">
          <span>{proposal.kabupatenKota}</span>
          <span aria-hidden="true"> · </span>
          <span>{proposal.kecamatanKawasan}</span>
          <span aria-hidden="true"> · </span>
          <span>{proposal.sumberDana}</span>
        </p>

        {/* Action Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreview(proposal.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Usulan</span>
          </button>

          {onFocusOnMap && (
            <button
              type="button"
              onClick={() => onFocusOnMap(proposal.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Fokus Peta</span>
            </button>
          )}

          {canEdit && !proposal.isLocked && onStartPickCoordinate && (
            <button
              type="button"
              onClick={() => onStartPickCoordinate(proposal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Plot Titik di Peta</span>
            </button>
          )}

          {canEdit && canManageSelected && (
            <button
              type="button"
              onClick={() => onEdit(proposal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {canEdit && canManageSelected && (
            <button
              type="button"
              onClick={() => onDelete(proposal.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ml-auto"
              title="Hapus usulan program"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Year Pagu Breakdown 2027-2030 */}
      <div className="p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-900">
            Pagu Anggaran Indikatif ({formatActiveYears(proposal.pagu)})
          </h4>
          <span className="font-mono text-sm font-semibold tabular-nums text-blue-700">
            {formatRpMiliar(totalPagu)}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              { year: '2027', val: proposal.pagu.y2027 },
              { year: '2028', val: proposal.pagu.y2028 },
              { year: '2029', val: proposal.pagu.y2029 },
              { year: '2030', val: proposal.pagu.y2030 },
            ] as const
          ).map((item) => (
            <div
              key={item.year}
              className={`py-2 px-1.5 rounded-lg border ${
                item.val > 0
                  ? 'border-blue-200 bg-blue-50/50 text-slate-900'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <div className="text-[11px] font-medium">TA {item.year}</div>
              <div className="font-mono text-xs font-semibold tabular-nums mt-0.5">
                {item.val > 0 ? `${item.val.toFixed(1)} M` : '—'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Output</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {proposal.templateDetails?.outputTambahan?.trim() ||
                (proposal.volumeTarget > 0
                  ? `${proposal.volumeTarget} ${proposal.satuanTarget}`
                  : '—')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Outcome</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {proposal.templateDetails?.outcomeTambahan?.trim() ||
                (proposal.penerimaManfaatJiwa > 0
                  ? `${proposal.penerimaManfaatJiwa.toLocaleString('id-ID')} Jiwa`
                  : '—')}
            </span>
          </div>
        </div>
      </div>

      {/* Spatial Metadata & Attribution */}
      <div className="p-5">
        <h4 className="text-xs font-semibold text-slate-900 mb-2">Atribut & Referensi Wilayah Usulan</h4>
        {position ? (
          <div className="text-xs space-y-1 text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Koordinat Geografis</span>
              <span className="font-mono tabular-nums text-slate-900 font-medium">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Radius Layanan Spasial</span>
              <span className="font-mono tabular-nums text-slate-900">
                {proposal.serviceRadiusKm.toFixed(1)} km
              </span>
            </div>
            {proposal.corridorGroup && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Integrasi Koridor</span>
                <span className="text-slate-900 font-medium">{proposal.corridorGroup}</span>
              </div>
            )}
            {addressText && (
              <div className="pt-1.5 text-slate-600">
                <span className="text-slate-500 block">Referensi Wilayah:</span>
                <span>{addressText}</span>
                <div className="text-[11px] text-slate-400 mt-0.5">OpenStreetMap</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {canEdit
              ? 'Koordinat sedang disinkronkan atau belum ditentukan. Gunakan tombol Plot Titik di Peta untuk menetapkan posisi presisi.'
              : 'Koordinat lokasi sedang disinkronkan dari referensi geospasial wilayah.'}
          </p>
        )}
      </div>

      {/* Interactive or Read-Only Readiness Criteria Checklist */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-semibold text-slate-900">
            Verifikasi Readiness Criteria (RC)
          </h4>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">
            Skor RC: {rcScore.percentage}% · {rcScore.completed}/{rcScore.total} Dok
          </span>
        </div>

        {canEdit && !proposal.isLocked && (
          <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <label
              htmlFor="detail-manual-rc-input"
              className="text-xs font-medium text-slate-700"
            >
              Skor RC Manual (0–100%)
            </label>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-white border border-slate-300 rounded-md px-2 py-1 focus-within:border-blue-700 w-20">
                <input
                  id="detail-manual-rc-input"
                  type="text"
                  inputMode="decimal"
                  value={rcDraft}
                  onChange={(e) => {
                    setRcDraft(e.target.value);
                    setRcDirty(true);
                  }}
                  onBlur={handleSaveManualRc}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-xs font-mono font-semibold tabular-nums text-right text-slate-900 bg-transparent focus:outline-none"
                />
                <span className="text-[11px] font-mono text-slate-500 ml-1">%</span>
              </div>
              <button
                type="button"
                onClick={handleSaveManualRc}
                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {RC_ITEMS.map((item) => {
            const checked = proposal.readiness[item.key];
            if (!canEdit || proposal.isLocked) {
              return (
                <div
                  key={item.key}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left"
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium ${
                        checked ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onToggleReadiness(proposal.id, item.key)}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                {checked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div
                    className={`text-xs font-medium ${
                      checked ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dokumen Readiness Criteria Tambahan & Tombol Isian Baru */}
        {(customRcItems.length > 0 || (canEdit && canManageSelected && !proposal.isLocked && onSaveProposal)) && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-700">
                Dokumen RC Tambahan ({customRcItems.length})
              </span>
              {canEdit && canManageSelected && !proposal.isLocked && onSaveProposal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomRc((prev) => !prev);
                    setNewRcError(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showAddCustomRc ? 'Tutup Form' : 'Tambah Isian Baru RC'}</span>
                </button>
              )}
            </div>

            {customRcItems.length > 0 && (
              <div className="space-y-2">
                {customRcItems.map((item, idx) => {
                  const flags = getRcChecklistFlags(item);
                  const canMutateCustom = Boolean(
                    canEdit && canManageSelected && !proposal.isLocked && onSaveProposal
                  );
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {idx + 6}. {item.namaDokumen}
                          </div>
                          {item.acuanStandar && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Acuan: {item.acuanStandar}
                            </div>
                          )}
                        </div>
                        {canMutateCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(item.id)}
                            title={`Hapus "${item.namaDokumen}"`}
                            aria-label={`Hapus ${item.namaDokumen}`}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        {(
                          [
                            { key: 'ada', label: 'Ada', accent: 'text-emerald-700 accent-emerald-700' },
                            { key: 'kurang', label: 'Kurang', accent: 'text-amber-700 accent-amber-600' },
                            { key: 'sesuai', label: 'Sesuai', accent: 'text-blue-700 accent-blue-700' },
                          ] as const
                        ).map((col) => (
                          <label
                            key={col.key}
                            className={`inline-flex items-center gap-1 font-medium ${col.accent.split(' ')[0]} ${
                              canMutateCustom ? 'cursor-pointer' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={flags[col.key]}
                              disabled={!canMutateCustom}
                              onChange={() => handleToggleCustomFlag(item.id, col.key)}
                              className={`w-3.5 h-3.5 rounded border-slate-300 ${col.accent}`}
                            />
                            <span>{col.label}</span>
                          </label>
                        ))}
                      </div>

                      {item.keterangan && (
                        <div className="text-[11px] text-slate-600">{item.keterangan}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {showAddCustomRc && canEdit && canManageSelected && !proposal.isLocked && onSaveProposal && (
              <form
                onSubmit={handleAddCustomRc}
                className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 space-y-2.5"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Dokumen Readiness Criteria <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRcNama}
                    onChange={(e) => {
                      setNewRcNama(e.target.value);
                      if (newRcError) setNewRcError(null);
                    }}
                    placeholder="Contoh: Surat Rekomendasi Teknis..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Acuan / Standar Kelengkapan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newRcAcuan}
                    onChange={(e) => setNewRcAcuan(e.target.value)}
                    placeholder="Standar / dasar kelengkapan..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px]">
                  <label className="inline-flex items-center gap-1 font-medium text-emerald-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRcAda}
                      onChange={(e) => setNewRcAda(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-emerald-700"
                    />
                    <span>Ada</span>
                  </label>
                  <label className="inline-flex items-center gap-1 font-medium text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRcKurang}
                      onChange={(e) => setNewRcKurang(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-amber-600"
                    />
                    <span>Kurang</span>
                  </label>
                  <label className="inline-flex items-center gap-1 font-medium text-blue-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRcSesuai}
                      onChange={(e) => setNewRcSesuai(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-blue-700"
                    />
                    <span>Sesuai</span>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Keterangan Verifikasi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newRcKeterangan}
                    onChange={(e) => setNewRcKeterangan(e.target.value)}
                    placeholder="Keterangan kondisi dokumen..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                  />
                </div>
                {newRcError && (
                  <div className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded">
                    {newRcError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomRc(false);
                      setNewRcError(null);
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Simpan Dokumen RC</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {proposal.templateDetails?.linkDataRc?.trim() && (() => {
          const rawLink = proposal.templateDetails.linkDataRc.trim();
          const safeHref =
            !/^(javascript|data|vbscript):/i.test(rawLink) && !/\s/.test(rawLink)
              ? /^https?:\/\//i.test(rawLink)
                ? rawLink
                : rawLink.includes('.')
                  ? `https://${rawLink}`
                  : null
              : null;
          return (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800 shrink-0">Link Data RC:</span>
              {safeHref ? (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline truncate max-w-[230px]"
                  title={rawLink}
                >
                  <span className="truncate">{rawLink}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-600 truncate">{rawLink}</span>
              )}
            </div>
          );
        })()}

        {proposal.catatanTeknis && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-medium text-slate-800">Catatan Sinkronisasi Balai: </span>
            {proposal.catatanTeknis}
          </div>
        )}

        {canEdit && canManageSelected && !proposal.isLocked && onSaveProposal && (
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                const parsed = Number(rcDraft);
                const nextRc =
                  rcDraft.trim() !== '' && !Number.isNaN(parsed)
                    ? Math.min(100, Math.max(0, Number(parsed.toFixed(1))))
                    : rcScore.percentage;
                setRcDraft(String(nextRc));
                setRcDirty(false);
                onSaveProposal({
                  ...proposal,
                  skorRc: nextRc,
                  updatedAt: new Date().toISOString().slice(0, 10),
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
