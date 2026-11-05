import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Save, Search, Trash2, X } from 'lucide-react';
import {
  deriveReadinessFromRcTable,
  formatRpMiliar,
  getReadinessScore,
  KEMENPU_RC_ROWS,
  resolveProposalTemplateDetails,
} from '../data/initialProposals';
import { PlaceSuggestionItem, useModernPlaceAutocomplete } from '../hooks/useSpatialResolver';
import {
  LatLngPoint,
  ProposalTemplateDetails,
  RcDocKey,
  RcDocumentEntry,
  ReadinessCriteria,
  ResolvedPlaceInfo,
  SektorCiptaKarya,
  StatusVerifikasi,
  SumberDana,
  UsulanProgram,
} from '../types/ciptaKarya';
import { compressUploadedImageFile } from './ProposalPreviewModal';

interface ProposalFormDrawerProps {
  isOpen: boolean;
  editingProposal: UsulanProgram | null;
  existingResolvedPosition?: LatLngPoint;
  totalCount: number;
  onClose: () => void;
  onSave: (
    proposal: UsulanProgram,
    resolvedFromSearch?: ResolvedPlaceInfo,
    keepOpen?: boolean
  ) => void;
  onAutoSave?: (proposal: UsulanProgram, resolvedFromSearch?: ResolvedPlaceInfo) => void;
  onRequestDelete?: (proposal: UsulanProgram) => void;
}

const DEFAULT_READINESS: ReadinessCriteria = {
  dokumenPerencanaan: false,
  dedRab: false,
  kesiapanLahan: false,
  dokumenLingkungan: false,
  lembagaPengelola: false,
};

function createEmptyRcTable(): Record<RcDocKey, RcDocumentEntry> {
  return {
    rencanaInduk: { status: '', keterangan: '' },
    studiKelayakan: { status: '', keterangan: '' },
    suratMinatKepalaDaerah: { status: '', keterangan: '' },
    sertifikatLahan: { status: '', keterangan: '' },
    ded: { status: '', keterangan: '' },
    rab: { status: '', keterangan: '' },
    dokumenLingkungan: { status: '', keterangan: '' },
    lainnya: {
      customLabel: 'Lainnya.....(silakan tambahkan)',
      status: '',
      keterangan: '',
    },
  };
}

