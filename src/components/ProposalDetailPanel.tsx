import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Crosshair,
  Edit3,
  Eye,
  LocateFixed,
  AlertTriangle,
  Clock,
  Plus,
  Save,
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
import {
  ReadinessCriteria,
  ResolvedPlaceInfo,
  StatusVerifikasi,
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

function renderVerificationStatus(status: StatusVerifikasi) {
  if (status === StatusVerifikasi.TERVERIFIKASI) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (status === StatusVerifikasi.REVISI_RC) {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

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

  useEffect(() => {
    setRcDraft(String(currentRcPercentage));
    setRcDirty(false);
  }, [proposal?.id, currentRcPercentage]);

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
          {renderVerificationStatus(proposal.statusVerifikasi)}
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