export const ProposalFormDrawer: React.FC<ProposalFormDrawerProps> = ({
  isOpen,
  editingProposal,
  existingResolvedPosition,
  totalCount,
  onClose,
  onSave,
  onAutoSave,
  onRequestDelete,
}) => {
  const [kodeUsulan, setKodeUsulan] = useState('');
  const [namaProgram, setNamaProgram] = useState('');
  const [sektor, setSektor] = useState<SektorCiptaKarya>(SektorCiptaKarya.AIR_MINUM);
  const [kabupatenKota, setKabupatenKota] = useState('Kota Mataram');
  const [provinsi, setProvinsi] = useState('Nusa Tenggara Barat');
  const [kecamatanKawasan, setKecamatanKawasan] = useState('');
  const [locationSearchInput, setLocationSearchInput] = useState('');
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [pickedAddress, setPickedAddress] = useState<string>('');

  // KEMENPU Executive Slide Narrative & Scope Fields
  const [latarBelakang, setLatarBelakang] = useState('');
  const [dasarPenugasan, setDasarPenugasan] = useState('');
  const [prioritasNasional, setPrioritasNasional] = useState(
    'PN 2 · Layanan Dasar Infrastruktur Permukiman'
  );
  const [manfaatKegiatan, setManfaatKegiatan] = useState('');
  const [lingkupText, setLingkupText] = useState('');

  // Budget & Multi-year Pagu
  const [sumberDana, setSumberDana] = useState<SumberDana>(SumberDana.APBN_RM);
  const [skemaKontrak, setSkemaKontrak] = useState<'SYC' | 'MYC'>('MYC');
  const [pagu2027, setPagu2027] = useState<string>('25');
  const [pagu2028, setPagu2028] = useState<string>('40');
  const [pagu2029, setPagu2029] = useState<string>('0');
  const [pagu2030, setPagu2030] = useState<string>('0');
  const [biayaFisikMiliar, setBiayaFisikMiliar] = useState<string>('61.75');
  const [biayaSupervisiMiliar, setBiayaSupervisiMiliar] = useState<string>('3.25');

  // Schedule & Output / Outcome
  const [durasiHari, setDurasiHari] = useState<string>('540');
  const [durasiBulan, setDurasiBulan] = useState<string>('18');
  const [waktuMulai, setWaktuMulai] = useState<string>('Januari 2027');
  const [waktuSelesai, setWaktuSelesai] = useState<string>('Juni 2028');
  const [volumeTarget, setVolumeTarget] = useState<string>('100');
  const [satuanTarget, setSatuanTarget] = useState<string>('Liter/detik');
  const [outputTambahan, setOutputTambahan] = useState<string>('');
  const [penerimaManfaatJiwa, setPenerimaManfaatJiwa] = useState<string>('25000');
  const [outcomeTambahan, setOutcomeTambahan] = useState<string>('');

  // Spatial Context & Location Image
  const [serviceRadiusKm, setServiceRadiusKm] = useState<string>('4.0');
  const [corridorGroup, setCorridorGroup] = useState<string>('');
  const [deskripsiLokasi, setDeskripsiLokasi] = useState<string>('');
  const [lokasiGambarUrl, setLokasiGambarUrl] = useState<string | undefined>(undefined);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Readiness Criteria (8-Row KEMENPU Table + Score)
  const [statusVerifikasi, setStatusVerifikasi] = useState<StatusVerifikasi>(
    StatusVerifikasi.MENUNGGU_KONREG
  );
  const [skorRcInput, setSkorRcInput] = useState<string>('80');
  const [readiness, setReadiness] = useState<ReadinessCriteria>(DEFAULT_READINESS);
  const [rcTable, setRcTable] = useState<Record<RcDocKey, RcDocumentEntry>>(createEmptyRcTable);
  const [catatanTeknis, setCatatanTeknis] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [editVersion, setEditVersion] = useState<number>(0);
  const [autoSaveNote, setAutoSaveNote] = useState<string | null>(null);

  const hydratedSessionRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const markFieldEdited = useCallback(() => {
    setEditVersion((v) => v + 1);
  }, []);

  const { suggestions, isLoading, selectSuggestion, clearSuggestions } =
    useModernPlaceAutocomplete(locationSearchInput);

  useEffect(() => {
    if (!isOpen) {
      hydratedSessionRef.current = null;
      setEditVersion(0);
      setAutoSaveNote(null);
      setImageUploadError(null);
      return;
    }

    const sessionKey = editingProposal ? `edit:${editingProposal.id}` : 'create:new';
    if (hydratedSessionRef.current === sessionKey) {
      return;
    }
    hydratedSessionRef.current = sessionKey;
    setFormError(null);
    setImageUploadError(null);
    setEditVersion(0);
    setAutoSaveNote(null);

    if (editingProposal) {
      const currentPos = editingProposal.manualPosition ?? existingResolvedPosition;
      const tpl = resolveProposalTemplateDetails(editingProposal);
      setKodeUsulan(editingProposal.kodeUsulan);
      setNamaProgram(editingProposal.namaProgram);
      setSektor(editingProposal.sektor);
      setKabupatenKota(editingProposal.kabupatenKota);
      setProvinsi(tpl.provinsi);
      setKecamatanKawasan(editingProposal.kecamatanKawasan);
      setLocationSearchInput(editingProposal.locationQuery);
      setLatInput(currentPos ? String(currentPos.lat) : '');
      setLngInput(currentPos ? String(currentPos.lng) : '');
      setPickedAddress(editingProposal.manualAddressLabel ?? '');

      setLatarBelakang(tpl.latarBelakang);
      setDasarPenugasan(tpl.dasarPenugasan);
      setPrioritasNasional(editingProposal.prioritasNasional);
      setManfaatKegiatan(tpl.manfaatKegiatan);
      setLingkupText(tpl.lingkupPekerjaan.join('\n'));

      setSumberDana(editingProposal.sumberDana);
      setSkemaKontrak(editingProposal.skemaKontrak);
      setPagu2027(String(editingProposal.pagu.y2027));
      setPagu2028(String(editingProposal.pagu.y2028));
      setPagu2029(String(editingProposal.pagu.y2029));
      setPagu2030(String(editingProposal.pagu.y2030));
      setBiayaFisikMiliar(String(tpl.biayaFisikMiliar));
      setBiayaSupervisiMiliar(String(tpl.biayaSupervisiMiliar));

      setDurasiHari(String(tpl.durasiHari));
      setDurasiBulan(String(tpl.durasiBulan));
      setWaktuMulai(tpl.waktuMulai);
      setWaktuSelesai(tpl.waktuSelesai);
      setVolumeTarget(String(editingProposal.volumeTarget));
      setSatuanTarget(editingProposal.satuanTarget);
      setOutputTambahan(tpl.outputTambahan);
      setPenerimaManfaatJiwa(String(editingProposal.penerimaManfaatJiwa));
      setOutcomeTambahan(tpl.outcomeTambahan);

      setServiceRadiusKm(String(editingProposal.serviceRadiusKm));
      setCorridorGroup(editingProposal.corridorGroup ?? '');
      setDeskripsiLokasi(tpl.deskripsiLokasi);
      setLokasiGambarUrl(tpl.lokasiGambarUrl);

      setStatusVerifikasi(editingProposal.statusVerifikasi);
      setSkorRcInput(
        String(getReadinessScore(editingProposal.readiness, editingProposal.skorRc).percentage)
      );
      setReadiness(editingProposal.readiness);
      setRcTable(tpl.rcDetails);
      setCatatanTeknis(editingProposal.catatanTeknis);
    } else {
      const nextNum = String(totalCount + 1).padStart(3, '0');
      setKodeUsulan(`CK-NTB-27-${nextNum}`);
      setNamaProgram('');
      setSektor(SektorCiptaKarya.AIR_MINUM);
      setKabupatenKota('Kota Mataram');
      setProvinsi('Nusa Tenggara Barat');
      setKecamatanKawasan('');
      setLocationSearchInput('');
      setLatInput('');
      setLngInput('');
      setPickedAddress('');

      setLatarBelakang('');
      setDasarPenugasan(
        'Sinkronisasi Program Infrastruktur Cipta Karya BPBPK Nusa Tenggara Barat TA 2027–2030'
      );
      setPrioritasNasional('PN 2 · Layanan Dasar Infrastruktur Permukiman');
      setManfaatKegiatan('');
      setLingkupText('');

      setSumberDana(SumberDana.APBN_RM);
      setSkemaKontrak('MYC');
      setPagu2027('30');
      setPagu2028('45');
      setPagu2029('0');
      setPagu2030('0');
      setBiayaFisikMiliar('71.25');
      setBiayaSupervisiMiliar('3.75');

      setDurasiHari('540');
      setDurasiBulan('18');
      setWaktuMulai('Januari 2027');
      setWaktuSelesai('Juni 2028');
      setVolumeTarget('100');
      setSatuanTarget('Liter/detik');
      setOutputTambahan('');
      setPenerimaManfaatJiwa('30000');
      setOutcomeTambahan('');

      setServiceRadiusKm('4.0');
      setCorridorGroup('');
      setDeskripsiLokasi('');
      setLokasiGambarUrl(undefined);

      setStatusVerifikasi(StatusVerifikasi.MENUNGGU_KONREG);
      setSkorRcInput('80');
      setReadiness(DEFAULT_READINESS);
      setRcTable(createEmptyRcTable());
      setCatatanTeknis('');
    }
  }, [isOpen, editingProposal, existingResolvedPosition, totalCount]);

  const liveTotalPagu = useMemo(() => {
    return (
      Math.max(0, Number(pagu2027) || 0) +
      Math.max(0, Number(pagu2028) || 0) +
      Math.max(0, Number(pagu2029) || 0) +
      Math.max(0, Number(pagu2030) || 0)
    );
  }, [pagu2027, pagu2028, pagu2029, pagu2030]);

  const buildValidatedProposal = useCallback(():
    | {
        ok: true;
        proposal: UsulanProgram;
        resolvedObj?: ResolvedPlaceInfo;
      }
    | {
        ok: false;
        error: string;
      } => {
    if (!namaProgram.trim()) {
      return { ok: false, error: 'Nama usulan kegiatan wajib diisi.' };
    }

    const y2027 = Math.max(0, Number(pagu2027) || 0);
    const y2028 = Math.max(0, Number(pagu2028) || 0);
    const y2029 = Math.max(0, Number(pagu2029) || 0);
    const y2030 = Math.max(0, Number(pagu2030) || 0);

    if (y2027 + y2028 + y2029 + y2030 <= 0) {
      return {
        ok: false,
        error: 'Minimal satu Tahun Anggaran (2027–2030) harus memiliki nilai pagu > 0.',
      };
    }

    const parsedSkorRc = Number(skorRcInput);
    if (
      skorRcInput.trim() === '' ||
      Number.isNaN(parsedSkorRc) ||
      parsedSkorRc < 0 ||
      parsedSkorRc > 100
    ) {
      return {
        ok: false,
        error: 'Skor Readiness Criteria (RC) wajib diisi angka manual antara 0 hingga 100%.',
      };
    }

    let parsedManualPosition: LatLngPoint | undefined = undefined;
    if (latInput.trim() !== '' || lngInput.trim() !== '') {
      if (latInput.trim() === '' || lngInput.trim() === '') {
        return {
          ok: false,
          error: 'Koordinat Latitude dan Longitude harus diisi keduanya atau dikosongkan keduanya.',
        };
      }
      const latNum = Number(latInput);
      const lngNum = Number(lngInput);
      if (
        Number.isNaN(latNum) ||
        Number.isNaN(lngNum) ||
        latNum < -90 ||
        latNum > 90 ||
        lngNum < -180 ||
        lngNum > 180
      ) {
        return {
          ok: false,
          error:
            'Nilai koordinat Latitude (-90 s.d. 90) atau Longitude (-180 s.d. 180) tidak valid.',
        };
      }
      parsedManualPosition = {
        lat: Number(latNum.toFixed(6)),
        lng: Number(lngNum.toFixed(6)),
      };
    }

    const effectiveProvinsi = provinsi.trim() || 'Nusa Tenggara Barat';
    const effectiveQuery =
      locationSearchInput.trim() ||
      `${kecamatanKawasan.trim()} ${kabupatenKota.trim()}, ${effectiveProvinsi}, Indonesia`.trim();

    const parsedLingkup = lingkupText
      .split('\n')
      .map((line) => line.replace(/^[-*•☐✓]\s*/, '').trim())
      .filter(Boolean);

    const totalPaguSum = Number((y2027 + y2028 + y2029 + y2030).toFixed(2));
    const parsedFisik =
      biayaFisikMiliar.trim() !== ''
        ? Math.max(0, Number(biayaFisikMiliar) || 0)
        : Number((totalPaguSum * 0.95).toFixed(2));
    const parsedSupervisi =
      biayaSupervisiMiliar.trim() !== ''
        ? Math.max(0, Number(biayaSupervisiMiliar) || 0)
        : Number(Math.max(0, totalPaguSum - parsedFisik).toFixed(2));

    const parsedBulan = Math.max(1, Math.round(Number(durasiBulan) || 12));
    const parsedHari = Math.max(1, Math.round(Number(durasiHari) || parsedBulan * 30));

    const templateDetails: ProposalTemplateDetails = {
      provinsi: effectiveProvinsi,
      latarBelakang: latarBelakang.trim(),
      dasarPenugasan: dasarPenugasan.trim(),
      manfaatKegiatan: manfaatKegiatan.trim(),
      lingkupPekerjaan: parsedLingkup,
      biayaFisikMiliar: Number(parsedFisik.toFixed(2)),
      biayaSupervisiMiliar: Number(parsedSupervisi.toFixed(2)),
      durasiHari: parsedHari,
      durasiBulan: parsedBulan,
      waktuMulai: waktuMulai.trim() || '-',
      waktuSelesai: waktuSelesai.trim() || '-',
      outputTambahan: outputTambahan.trim(),
      outcomeTambahan: outcomeTambahan.trim(),
      deskripsiLokasi: deskripsiLokasi.trim(),
      lokasiGambarUrl,
      rcDetails: rcTable,
    };

    const derivedReadiness = deriveReadinessFromRcTable(rcTable, readiness);

    const savedProposal: UsulanProgram = {
      id: editingProposal?.id ?? `usulan-${Date.now()}`,
      kodeUsulan: kodeUsulan.trim() || `CK-NTB-27-${String(totalCount + 1).padStart(3, '0')}`,
      namaProgram: namaProgram.trim(),
      sektor,
      kabupatenKota: kabupatenKota.trim() || 'Kota Mataram',
      kecamatanKawasan: kecamatanKawasan.trim() || kabupatenKota.trim() || 'Kawasan Prioritas',
      locationQuery: effectiveQuery,
      manualPosition: parsedManualPosition,
      manualAddressLabel: pickedAddress || undefined,
      volumeTarget: Math.max(0.1, Number(volumeTarget) || 1),
      satuanTarget: satuanTarget.trim() || 'Unit',
      penerimaManfaatJiwa: Math.max(0, Math.round(Number(penerimaManfaatJiwa) || 0)),
      sumberDana,
      skemaKontrak,
      pagu: { y2027, y2028, y2029, y2030 },
      skorRc: Number(parsedSkorRc.toFixed(1)),
      readiness: derivedReadiness,
      statusVerifikasi,
      prioritasNasional: prioritasNasional.trim() || 'PN 2 · Layanan Dasar Infrastruktur',
      serviceRadiusKm: Math.max(0.5, Number(serviceRadiusKm) || 3.5),
      corridorGroup: corridorGroup.trim() || undefined,
      catatanTeknis:
        catatanTeknis.trim() || deskripsiLokasi.trim() || latarBelakang.trim() || '-',
      templateDetails,
      updatedAt: new Date().toISOString().slice(0, 10),
      authorUid: editingProposal?.authorUid,
      isLocked: editingProposal?.isLocked,
      isPublished: editingProposal?.isPublished ?? true,
    };

    const resolvedObj: ResolvedPlaceInfo | undefined = parsedManualPosition
      ? {
          position: parsedManualPosition,
          displayName: savedProposal.kecamatanKawasan,
          formattedAddress: pickedAddress || effectiveQuery,
          source: 'nominatim',
        }
      : undefined;

    return { ok: true, proposal: savedProposal, resolvedObj };
  }, [
    namaProgram,
    pagu2027,
    pagu2028,
    pagu2029,
    pagu2030,
    skorRcInput,
    latInput,
    lngInput,
    provinsi,
    locationSearchInput,
    kecamatanKawasan,
    kabupatenKota,
    lingkupText,
    biayaFisikMiliar,
    biayaSupervisiMiliar,
    durasiBulan,
    durasiHari,
    latarBelakang,
    dasarPenugasan,
    manfaatKegiatan,
    waktuMulai,
    waktuSelesai,
    outputTambahan,
    outcomeTambahan,
    deskripsiLokasi,
    lokasiGambarUrl,
    rcTable,
    readiness,
    editingProposal,
    kodeUsulan,
    totalCount,
    sektor,
    pickedAddress,
    volumeTarget,
    satuanTarget,
    penerimaManfaatJiwa,
    sumberDana,
    skemaKontrak,
    statusVerifikasi,
    prioritasNasional,
    serviceRadiusKm,
    corridorGroup,
    catatanTeknis,
  ]);

  // Debounced auto-save when editing an existing proposal
  useEffect(() => {
    if (!isOpen || !editingProposal || !onAutoSave || editVersion === 0) return;

    const timer = window.setTimeout(() => {
      const result = buildValidatedProposal();
      if (!result.ok) return;
      setFormError(null);
      onAutoSave(result.proposal, result.resolvedObj);
      setAutoSaveNote('Tersimpan otomatis');
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isOpen, editingProposal, onAutoSave, editVersion, buildValidatedProposal]);

  if (!isOpen) return null;

  const handleChooseSuggestion = async (item: PlaceSuggestionItem) => {
    const resolved = await selectSuggestion(item);
    setLocationSearchInput(item.label);
    clearSuggestions();
    if (resolved) {
      setLatInput(String(Number(resolved.position.lat.toFixed(6))));
      setLngInput(String(Number(resolved.position.lng.toFixed(6))));
      setPickedAddress(resolved.formattedAddress);
      if (!kecamatanKawasan.trim()) {
        setKecamatanKawasan(resolved.displayName);
      }
    }
    markFieldEdited();
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageUploadError(null);
    try {
      const dataUrl = await compressUploadedImageFile(file);
      setLokasiGambarUrl(dataUrl);
      markFieldEdited();
    } catch (err) {
      setImageUploadError(
        err instanceof Error ? err.message : 'Gagal memproses gambar lokasi kegiatan.'
      );
    }
  };

  const updateRcCell = (key: RcDocKey, field: keyof RcDocumentEntry, value: string) => {
    setRcTable((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
    markFieldEdited();
  };

  const triggerManualSave = (keepOpen: boolean) => {
    const result = buildValidatedProposal();
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    if (keepOpen) {
      setAutoSaveNote('Perubahan berhasil disimpan');
    }
    onSave(result.proposal, result.resolvedObj, keepOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerManualSave(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="drawer-title" className="text-base font-bold text-slate-900">
                {editingProposal
                  ? `Edit Usulan Kegiatan (${editingProposal.kodeUsulan})`
                  : 'Tambah Usulan Kegiatan (Format Template KEMENPU)'}
              </h2>
              {editingProposal && autoSaveNote && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{autoSaveNote}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Seluruh isian otomatis tampil sesuai tata letak lembar Preview Usulan KEMENPU
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingProposal ? 'Simpan Perubahan' : 'Simpan Usulan'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer shrink-0"
              aria-label="Tutup formulir"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {formError}
            </div>
          )}

          {/* 1. Header Usulan Kegiatan & Lokasi */}
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0b3c7c] border-b border-slate-200 pb-1.5">
              1. Identitas Usulan Kegiatan & Lokasi
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Usulan</label>
                <input
                  type="text"
                  value={kodeUsulan}
                  onChange={(e) => {
                    setKodeUsulan(e.target.value);
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sektor Cipta Karya
                </label>
                <select
                  value={sektor}
                  onChange={(e) => {
                    const val = e.target.value as SektorCiptaKarya;
                    setSektor(val);
                    if (!editingProposal) {
                      if (val === SektorCiptaKarya.AIR_MINUM) setSatuanTarget('Liter/detik');
                      if (val === SektorCiptaKarya.SANITASI)
                        setSatuanTarget('Sambungan Rumah (SR)');
                      if (val === SektorCiptaKarya.KAWASAN_STRATEGIS)
                        setSatuanTarget('Hektare (Ha)');
                      if (val === SektorCiptaKarya.BINA_PENATAAN_BANGUNAN)
                        setSatuanTarget('m² Bangunan');
                    }
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-700"
                >
                  {Object.values(SektorCiptaKarya).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Usulan Kegiatan
              </label>
              <input
                type="text"
                required
                value={namaProgram}
                onChange={(e) => {
                  setNamaProgram(e.target.value);
                  markFieldEdited();
                }}
                placeholder="Contoh: Pembangunan IPA & Jaringan Perpipaan SPAM IKK..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  Kabupaten/Kota, Provinsi & Koordinat Spasial
                </span>
                {(latInput || lngInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLatInput('');
                      setLngInput('');
                      setPickedAddress('');
                      markFieldEdited();
                    }}
                    className="text-[11px] text-blue-700 hover:underline cursor-pointer"
                  >
                    Reset ke Pencarian Otomatis
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={kabupatenKota}
                    onChange={(e) => {
                      setKabupatenKota(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="Contoh: Kab. Lombok Tengah"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={provinsi}
                    onChange={(e) => {
                      setProvinsi(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="Nusa Tenggara Barat"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Kecamatan / Kawasan</label>
                  <input
                    type="text"
                    value={kecamatanKawasan}
                    onChange={(e) => {
                      setKecamatanKawasan(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="Contoh: Kec. Praya Barat"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs text-slate-600 mb-1">
                  Cari Titik Lokasi pada Peta (OpenStreetMap)
                </label>
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-700">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={locationSearchInput}
                    onChange={(e) => {
                      setLocationSearchInput(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="Ketik nama kecamatan, kota, atau lokasi infrastruktur..."
                    className="w-full text-xs focus:outline-none bg-transparent"
                  />
                </div>

                {(suggestions.length > 0 || isLoading) && (
                  <div className="absolute left-0 right-0 top-14 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {isLoading && suggestions.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500">
                        Mencari lokasi pada peta...
                      </div>
                    ) : (
                      suggestions.map((item) => (
                        <button
                          key={item.placeId}
                          type="button"
                          onClick={() => void handleChooseSuggestion(item)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer"
                        >
                          <div className="font-medium text-slate-900">{item.displayName}</div>
                          <div className="text-[11px] text-slate-500 truncate">{item.label}</div>
                        </button>
                      ))
                    )}
                    <div className="px-3 py-1 bg-slate-50 text-[10px] text-slate-400 text-right">
                      OpenStreetMap
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Latitude (Opsional)</label>
                  <input
                    type="number"
                    step="any"
                    value={latInput}
                    onChange={(e) => {
                      setLatInput(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="Otomatis"
                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Longitude (Opsional)</label>
                  <input
                    type="number"
                    step="any"
                    value={lngInput}
                    onChange={(e) => {
                      setLngInput(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="Otomatis"
                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Radius Layanan (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="25"
                    value={serviceRadiusKm}
                    onChange={(e) => {
                      setServiceRadiusKm(e.target.value);
                      markFieldEdited();
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Koridor (Opsional)</label>
                  <input
                    type="text"
                    value={corridorGroup}
                    onChange={(e) => {
                      setCorridorGroup(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="SPAM Regional"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Gambaran Umum, Urgensi Strategis, & Lingkup Pekerjaan */}
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0b3c7c] border-b border-slate-200 pb-1.5">
              2. Gambaran Umum, Urgensi Strategis & Lingkup Pekerjaan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gambaran Umum — Latar Belakang
                </label>
                <textarea
                  rows={2}
                  value={latarBelakang}
                  onChange={(e) => {
                    setLatarBelakang(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Jelaskan latar belakang pelaksanaan kegiatan..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gambaran Umum — Dasar Penugasan
                </label>
                <textarea
                  rows={2}
                  value={dasarPenugasan}
                  onChange={(e) => {
                    setDasarPenugasan(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Dasar penugasan, dokumen perencanaan induk, atau arahan strategis..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Urgensi Strategis — Dukungan PN / PKPN / Prioritas Lainnya
                </label>
                <textarea
                  rows={2}
                  value={prioritasNasional}
                  onChange={(e) => {
                    setPrioritasNasional(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Jelaskan dukungan kegiatan terhadap PN, PKPN, dan/atau prioritas lainnya..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Urgensi Strategis — Manfaat Kegiatan
                </label>
                <textarea
                  rows={2}
                  value={manfaatKegiatan}
                  onChange={(e) => {
                    setManfaatKegiatan(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Jelaskan manfaat langsung kegiatan bagi wilayah & masyarakat..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Lingkup Pekerjaan (1 baris per rincian lingkup pekerjaan)
              </label>
              <textarea
                rows={3}
                value={lingkupText}
                onChange={(e) => {
                  setLingkupText(e.target.value);
                  markFieldEdited();
                }}
                placeholder={'Pembangunan Intake & IPA Kapasitas 100 L/detik\nPemasangan Jaringan Perpipaan Transmisi & Distribusi Utama\nPembangunan Reservoir Pelayanan'}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </section>

          {/* 3. Kebutuhan Anggaran & Rencana Pelaksanaan */}
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0b3c7c] border-b border-slate-200 pb-1.5">
              3. Kebutuhan Anggaran, Rencana Pelaksanaan & Output–Outcome
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  Kebutuhan Pagu Tahun Anggaran 2027–2030 (Rp Miliar)
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold tabular-nums text-blue-700">
                    Total Pagu: {formatRpMiliar(liveTotalPagu)}
                  </span>
                  <div className="inline-flex bg-white border border-slate-200 p-0.5 rounded-md">
                    {(['SYC', 'MYC'] as const).map((skema) => (
                      <button
                        key={skema}
                        type="button"
                        onClick={() => {
                          setSkemaKontrak(skema);
                          markFieldEdited();
                        }}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                          skemaKontrak === skema
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {skema}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'TA 2027', val: pagu2027, setter: setPagu2027 },
                  { label: 'TA 2028', val: pagu2028, setter: setPagu2028 },
                  { label: 'TA 2029', val: pagu2029, setter: setPagu2029 },
                  { label: 'TA 2030', val: pagu2030, setter: setPagu2030 },
                ].map((item) => (
                  <div key={item.label}>
                    <label className="block text-[11px] text-slate-600 mb-1">{item.label}</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.val}
                      onChange={(e) => {
                        item.setter(e.target.value);
                        markFieldEdited();
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Biaya Fisik (Rp Miliar)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={biayaFisikMiliar}
                    onChange={(e) => {
                      setBiayaFisikMiliar(e.target.value);
                      markFieldEdited();
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Manajemen Konstruksi / Supervisi (Rp Miliar)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={biayaSupervisiMiliar}
                    onChange={(e) => {
                      setBiayaSupervisiMiliar(e.target.value);
                      markFieldEdited();
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Sumber Pendanaan</label>
                  <select
                    value={sumberDana}
                    onChange={(e) => {
                      setSumberDana(e.target.value as SumberDana);
                      markFieldEdited();
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-700"
                  >
                    {Object.values(SumberDana).map((sd) => (
                      <option key={sd} value={sd}>
                        {sd}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Rencana Pelaksanaan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Durasi (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  value={durasiHari}
                  onChange={(e) => {
                    setDurasiHari(e.target.value);
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Durasi (Bulan)
                </label>
                <input
                  type="number"
                  min="1"
                  value={durasiBulan}
                  onChange={(e) => {
                    setDurasiBulan(e.target.value);
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Waktu Mulai
                </label>
                <input
                  type="text"
                  value={waktuMulai}
                  onChange={(e) => {
                    setWaktuMulai(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Contoh: Januari 2027"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Waktu Selesai
                </label>
                <input
                  type="text"
                  value={waktuSelesai}
                  onChange={(e) => {
                    setWaktuSelesai(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Contoh: Juni 2028"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* Output & Outcome */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Output Utama (Volume)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={volumeTarget}
                  onChange={(e) => {
                    setVolumeTarget(e.target.value);
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Satuan Output Utama
                </label>
                <input
                  type="text"
                  value={satuanTarget}
                  onChange={(e) => {
                    setSatuanTarget(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Liter/detik"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Output Kedua (Opsional)
                </label>
                <input
                  type="text"
                  value={outputTambahan}
                  onChange={(e) => {
                    setOutputTambahan(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Contoh: 5.000 Sambungan Rumah"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Outcome Utama — Penerima Manfaat (Jiwa)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={penerimaManfaatJiwa}
                  onChange={(e) => {
                    setPenerimaManfaatJiwa(e.target.value);
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Outcome Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={outcomeTambahan}
                  onChange={(e) => {
                    setOutcomeTambahan(e.target.value);
                    markFieldEdited();
                  }}
                  placeholder="Contoh: Peningkatan cakupan layanan air minum aman"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          </section>

          {/* 4. Gambaran Lokasi Kegiatan */}
          <section className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0b3c7c] border-b border-slate-200 pb-1.5">
              4. Gambaran Lokasi Kegiatan (Peta / Skema Jaringan)
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Keterangan Gambaran Lokasi / Kondisi Sistem Jaringan / Urgensitas Lokasi
              </label>
              <textarea
                rows={2}
                value={deskripsiLokasi}
                onChange={(e) => {
                  setDeskripsiLokasi(e.target.value);
                  markFieldEdited();
                }}
                placeholder="Gambaran lokasi kegiatan / kondisi sistem jaringan / kondisi awal vs rencana yang menjelaskan urgensitas kegiatan..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <div className="font-semibold text-slate-800">
                  Gambar Peta / Skema Jaringan Lokasi (Opsional)
                </div>
                <div className="text-[11px] text-slate-500">
                  Jika tidak diunggah, Preview Usulan otomatis menampilkan Peta GIS Interaktif.
                </div>
                {imageUploadError && (
                  <div className="text-[11px] text-red-700 mt-1">{imageUploadError}</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleImageFileSelect(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-blue-700" />
                  <span>{lokasiGambarUrl ? 'Ganti Gambar' : 'Unggah Gambar'}</span>
                </button>
                {lokasiGambarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLokasiGambarUrl(undefined);
                      markFieldEdited();
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    Hapus Gambar
                  </button>
                )}
              </div>
            </div>

            {lokasiGambarUrl && (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 max-h-48 flex items-center justify-center">
                <img
                  src={lokasiGambarUrl}
                  alt="Pratinjau skema lokasi kegiatan"
                  className="max-h-48 w-auto object-contain"
                />
              </div>
            )}
          </section>

          {/* 5. Tabel Status Readiness Criteria (RC) */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0b3c7c]">
                5. Status Readiness Criteria (RC) — 8 Dokumen Standar KEMENPU
              </div>
              <span className="text-[11px] text-slate-500">
                Isi kolom Status (mis. Lengkap / Proses / Belum) & Keterangan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status Sinkronisasi Konreg
                </label>
                <select
                  value={statusVerifikasi}
                  onChange={(e) => {
                    setStatusVerifikasi(e.target.value as StatusVerifikasi);
                    markFieldEdited();
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-700"
                >
                  {Object.values(StatusVerifikasi).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Skor Kesiapan RC (%)
                </label>
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-700">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                    value={skorRcInput}
                    onChange={(e) => {
                      setSkorRcInput(e.target.value);
                      markFieldEdited();
                    }}
                    placeholder="0 - 100"
                    className="w-full text-xs font-mono font-semibold tabular-nums text-slate-900 bg-transparent focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-500 ml-1.5 select-none">%</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-2 px-3 w-[38%]">Dokumen</th>
                    <th className="py-2 px-3 w-[24%] border-l border-slate-200">Status</th>
                    <th className="py-2 px-3 border-l border-slate-200">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {KEMENPU_RC_ROWS.map((row) => {
                    const entry = rcTable[row.key] ?? { status: '', keterangan: '' };
                    return (
                      <tr key={row.key}>
                        <td className="py-1.5 px-3 text-slate-800 align-middle">
                          {row.key === 'lainnya' ? (
                            <input
                              type="text"
                              value={entry.customLabel ?? row.defaultLabel}
                              onChange={(e) =>
                                updateRcCell('lainnya', 'customLabel', e.target.value)
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-700"
                            />
                          ) : (
                            <span>{row.defaultLabel}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 border-l border-slate-200 align-middle">
                          <input
                            type="text"
                            value={entry.status}
                            onChange={(e) => updateRcCell(row.key, 'status', e.target.value)}
                            placeholder="Lengkap / Proses / -"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-700"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-l border-slate-200 align-middle">
                          <input
                            type="text"
                            value={entry.keterangan}
                            onChange={(e) => updateRcCell(row.key, 'keterangan', e.target.value)}
                            placeholder={row.placeholderNote}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-700"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catatan Verifikasi Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={catatanTeknis}
                onChange={(e) => {
                  setCatatanTeknis(e.target.value);
                  markFieldEdited();
                }}
                placeholder="Catatan tindak lanjut Konreg atau sinkronisasi lintas sektor..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </section>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {editingProposal && onRequestDelete ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestDelete(editingProposal);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Usulan</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              Batal
            </button>
            {editingProposal && (
              <button
                type="button"
                onClick={() => triggerManualSave(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingProposal ? 'Simpan Perubahan' : 'Simpan Usulan Baru'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
