import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  ImagePlus,
  ListChecks,
  LocateFixed,
  MapPin,
  PenLine,
  PieChart,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Square,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  exportProposalProfilePdf,
  ProposalProfilePdfInput,
} from '../utils/exportProposalProfilePdf';
import { PdfSignatoriesConfig } from '../utils/exportRcInfographicPdf';
import {
  getCachedPuWordmarkDataUrl,
  loadPuBatikAssets,
  loadPuWordmarkDataUrl,
  PU_WORDMARK_SRC,
} from '../utils/puLogoAsset';
import { ProposalPdfPreviewOverlay } from './ProposalPdfPreviewOverlay';
import {
  buildSpatialGeoJsonLayers,
  deriveReadinessFromRcTable,
  formatActiveYears,
  formatRcChecklistSummary,
  getRcChecklistFlags,
  getReadinessScore,
  getTotalPaguUsulan,
  KEMENPU_RC_ROWS,
  resolveProposalTemplateDetails,
  tryParseNumberFlexible,
} from '../data/initialProposals';
import {
  CustomRcDocumentEntry,
  LatLngPoint,
  ProposalTemplateDetails,
  RcDocKey,
  RcDocumentEntry,
  ReadinessCriteria,
  ResolvedPlaceInfo,
  SektorCiptaKarya,
  UsulanProgram,
} from '../types/ciptaKarya';

export async function compressUploadedImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        const maxWidth = 920;
        const maxHeight = 620;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses kanvas gambar.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function getSektorMarkerBadge(sektor: SektorCiptaKarya): { code: string; bgHex: string } {
  switch (sektor) {
    case SektorCiptaKarya.AIR_MINUM:
      return { code: 'AM', bgHex: '#1d4ed8' };
    case SektorCiptaKarya.SANITASI:
      return { code: 'SAN', bgHex: '#0f766e' };
    case SektorCiptaKarya.KAWASAN_STRATEGIS:
      return { code: 'PKS', bgHex: '#d97706' };
    case SektorCiptaKarya.BINA_PENATAAN_BANGUNAN:
      return { code: 'BPB', bgHex: '#1e293b' };
  }
}

interface PreviewMiniMapProps {
  proposal: UsulanProgram;
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  position: LatLngPoint;
  miniMapType: 'roadmap' | 'hybrid';
}

const PreviewMiniMap: React.FC<PreviewMiniMapProps> = ({
  proposal,
  resolvedPlaces,
  position,
  miniMapType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseGroupRef = useRef<L.LayerGroup | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [position.lat, position.lng],
      zoom: 12,
      zoomControl: true,
    });

    const baseGroup = L.layerGroup().addTo(map);
    const overlayGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    baseGroupRef.current = baseGroup;
    overlayGroupRef.current = overlayGroup;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      baseGroupRef.current = null;
      overlayGroupRef.current = null;
    };
  }, [position.lat, position.lng]);

  useEffect(() => {
    const baseGroup = baseGroupRef.current;
    if (!baseGroup) return;
    baseGroup.clearLayers();

    if (miniMapType === 'hybrid') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: '&copy; Esri' }
      ).addTo(baseGroup);
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap' }
      ).addTo(baseGroup);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(baseGroup);
    }
  }, [miniMapType]);

  useEffect(() => {
    const map = mapRef.current;
    const overlayGroup = overlayGroupRef.current;
    if (!map || !overlayGroup) return;

    overlayGroup.clearLayers();
    map.setView([position.lat, position.lng], 12, { animate: false });

    const singleFc = buildSpatialGeoJsonLayers([proposal], resolvedPlaces, {
      includePolygons: true,
      includeCorridors: false,
    });

    L.geoJSON(singleFc as unknown as GeoJsonObject, {
      style: (feature) => {
        const stroke = String(feature?.properties?.strokeColor ?? '#0284c7');
        const fill = String(feature?.properties?.fillColor ?? '#0284c7');
        return {
          color: stroke,
          weight: 2,
          opacity: 0.85,
          fillColor: fill,
          fillOpacity: 0.16,
        };
      },
    }).addTo(overlayGroup);

    const badge = getSektorMarkerBadge(proposal.sektor);
    const icon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div style="width:28px;height:28px;border-radius:9999px;border:2px solid #ffffff;background:${badge.bgHex};color:#ffffff;font-family:monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(15,23,42,0.35);">${badge.code}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([position.lat, position.lng], { icon }).addTo(overlayGroup);
  }, [proposal, resolvedPlaces, position.lat, position.lng]);

  return <div ref={containerRef} className="w-full h-full" />;
};

const KemenpuBrandLockup: React.FC = () => (
  <div className="flex items-center justify-end select-none shrink-0">
    <img
      src={PU_WORDMARK_SRC}
      alt="Kementerian Pekerjaan Umum"
      className="h-12 sm:h-14 w-auto object-contain"
    />
  </div>
);

export interface ProposalPreviewModalProps {
  proposal: UsulanProgram | null;
  proposalsList: UsulanProgram[];
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  canEdit: boolean;
  isTemplateDemo?: boolean;
  canManageProposal?: (proposal: UsulanProgram) => boolean;
  onClose: () => void;
  onSelectProposal: (id: string) => void;
  onToggleReadiness: (id: string, key: keyof ReadinessCriteria) => void;
  onUpdateSkorRc: (id: string, skorRc: number) => void;
  onSaveProposal?: (proposal: UsulanProgram) => void;
  onEditProposal: (proposal: UsulanProgram) => void;
  onDeleteProposal: (proposal: UsulanProgram) => void;
  onFocusMainMap?: (id: string) => void;
}

const PROFIL_PDF_SIGNATORIES_STORAGE_KEY = 'simpra_ntb_profil_pdf_signatories_v1';

function getDefaultProfilTempatTanggal(): string {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return `Mataram, ${formatted}`;
}

function createEmptyProfilSignatories(): PdfSignatoriesConfig {
  return {
    tempatTanggal: getDefaultProfilTempatTanggal(),
    mengesahkan: { jabatan: '', nama: '' },
    mengesahkan3: { jabatan: '', nama: '' },
    menyetujui: { jabatan: '', nama: '' },
  };
}

function loadInitialProfilSignatories(): PdfSignatoriesConfig {
  const fallback = createEmptyProfilSignatories();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PROFIL_PDF_SIGNATORIES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PdfSignatoriesConfig>;
    return {
      tempatTanggal:
        typeof parsed.tempatTanggal === 'string'
          ? parsed.tempatTanggal
          : fallback.tempatTanggal,
      mengesahkan: {
        jabatan: parsed.mengesahkan?.jabatan ?? '',
        nama: parsed.mengesahkan?.nama ?? '',
      },
      mengesahkan3: {
        jabatan: parsed.mengesahkan3?.jabatan ?? '',
        nama: parsed.mengesahkan3?.nama ?? '',
      },
      menyetujui: {
        jabatan: parsed.menyetujui?.jabatan ?? '',
        nama: parsed.menyetujui?.nama ?? '',
      },
    };
  } catch {
    return fallback;
  }
}

function formatNumberMiliar(val: number): string {
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

const CORE_READINESS_META: Array<{
  key: keyof ReadinessCriteria;
  label: string;
  desc: string;
}> = [
  {
    key: 'dokumenPerencanaan',
    label: 'Dokumen Perencanaan',
    desc: 'RISPAM / RIPS / RISPAL / RIPKS / Masterplan',
  },
  {
    key: 'dedRab',
    label: 'DED & RAB',
    desc: 'FS, Detailed Engineering Design & RAB',
  },
  {
    key: 'kesiapanLahan',
    label: 'Kesiapan Lahan',
    desc: 'Sertifikat / Status Lahan Clean & Clear',
  },
  {
    key: 'dokumenLingkungan',
    label: 'Dokumen Lingkungan',
    desc: 'AMDAL / UKL-UPL / SPPL',
  },
  {
    key: 'lembagaPengelola',
    label: 'Lembaga Pengelola',
    desc: 'Surat Minat & Komitmen Pemda / UPTD / BUMD',
  },
];

function getRcRowStatusMeta(flags: { ada: boolean; kurang: boolean; sesuai: boolean }): {
  label: string;
  badgeClass: string;
} {
  if (flags.sesuai && !flags.kurang) {
    return {
      label: 'Sesuai & Lengkap',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (flags.ada && flags.kurang) {
    return {
      label: 'Ada · Perlu Dilengkapi',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (flags.kurang) {
    return {
      label: 'Kurang / Revisi',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (flags.ada) {
    return {
      label: 'Ada (Dalam Reviu)',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }
  return {
    label: 'Belum Tersedia',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  };
}

function getSafeRcExternalUrl(rawLink?: string): string | null {
  const trimmed = (rawLink ?? '').trim();
  if (!trimmed || /^(javascript|data|vbscript):/i.test(trimmed) || /\s/.test(trimmed)) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.')) return `https://${trimmed}`;
  return null;
}

export const ProposalPreviewModal: React.FC<ProposalPreviewModalProps> = ({
  proposal,
  proposalsList,
  resolvedPlaces,
  canEdit,
  isTemplateDemo = false,
  canManageProposal,
  onClose,
  onSelectProposal,
  onToggleReadiness,
  onUpdateSkorRc,
  onSaveProposal,
  onEditProposal,
  onDeleteProposal,
  onFocusMainMap,
}) => {
  const [miniMapType, setMiniMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [locationMediaTab, setLocationMediaTab] = useState<'map' | 'image'>('map');
  const [rcDraft, setRcDraft] = useState<string>('0');
  const [rcTableDraft, setRcTableDraft] = useState<Record<RcDocKey, RcDocumentEntry>>(
    () => resolveProposalTemplateDetails(proposal ?? ({
      id: 'init',
      kodeUsulan: '',
      namaProgram: '',
      sektor: SektorCiptaKarya.AIR_MINUM,
      kabupatenKota: '',
      kecamatanKawasan: '',
      locationQuery: '',
      volumeTarget: 0,
      satuanTarget: '',
      penerimaManfaatJiwa: 0,
      sumberDana: 'APBN Rupiah Murni' as UsulanProgram['sumberDana'],
      skemaKontrak: 'SYC',
      pagu: { y2027: 0, y2028: 0, y2029: 0, y2030: 0 },
      readiness: {
        dokumenPerencanaan: false,
        dedRab: false,
        kesiapanLahan: false,
        dokumenLingkungan: false,
        lembagaPengelola: false,
      },
      statusVerifikasi: 'Menunggu Konreg' as UsulanProgram['statusVerifikasi'],
      prioritasNasional: '',
      serviceRadiusKm: 3.5,
      catatanTeknis: '',
      updatedAt: '2026-11-04',
    })).rcDetails
  );
  const [customRcDraft, setCustomRcDraft] = useState<CustomRcDocumentEntry[]>(() =>
    proposal ? resolveProposalTemplateDetails(proposal).customRcItems : []
  );
  const [statusManualDraft, setStatusManualDraft] = useState<string>('');
  const [pembahasanDraft, setPembahasanDraft] = useState<string>('0');
  const [linkDataRcDraft, setLinkDataRcDraft] = useState<string>('');
  const [catatanTeknisDraft, setCatatanTeknisDraft] = useState<string>('');
  const [imageDraftUrl, setImageDraftUrl] = useState<string | undefined>(undefined);
  const [uploadAlert, setUploadAlert] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [includeDetailRcInPdf, setIncludeDetailRcInPdf] = useState<boolean>(true);
  const [showDetailedRc, setShowDetailedRc] = useState<boolean>(false);
  const [showNewRcForm, setShowNewRcForm] = useState<boolean>(false);
  const [newRcNama, setNewRcNama] = useState<string>('');
  const [newRcAcuan, setNewRcAcuan] = useState<string>('');
  const [newRcAda, setNewRcAda] = useState<boolean>(true);
  const [newRcKurang, setNewRcKurang] = useState<boolean>(false);
  const [newRcSesuai, setNewRcSesuai] = useState<boolean>(false);
  const [newRcKeterangan, setNewRcKeterangan] = useState<string>('');
  const [newRcError, setNewRcError] = useState<string | null>(null);
  const [rcSaveNotice, setRcSaveNotice] = useState<string | null>(null);
  const [signatories, setSignatories] = useState<PdfSignatoriesConfig>(
    loadInitialProfilSignatories
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadPuWordmarkDataUrl();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROFIL_PDF_SIGNATORIES_STORAGE_KEY,
        JSON.stringify(signatories)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [signatories]);

  const currentRcVal = proposal
    ? getReadinessScore(proposal.readiness, proposal.skorRc).percentage
    : 0;

  useEffect(() => {
    if (!proposal) {
      setShowDetailedRc(false);
      setCustomRcDraft([]);
      setStatusManualDraft('');
      setPembahasanDraft('0');
      setLinkDataRcDraft('');
      setCatatanTeknisDraft('');
      return;
    }
    const resolved = resolveProposalTemplateDetails(proposal);
    setRcDraft(String(getReadinessScore(proposal.readiness, proposal.skorRc).percentage));
    setRcTableDraft(resolved.rcDetails);
    setCustomRcDraft(resolved.customRcItems);
    setStatusManualDraft(resolved.statusManual);
    setPembahasanDraft(String(resolved.jumlahPembahasanBpbpk ?? 0));
    setLinkDataRcDraft(resolved.linkDataRc);
    setCatatanTeknisDraft(proposal.catatanTeknis ?? '');
    setImageDraftUrl(resolved.lokasiGambarUrl);
    setLocationMediaTab(resolved.lokasiGambarUrl ? 'image' : 'map');
    setUploadAlert(null);
  }, [proposal?.id, proposal]);

  useEffect(() => {
    setShowPdfPreview(false);
    setShowNewRcForm(false);
    setNewRcNama('');
    setNewRcAcuan('');
    setNewRcAda(true);
    setNewRcKurang(false);
    setNewRcSesuai(false);
    setNewRcKeterangan('');
    setNewRcError(null);
    setRcSaveNotice(null);
  }, [proposal?.id]);

  const currentIndex = useMemo(() => {
    if (!proposal || isTemplateDemo) return -1;
    return proposalsList.findIndex((p) => p.id === proposal.id);
  }, [proposal, proposalsList, isTemplateDemo]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < proposalsList.length - 1;

  useEffect(() => {
    if (!proposal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPdfPreview) {
          setShowPdfPreview(false);
        } else {
          onClose();
        }
      } else if (
        !showPdfPreview &&
        e.key === 'ArrowLeft' &&
        hasPrev &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        onSelectProposal(proposalsList[currentIndex - 1].id);
      } else if (
        !showPdfPreview &&
        e.key === 'ArrowRight' &&
        hasNext &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        onSelectProposal(proposalsList[currentIndex + 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    proposal,
    showPdfPreview,
    hasPrev,
    hasNext,
    currentIndex,
    proposalsList,
    onClose,
    onSelectProposal,
  ]);

  const pdfPreviewInput = useMemo<ProposalProfilePdfInput | null>(() => {
    if (!proposal) return null;
    const resolvedDetails = resolveProposalTemplateDetails(proposal);
    const parsedRc = tryParseNumberFlexible(rcDraft);
    const activeRcPercentage =
      parsedRc !== null
        ? Math.min(100, Math.max(0, Number(parsedRc.toFixed(1))))
        : currentRcVal;
    const resolvedInfo = resolvedPlaces[proposal.locationQuery];
    const activePos = proposal.manualPosition ?? resolvedInfo?.position ?? {
      lat: -8.62,
      lng: 117.35,
    };

    const parsedPembahasan = tryParseNumberFlexible(pembahasanDraft);
    const liveJumlahPembahasan =
      parsedPembahasan !== null && Number.isFinite(parsedPembahasan)
        ? Math.min(999, Math.max(0, Math.round(parsedPembahasan)))
        : resolvedDetails.jumlahPembahasanBpbpk;
    const liveDetails = {
      ...resolvedDetails,
      statusManual: statusManualDraft.trim(),
      jumlahPembahasanBpbpk: liveJumlahPembahasan,
      linkDataRc: linkDataRcDraft.trim(),
      lokasiGambarUrl: imageDraftUrl,
      rcDetails: rcTableDraft,
      customRcItems: customRcDraft,
    };

    return {
      proposal: {
        ...proposal,
        catatanTeknis: catatanTeknisDraft,
      },
      details: liveDetails,
      totalPagu: getTotalPaguUsulan(proposal.pagu),
      rcPercentage: activeRcPercentage,
      rcTable: rcTableDraft,
      customRcItems: customRcDraft,
      includeDetailRc: includeDetailRcInPdf,
      position: activePos,
      imageDataUrl: imageDraftUrl,
      signatories,
    };
  }, [
    proposal,
    rcDraft,
    currentRcVal,
    resolvedPlaces,
    rcTableDraft,
    customRcDraft,
    statusManualDraft,
    pembahasanDraft,
    linkDataRcDraft,
    catatanTeknisDraft,
    includeDetailRcInPdf,
    imageDraftUrl,
    signatories,
  ]);

  if (!proposal || !pdfPreviewInput) return null;

  const details = resolveProposalTemplateDetails(proposal);
  const standardRcSummary = KEMENPU_RC_ROWS.reduce(
    (acc, row) => {
      const flags = getRcChecklistFlags(rcTableDraft[row.key]);
      if (flags.ada) acc.ada += 1;
      if (flags.kurang) acc.kurang += 1;
      if (flags.sesuai) acc.sesuai += 1;
      return acc;
    },
    { ada: 0, kurang: 0, sesuai: 0 }
  );
  const customRcSummary = customRcDraft.reduce(
    (acc, item) => {
      const flags = getRcChecklistFlags(item);
      if (flags.ada) acc.ada += 1;
      if (flags.kurang) acc.kurang += 1;
      if (flags.sesuai) acc.sesuai += 1;
      return acc;
    },
    { ada: 0, kurang: 0, sesuai: 0 }
  );
  const rcChecklistSummary = {
    ada: standardRcSummary.ada + customRcSummary.ada,
    kurang: standardRcSummary.kurang + customRcSummary.kurang,
    sesuai: standardRcSummary.sesuai + customRcSummary.sesuai,
    total: KEMENPU_RC_ROWS.length + customRcDraft.length,
  };
  const safeRcLinkHref = getSafeRcExternalUrl(linkDataRcDraft);
  const totalPagu = getTotalPaguUsulan(proposal.pagu);
  const resolvedInfo = resolvedPlaces[proposal.locationQuery];
  const position = proposal.manualPosition ?? resolvedInfo?.position ?? {
    lat: -8.62,
    lng: 117.35,
  };
  const allowManageCurrent =
    !isTemplateDemo &&
    canEdit &&
    !proposal.isLocked &&
    (canManageProposal ? canManageProposal(proposal) : true);

  const triggerRcSaveNotice = (message: string) => {
    setRcSaveNotice(message);
    window.setTimeout(() => {
      setRcSaveNotice((current) => (current === message ? null : current));
    }, 3200);
  };

  const buildUpdatedProposalFromPreview = (
    overrideDetails?: Partial<ProposalTemplateDetails>,
    overrideSkorRc?: number
  ): UsulanProgram => {
    const parsedRc = tryParseNumberFlexible(rcDraft);
    const nextSkorRc =
      overrideSkorRc !== undefined
        ? overrideSkorRc
        : parsedRc !== null
          ? Math.min(100, Math.max(0, Number(parsedRc.toFixed(1))))
          : currentRcVal;

    const parsedPembahasan = tryParseNumberFlexible(pembahasanDraft);
    const nextPembahasan =
      parsedPembahasan !== null && Number.isFinite(parsedPembahasan)
        ? Math.min(999, Math.max(0, Math.round(parsedPembahasan)))
        : details.jumlahPembahasanBpbpk;

    const mergedRcDetails = overrideDetails?.rcDetails ?? rcTableDraft;
    const rawCustomRcItems = overrideDetails?.customRcItems ?? customRcDraft;
    const mergedCustomRcItems = rawCustomRcItems.map((item, idx) => {
      const f = getRcChecklistFlags(item);
      return {
        ...item,
        id: item.id || `rc-custom-${idx}-${Date.now()}`,
        namaDokumen: item.namaDokumen.trim().slice(0, 200) || `Dokumen RC Tambahan ${idx + 1}`,
        acuanStandar: (item.acuanStandar ?? '').trim().slice(0, 240),
        ...f,
        status: formatRcChecklistSummary(f),
        keterangan: (item.keterangan ?? '').trim().slice(0, 600),
      };
    });
    const nextReadiness = deriveReadinessFromRcTable(mergedRcDetails, proposal.readiness);

    const nextTemplateDetails: ProposalTemplateDetails = {
      ...(proposal.templateDetails ?? {}),
      provinsi: details.provinsi,
      latarBelakang: details.latarBelakang,
      dasarPenugasan: details.dasarPenugasan,
      manfaatKegiatan: details.manfaatKegiatan,
      lingkupPekerjaan: details.lingkupPekerjaan,
      biayaFisikMiliar: details.biayaFisikMiliar,
      biayaSupervisiMiliar: details.biayaSupervisiMiliar,
      durasiHari: details.durasiHari,
      durasiBulan: details.durasiBulan,
      waktuMulai: details.waktuMulai,
      waktuSelesai: details.waktuSelesai,
      outputTambahan: details.outputTambahan,
      outcomeTambahan: details.outcomeTambahan,
      deskripsiLokasi: details.deskripsiLokasi,
      lokasiGambarUrl: imageDraftUrl,
      statusManual: statusManualDraft.trim(),
      linkDataRc: linkDataRcDraft.trim(),
      jumlahPembahasanBpbpk: nextPembahasan,
      rcDetails: mergedRcDetails,
      customRcItems: mergedCustomRcItems,
      ...overrideDetails,
    };

    return {
      ...proposal,
      skorRc: nextSkorRc,
      readiness: nextReadiness,
      catatanTeknis: catatanTeknisDraft.trim(),
      templateDetails: nextTemplateDetails,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  };

  const handleCommitInlinePreviewSave = () => {
    if (!allowManageCurrent || !onSaveProposal) return;
    const updated = buildUpdatedProposalFromPreview();
    onSaveProposal(updated);
    triggerRcSaveNotice('Perubahan Detail Status RC & Isian Baru berhasil disimpan.');
  };

  const handleRcCellChange = (
    key: RcDocKey,
    field: 'keterangan' | 'customLabel',
    value: string
  ) => {
    setRcTableDraft((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleRcFlagToggle = (key: RcDocKey, flag: 'ada' | 'kurang' | 'sesuai') => {
    setRcTableDraft((prev) => {
      const current = prev[key] ?? { status: '', keterangan: '' };
      const currentFlags = getRcChecklistFlags(current);
      const nextFlags = {
        ...currentFlags,
        [flag]: !currentFlags[flag],
      };
      return {
        ...prev,
        [key]: {
          ...current,
          ...nextFlags,
          status: formatRcChecklistSummary(nextFlags),
        },
      };
    });
  };

  const handleAddCustomRcItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowManageCurrent) return;
    const cleanName = newRcNama.trim().slice(0, 200);
    if (!cleanName) {
      setNewRcError('Nama dokumen Readiness Criteria wajib diisi.');
      return;
    }
    const flags = {
      ada: newRcAda,
      kurang: newRcKurang,
      sesuai: newRcSesuai,
    };
    const nextItem: CustomRcDocumentEntry = {
      id: `rc-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      namaDokumen: cleanName,
      acuanStandar: newRcAcuan.trim().slice(0, 240),
      ...flags,
      status: formatRcChecklistSummary(flags),
      keterangan: newRcKeterangan.trim().slice(0, 600),
    };
    const nextCustomList = [...customRcDraft, nextItem];
    setCustomRcDraft(nextCustomList);
    setNewRcNama('');
    setNewRcAcuan('');
    setNewRcAda(true);
    setNewRcKurang(false);
    setNewRcSesuai(false);
    setNewRcKeterangan('');
    setNewRcError(null);
    setShowNewRcForm(false);

    if (onSaveProposal) {
      onSaveProposal(buildUpdatedProposalFromPreview({ customRcItems: nextCustomList }));
      triggerRcSaveNotice(`Dokumen "${cleanName}" ditambahkan & disimpan.`);
    } else {
      triggerRcSaveNotice(`Dokumen "${cleanName}" ditambahkan.`);
    }
  };

  const handleCustomRcFieldChange = (
    id: string,
    field: 'namaDokumen' | 'acuanStandar' | 'keterangan',
    value: string
  ) => {
    setCustomRcDraft((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleCustomRcFlagToggle = (
    id: string,
    flag: 'ada' | 'kurang' | 'sesuai'
  ) => {
    setCustomRcDraft((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const currentFlags = getRcChecklistFlags(item);
        const nextFlags = {
          ...currentFlags,
          [flag]: !currentFlags[flag],
        };
        return {
          ...item,
          ...nextFlags,
          status: formatRcChecklistSummary(nextFlags),
        };
      })
    );
  };

  const handleRemoveCustomRcItem = (id: string) => {
    if (!allowManageCurrent) return;
    const nextCustomList = customRcDraft.filter((item) => item.id !== id);
    setCustomRcDraft(nextCustomList);
    if (onSaveProposal) {
      onSaveProposal(buildUpdatedProposalFromPreview({ customRcItems: nextCustomList }));
      triggerRcSaveNotice('Isian dokumen RC tambahan dihapus & disimpan.');
    }
  };

  const handleUploadLocationImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setUploadAlert(null);
      const dataUrl = await compressUploadedImageFile(file);
      setImageDraftUrl(dataUrl);
      setLocationMediaTab('image');
      if (allowManageCurrent && onSaveProposal) {
        onSaveProposal(buildUpdatedProposalFromPreview({ lokasiGambarUrl: dataUrl }));
      }
    } catch (err) {
      setUploadAlert(err instanceof Error ? err.message : 'Gagal mengunggah gambar lokasi.');
    }
  };

  const handleDownloadSlideHtml = () => {
    const standardRcRowsHtml = KEMENPU_RC_ROWS.map((row) => {
      const entry = rcTableDraft[row.key] ?? { status: '', keterangan: '' };
      const flags = getRcChecklistFlags(entry);
      const docName =
        row.key === 'lainnya' && entry.customLabel?.trim()
          ? entry.customLabel
          : row.defaultLabel;
      return `<tr>
        <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">${docName}</td>
        <td style="padding:7px 6px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:700;color:#0f766e;">${flags.ada ? '&#10003;' : '&nbsp;'}</td>
        <td style="padding:7px 6px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:700;color:#b45309;">${flags.kurang ? '&#10003;' : '&nbsp;'}</td>
        <td style="padding:7px 6px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:700;color:#1d4ed8;">${flags.sesuai ? '&#10003;' : '&nbsp;'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;">${entry.keterangan || '-'}</td>
      </tr>`;
    }).join('');
    const customRcRowsHtml = customRcDraft
      .map((item) => {
        const flags = getRcChecklistFlags(item);
        return `<tr>
          <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">${item.namaDokumen}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:700;color:#0f766e;">${flags.ada ? '&#10003;' : '&nbsp;'}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:700;color:#b45309;">${flags.kurang ? '&#10003;' : '&nbsp;'}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:700;color:#1d4ed8;">${flags.sesuai ? '&#10003;' : '&nbsp;'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;">${item.keterangan || '-'}</td>
        </tr>`;
      })
      .join('');
    const rcRowsHtml = `${standardRcRowsHtml}${customRcRowsHtml}`;

    const lingkupHtml = details.lingkupPekerjaan
      .map((item) => `<li style="margin-bottom:4px;">&#9744; ${item}</li>`)
      .join('');

    const htmlWordmarkSrc =
      getCachedPuWordmarkDataUrl() || `${window.location.origin}${PU_WORDMARK_SRC}`;
    const htmlBatikSrc = `${window.location.origin}/assets/aistudio/WhatsApp-Image-2019-11-27-at-8.49.19-AM.jpeg__1__eda5fd50.webp`;
    const htmlDoc = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Paparan Usulan ${proposal.kodeUsulan} - Kementerian Pekerjaan Umum</title>
<style>
  body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background:#EEF2FA; color:#0f172a; margin:0; padding:24px; }
  .slide { max-width:1240px; margin:0 auto; background-color:#ffffff; background-image:linear-gradient(rgba(255,255,255,0.945), rgba(255,255,255,0.945)), url('${htmlBatikSrc}'); background-size:auto, 240px auto; background-repeat:no-repeat, repeat; border:1px solid #C7D3E8; border-radius:16px; overflow:hidden; box-shadow:0 12px 32px rgba(6,20,89,0.10); }
  .batik-strip { height:10px; width:100%; background-color:#061459; background-image:url('${htmlBatikSrc}'); background-size:260px auto; background-repeat:repeat-x; background-position:center; border-bottom:2px solid #E89611; }
  .batik-strip-bottom { height:8px; width:100%; background-color:#061459; background-image:url('${htmlBatikSrc}'); background-size:260px auto; background-repeat:repeat-x; background-position:center; border-top:2px solid #E89611; }
  .slide-inner { padding:24px 28px; }
  .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; background:#ffffff; border:1px solid #C7D3E8; border-radius:14px; padding:14px 18px; gap:16px; }
  .title-wrap { display:flex; align-items:stretch; gap:14px; }
  .bars { display:flex; width:16px; flex-shrink:0; }
  .bar-blue { width:7px; background:#061459; }
  .bar-gold { width:9px; background:#E89611; }
  h1 { margin:0; font-size:22px; font-weight:800; text-transform:uppercase; color:#061459; }
  .subtitle { margin-top:4px; font-size:14px; color:#476691; text-transform:uppercase; font-weight:600; }
  .brand { display:flex; align-items:center; justify-content:flex-end; flex-shrink:0; }
  .brand-logo { height:48px; width:auto; object-fit:contain; }
  .row3 { display:grid; grid-template-columns: 5fr 4fr 3fr; gap:14px; margin-bottom:14px; }
  .row2 { display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px; }
  .row-bottom { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
  .card { border:1px solid #C7D3E8; border-radius:14px; background:#ffffff; overflow:hidden; }
  .card-title { font-size:14px; font-weight:700; color:#ffffff; background:#061459; padding:9px 14px; border-bottom:2px solid #E89611; }
  .card-body { padding:13px 15px; }
  ul { margin:4px 0 0; padding-left:18px; font-size:12.5px; line-height:1.55; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { padding:7px 10px; border-bottom:1px solid #C7D3E8; text-align:center; font-weight:700; background:#EEF2FA; color:#061459; }
</style>
</head>
<body>
  <div class="slide">
    <div class="batik-strip"></div>
    <div class="slide-inner">
    <div class="header">
      <div class="title-wrap">
        <div class="bars"><div class="bar-blue"></div><div class="bar-gold"></div></div>
        <div>
          <h1>${proposal.namaProgram}</h1>
          <div class="subtitle">${proposal.kabupatenKota} · ${details.provinsi}</div>
        </div>
      </div>
      <div class="brand">
        <img src="${htmlWordmarkSrc}" alt="Kementerian Pekerjaan Umum" class="brand-logo" />
      </div>
    </div>
    <div class="row3">
      <div class="card">
        <div class="card-title">Gambaran Umum</div>
        <div class="card-body" style="font-size:12.5px;line-height:1.55;">
          <ul>
            <li><strong>Latar belakang:</strong> ${details.latarBelakang}</li>
            <li><strong>Dasar penugasan:</strong> ${details.dasarPenugasan}</li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Urgensi Strategis</div>
        <div class="card-body">
          <ul>
            <li>${proposal.prioritasNasional}</li>
            <li>${details.manfaatKegiatan}</li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Lingkup Pekerjaan</div>
        <div class="card-body">
          <ul style="list-style:none;padding-left:0;">${lingkupHtml}</ul>
        </div>
      </div>
    </div>
    <div class="row2">
      <div class="card">
        <div class="card-title">Kebutuhan Anggaran</div>
        <div class="card-body" style="font-size:12.5px;line-height:1.6;">
          <div>Estimasi total kebutuhan anggaran sebesar <strong>Rp ${formatNumberMiliar(totalPagu)} Miliar</strong></div>
          <div>&#10070; Fisik Rp ${formatNumberMiliar(details.biayaFisikMiliar)} Miliar</div>
          <div>&#10070; Manajemen Konstruksi/Supervisi Rp ${formatNumberMiliar(details.biayaSupervisiMiliar)} Miliar</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Output &amp; Outcome</div>
        <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px;line-height:1.6;">
          <div>
            <strong>Output</strong>
            ${details.outputTambahan ? `<div>&#10070; ${details.outputTambahan}</div>` : '<div>&#10070; —</div>'}
          </div>
          <div>
            <strong>Outcome</strong>
            ${details.outcomeTambahan ? `<div>&#10070; ${details.outcomeTambahan}</div>` : '<div>&#10070; —</div>'}
          </div>
        </div>
      </div>
    </div>
    <div class="row-bottom">
      <div class="card">
        <div class="card-title">Gambaran Lokasi Kegiatan</div>
        <div class="card-body">
          ${
            imageDraftUrl
              ? `<img src="${imageDraftUrl}" alt="Gambaran Lokasi" style="width:100%;height:240px;object-fit:contain;border-radius:10px;border:1px solid #C7D3E8;margin-bottom:8px;" />`
              : `<div style="padding:18px;border:1px solid #C7D3E8;border-radius:10px;background:#F8FAFE;margin-bottom:8px;font-size:12px;">Koordinat Lokasi: <strong>${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}</strong> (${proposal.kecamatanKawasan}, ${proposal.kabupatenKota})</div>`
          }
          <div style="font-size:12px;line-height:1.5;">&#10070; ${details.deskripsiLokasi}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Status <em>Readiness Criteria</em> (RC) — Skor: ${rcDraft}%</div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th rowspan="2" style="border-right:1px solid #C7D3E8;vertical-align:middle;">Dokumen</th>
                <th colspan="3" style="border-right:1px solid #C7D3E8;border-bottom:1px solid #C7D3E8;">Status</th>
                <th rowspan="2" style="vertical-align:middle;">Keterangan</th>
              </tr>
              <tr>
                <th style="border-right:1px solid #C7D3E8;font-size:11px;width:54px;">Ada</th>
                <th style="border-right:1px solid #C7D3E8;font-size:11px;width:58px;">Kurang</th>
                <th style="border-right:1px solid #C7D3E8;font-size:11px;width:58px;">Sesuai</th>
              </tr>
            </thead>
            <tbody>${rcRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
    <div class="batik-strip-bottom"></div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Paparan-Usulan-${proposal.kodeUsulan}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-[2px] p-2 sm:p-5 overflow-y-auto print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#C7D3E8] rounded-2xl shadow-2xl w-full max-w-[1320px] max-h-[95vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0">
        {/* Top Utility & Action Bar (Batik PU Theme, Hidden on Print) */}
        <div className="px-4 sm:px-6 py-3 batik-pu-banner border-b-2 border-[#E89611] text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {!isTemplateDemo && proposalsList.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onSelectProposal(proposalsList[currentIndex - 1].id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#040E42]/80 hover:bg-[#0A1D6E] border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sebelumnya</span>
                </button>
                <span className="font-mono text-xs text-amber-200 px-1 tabular-nums">
                  {currentIndex + 1} / {proposalsList.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onSelectProposal(proposalsList[currentIndex + 1].id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#040E42]/80 hover:bg-[#0A1D6E] border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-300" />
                </button>
              </>
            )}
            <span className="text-xs text-indigo-100 font-mono">
              {isTemplateDemo
                ? 'Contoh Tampilan Template Preview Usulan KEMENPU'
                : `${proposal.kodeUsulan} · ${formatActiveYears(proposal.pagu)}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleUploadLocationImage(e)}
              className="hidden"
            />

            {allowManageCurrent && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#040E42]/80 hover:bg-[#0A1D6E] border border-white/15 text-indigo-100 hover:text-white cursor-pointer whitespace-nowrap"
                title="Unggah gambar skema jaringan atau peta lokasi untuk kartu Gambaran Lokasi Kegiatan"
              >
                <ImagePlus className="w-3.5 h-3.5 text-amber-300" />
                <span>Unggah Gambar Lokasi</span>
              </button>
            )}

            {!isTemplateDemo && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadSlideHtml}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#040E42]/80 hover:bg-[#0A1D6E] border border-white/15 text-indigo-100 hover:text-white cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Unduh HTML</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDetailedRc(true);
                    window.setTimeout(() => {
                      const el = document.getElementById('profil-pdf-signatory-panel');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 80);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#040E42]/80 hover:bg-[#0A1D6E] border border-white/15 text-indigo-100 hover:text-white cursor-pointer whitespace-nowrap"
                  title="Isi data Mengesahkan & Menyetujui di bagian bawah Detail Status RC"
                >
                  <PenLine className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden md:inline">Pengesahan PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPdfPreview(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#E89611] hover:bg-amber-400 text-[#051044] cursor-pointer whitespace-nowrap shadow-xs"
                  title="Lihat pratinjau hasil Cetak PDF Profil Usulan"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const [wordmarkDataUrl, batikAssets] = await Promise.all([
                        loadPuWordmarkDataUrl(),
                        loadPuBatikAssets(),
                      ]);
                      exportProposalProfilePdf({
                        ...pdfPreviewInput,
                        wordmarkDataUrl,
                        batikAssets,
                      });
                    })();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#07165B] hover:bg-[#0A1D6E] text-white cursor-pointer whitespace-nowrap border border-amber-400/60"
                  title="Cetak PDF Profil Usulan beserta Detail Status Readiness Criteria (RC)"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>Cetak PDF (+ Detail RC)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#040E42]/80 hover:bg-[#0A1D6E] border border-white/15 text-indigo-100 hover:text-white cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Cetak / PDF</span>
                </button>
              </>
            )}

            {allowManageCurrent && (
              <>
                {onSaveProposal && (
                  <button
                    type="button"
                    onClick={handleCommitInlinePreviewSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProposal(proposal);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1E40AF] hover:bg-blue-600 border border-white/15 text-white cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Formulir</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeleteProposal(proposal);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-600/90 hover:bg-red-600 text-white cursor-pointer"
                  title="Hapus usulan ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {uploadAlert && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-800 print:hidden">
            {uploadAlert}
          </div>
        )}

        {/* KEMENPU Executive Slide Canvas (Batik PU Theme on Screen & Print) */}
        <div className="flex-1 overflow-y-auto batik-pu-watermark print-batik-watermark print:p-0">
          <div className="h-2.5 w-full batik-pu-strip border-b-2 border-[#E89611] shrink-0" aria-hidden="true" />

          <div className="p-5 sm:p-8 print:p-5 space-y-4">
          {/* SLIDE HEADER: Framed Card with Left Navy/Gold Bar + Uppercase Title & Subtitle | Right KEMENPU Wordmark */}
          <div className="bg-white border border-[#C7D3E8] rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-stretch gap-3.5 min-w-0">
              <div className="flex shrink-0 select-none" aria-hidden="true">
                <div className="w-2 bg-[#061459]" />
                <div className="w-2.5 bg-[#E89611]" />
              </div>
              <div className="min-w-0 py-0.5">
                <h1
                  id="preview-modal-title"
                  className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#061459] uppercase leading-snug"
                >
                  {proposal.namaProgram}
                </h1>
                <div className="mt-0.5 text-sm sm:text-base font-semibold text-[#476691] uppercase tracking-wide">
                  {proposal.kabupatenKota} · {details.provinsi}
                </div>
              </div>
            </div>

            <KemenpuBrandLockup />
          </div>

          {/* ROW 1: Gambaran Umum (5) | Urgensi Strategis (4) | Lingkup Pekerjaan (3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Card 1: Gambaran Umum */}
            <div className="lg:col-span-5 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                <Target className="w-4 h-4 text-[#E89611] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-white">Gambaran Umum</h2>
              </div>
              <div className="p-4 text-xs text-slate-700 leading-relaxed space-y-2">
                <p className="text-slate-600">Informasi umum pelaksanaan kegiatan:</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <span className="font-semibold text-slate-800">Latar belakang: </span>
                    <span>{details.latarBelakang}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">Dasar penugasan: </span>
                    <span>{details.dasarPenugasan}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Urgensi Strategis */}
            <div className="lg:col-span-4 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                <AlertTriangle className="w-4 h-4 text-[#E89611] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Urgensi Strategis
                </h2>
              </div>
              <div className="p-4">
                <ul className="list-disc pl-4 space-y-2 text-xs text-slate-700 leading-relaxed">
                  <li>
                    <span className="font-semibold text-slate-800">
                      Dukungan PN / PKPN / Prioritas:{' '}
                    </span>
                    <span>{proposal.prioritasNasional}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">Manfaat kegiatan: </span>
                    <span>{details.manfaatKegiatan}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Lingkup Pekerjaan */}
            <div className="lg:col-span-3 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                <ListChecks className="w-4 h-4 text-[#E89611] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Lingkup Pekerjaan
                </h2>
              </div>
              <div className="p-4">
                <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                  {details.lingkupPekerjaan.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Square className="w-3.5 h-3.5 text-[#061459]/70 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ROW 2: Kebutuhan Anggaran (6) | Output & Outcome (6) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Card 4: Kebutuhan Anggaran */}
            <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                <Wallet className="w-4 h-4 text-[#E89611] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Kebutuhan Anggaran
                </h2>
              </div>
              <div className="p-4 text-xs text-slate-700 leading-relaxed space-y-1.5">
                <p>
                  Estimasi total kebutuhan anggaran sebesar{' '}
                  <strong className="font-mono text-[#061459]">
                    Rp {formatNumberMiliar(totalPagu)} Miliar
                  </strong>{' '}
                  <span className="text-slate-500">
                    ({proposal.sumberDana} · {formatActiveYears(proposal.pagu)})
                  </span>
                </p>
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#E89611] select-none" aria-hidden="true">
                      ❖
                    </span>
                    <span>
                      Fisik Rp{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumberMiliar(details.biayaFisikMiliar)}
                      </strong>{' '}
                      Miliar
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#E89611] select-none" aria-hidden="true">
                      ❖
                    </span>
                    <span>
                      Manajemen Konstruksi/Supervisi Rp{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumberMiliar(details.biayaSupervisiMiliar)}
                      </strong>{' '}
                      Miliar
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Output & Outcome */}
            <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                <PieChart className="w-4 h-4 text-[#E89611] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Output &amp; Outcome
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
                <div className="space-y-1">
                  <div className="font-bold text-[#061459]">Output</div>
                  {details.outputTambahan ? (
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#E89611]" aria-hidden="true">❖</span>
                      <span>{details.outputTambahan}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <span aria-hidden="true">❖</span>
                      <span>—</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[#061459]">Outcome</div>
                  {details.outcomeTambahan ? (
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#E89611]" aria-hidden="true">❖</span>
                      <span>{details.outcomeTambahan}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <span aria-hidden="true">❖</span>
                      <span>—</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: Gambaran Lokasi Kegiatan (6) | Status Readiness Criteria (RC) (6) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Card 7: Gambaran Lokasi Kegiatan */}
            <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Gambaran Lokasi Kegiatan
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 print:hidden">
                    {imageDraftUrl && (
                      <div className="inline-flex bg-[#040E42]/85 border border-white/15 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setLocationMediaTab('image')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            locationMediaTab === 'image'
                              ? 'bg-[#E89611] text-[#051044] font-semibold'
                              : 'text-indigo-100 hover:text-white'
                          }`}
                        >
                          Gambar
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationMediaTab('map')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            locationMediaTab === 'map'
                              ? 'bg-[#E89611] text-[#051044] font-semibold'
                              : 'text-indigo-100 hover:text-white'
                          }`}
                        >
                          Peta GIS
                        </button>
                      </div>
                    )}

                    {locationMediaTab === 'map' && (
                      <div className="inline-flex bg-[#040E42]/85 border border-white/15 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setMiniMapType('roadmap')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            miniMapType === 'roadmap'
                              ? 'bg-[#E89611] text-[#051044] font-semibold'
                              : 'text-indigo-100 hover:text-white'
                          }`}
                        >
                          Peta
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiniMapType('hybrid')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            miniMapType === 'hybrid'
                              ? 'bg-[#E89611] text-[#051044] font-semibold'
                              : 'text-indigo-100 hover:text-white'
                          }`}
                        >
                          Satelit
                        </button>
                      </div>
                    )}

                    {!isTemplateDemo && onFocusMainMap && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onFocusMainMap(proposal.id);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-300 hover:text-amber-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-md cursor-pointer"
                        title="Fokuskan lokasi pada Peta Utama"
                      >
                        <LocateFixed className="w-3 h-3" />
                        <span>Peta Utama</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Map or Uploaded Schematic Frame */}
                <div className="p-4 pb-0">
                  <div className="h-[285px] w-full rounded-xl border border-[#C7D3E8] overflow-hidden bg-slate-100 relative">
                    {imageDraftUrl && locationMediaTab === 'image' ? (
                      <img
                        src={imageDraftUrl}
                        alt={`Gambaran Lokasi ${proposal.namaProgram}`}
                        className="w-full h-full object-contain bg-white"
                      />
                    ) : (
                      <PreviewMiniMap
                        proposal={proposal}
                        resolvedPlaces={resolvedPlaces}
                        position={position}
                        miniMapType={miniMapType}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-3 flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                <span className="shrink-0 select-none text-[#E89611]" aria-hidden="true">
                  ❖
                </span>
                <span>{details.deskripsiLokasi}</span>
              </div>
            </div>

            {/* Card 8: Status Readiness Criteria (RC) */}
            <div className="lg:col-span-6 bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611]">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#E89611] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Status <span className="italic">Readiness Criteria</span> (RC)
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-indigo-100">Skor RC:</span>
                    {allowManageCurrent ? (
                      <div className="flex items-center bg-white border border-[#E89611] rounded-md px-2 py-0.5 w-20 focus-within:ring-2 focus-within:ring-[#E89611]/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Skor RC Manual (%)"
                          value={rcDraft}
                          onChange={(e) => setRcDraft(e.target.value)}
                          onBlur={() => {
                            const num = tryParseNumberFlexible(rcDraft);
                            if (num !== null) {
                              const clamped = Math.min(100, Math.max(0, Number(num.toFixed(1))));
                              setRcDraft(String(clamped));
                              if (clamped !== currentRcVal || proposal.skorRc === undefined) {
                                onUpdateSkorRc(proposal.id, clamped);
                              }
                            } else {
                              setRcDraft(String(currentRcVal));
                            }
                          }}
                          className="w-full text-xs font-mono font-bold tabular-nums text-right text-[#061459] bg-transparent focus:outline-none"
                        />
                        <span className="text-[11px] font-mono text-slate-500 ml-0.5">%</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded bg-[#E89611] text-[#051044]">
                        {rcDraft}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Checklist KEMENPU RC Table: Dokumen | Status (Ada, Kurang, Sesuai) | Keterangan */}
                <div className="p-4 pb-2 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#C7D3E8] text-[#061459] bg-[#EEF2FA]">
                        <th
                          rowSpan={2}
                          className="py-1.5 px-2.5 text-center font-bold border-r border-[#C7D3E8] w-[37%] align-middle"
                        >
                          Dokumen
                        </th>
                        <th
                          colSpan={3}
                          className="py-1 px-2 text-center font-bold border-r border-[#C7D3E8] border-b border-[#C7D3E8]"
                        >
                          Status
                        </th>
                        <th
                          rowSpan={2}
                          className="py-1.5 px-2.5 text-center font-bold w-[36%] align-middle"
                        >
                          Keterangan
                        </th>
                      </tr>
                      <tr className="border-b border-[#C7D3E8] text-[#061459] bg-[#F6F8FD] text-[11px]">
                        <th className="py-1 px-1.5 text-center font-semibold border-r border-[#C7D3E8] w-[9%]">
                          Ada
                        </th>
                        <th className="py-1 px-1.5 text-center font-semibold border-r border-[#C7D3E8] w-[9%]">
                          Kurang
                        </th>
                        <th className="py-1 px-1.5 text-center font-semibold border-r border-[#C7D3E8] w-[9%]">
                          Sesuai
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C7D3E8] text-slate-700">
                      {KEMENPU_RC_ROWS.map((row) => {
                        const entry = rcTableDraft[row.key] ?? {
                          status: '',
                          keterangan: '',
                        };
                        const flags = getRcChecklistFlags(entry);
                        const docLabel = entry.customLabel || row.defaultLabel;
                        return (
                          <tr key={row.key} className="hover:bg-[#F8FAFE]">
                            <td className="py-2 px-2.5 border-r border-[#C7D3E8] align-middle">
                              {row.key === 'lainnya' && allowManageCurrent ? (
                                <input
                                  type="text"
                                  value={entry.customLabel ?? row.defaultLabel}
                                  onChange={(e) =>
                                    handleRcCellChange('lainnya', 'customLabel', e.target.value)
                                  }
                                  placeholder="Lainnya (silakan tambahkan)"
                                  className="w-full bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#061459] rounded px-1 py-0.5"
                                />
                              ) : (
                                <span>{docLabel}</span>
                              )}
                            </td>
                            {(
                              [
                                { key: 'ada', label: 'Ada', accent: 'text-emerald-700 accent-emerald-700' },
                                { key: 'kurang', label: 'Kurang', accent: 'text-amber-700 accent-amber-600' },
                                { key: 'sesuai', label: 'Sesuai', accent: 'text-blue-700 accent-blue-700' },
                              ] as const
                            ).map((col) => {
                              const checked = flags[col.key];
                              return (
                                <td
                                  key={col.key}
                                  className="py-1.5 px-1.5 border-r border-[#C7D3E8] align-middle text-center"
                                >
                                  {allowManageCurrent ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleRcFlagToggle(row.key, col.key)}
                                      aria-label={`${docLabel} - ${col.label}`}
                                      className={`w-4 h-4 rounded border-slate-300 cursor-pointer align-middle ${col.accent}`}
                                    />
                                  ) : (
                                    <span
                                      className={`font-bold text-sm leading-none ${
                                        checked ? col.accent.split(' ')[0] : 'text-slate-300'
                                      }`}
                                    >
                                      {checked ? '✓' : ''}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 align-middle">
                              {allowManageCurrent ? (
                                <input
                                  type="text"
                                  value={entry.keterangan}
                                  onChange={(e) =>
                                    handleRcCellChange(row.key, 'keterangan', e.target.value)
                                  }
                                  placeholder="Isi keterangan..."
                                  className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#061459] rounded px-1 py-0.5"
                                />
                              ) : (
                                <span>{entry.keterangan || ''}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tombol Fitur Lihat Lebih Detail di Bawah Tabel Status RC */}
                <div className="mx-4 mb-3 mt-1 flex items-center justify-end print:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !showDetailedRc;
                      setShowDetailedRc(nextState);
                      if (nextState) {
                        window.setTimeout(() => {
                          document
                            .getElementById('profil-rc-detail-table-section')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 60);
                      }
                    }}
                    aria-expanded={showDetailedRc}
                    aria-controls="profil-rc-detail-table-section"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#061459] hover:bg-[#0A1D6E] text-white border border-[#E89611]/70 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#E89611]" />
                    <span>
                      {showDetailedRc
                        ? 'Sembunyikan Detail Tabel RC'
                        : 'Lihat Lebih Detail Tabel Status RC'}
                    </span>
                    {showDetailedRc ? (
                      <ChevronUp className="w-3.5 h-3.5 text-amber-300" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                    )}
                  </button>
                </div>
              </div>

              {allowManageCurrent && onSaveProposal && (
                <div className="px-4 py-3 border-t border-[#D7E0F0] bg-[#F8FAFE] flex items-center justify-between gap-2 print:hidden">
                  <span className="text-[11px] text-slate-600">
                    Centang kolom Status (Ada / Kurang / Sesuai) dan isi Keterangan RC di atas lalu simpan.
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitInlinePreviewSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Tabel RC</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabel Fitur Lihat Lebih Detail Status Readiness Criteria (RC) di Bawah Tabel Status RC */}
          <section
            id="profil-rc-detail-table-section"
            aria-label="Detail Lengkap Status Readiness Criteria (RC)"
            className={`${
              showDetailedRc ? 'block' : 'hidden print:block'
            } bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden shadow-xs print:break-before-page`}
          >
              <div className="px-4 sm:px-5 py-3 bg-[#061459] text-white border-b-2 border-[#E89611] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <FileCheck2 className="w-4 h-4 text-[#E89611] shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Detail Status <span className="italic">Readiness Criteria</span> (RC)
                  </h3>
                  {allowManageCurrent ? (
                    <div className="flex items-center bg-white border border-[#E89611] rounded-md px-2 py-0.5 w-24 shrink-0 focus-within:ring-2 focus-within:ring-[#E89611]/50">
                      <span className="text-[10px] font-semibold text-slate-500 mr-1">Skor:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Skor RC Manual Detail (%)"
                        value={rcDraft}
                        onChange={(e) => setRcDraft(e.target.value)}
                        onBlur={() => {
                          const num = tryParseNumberFlexible(rcDraft);
                          if (num !== null) {
                            const clamped = Math.min(100, Math.max(0, Number(num.toFixed(1))));
                            setRcDraft(String(clamped));
                          } else {
                            setRcDraft(String(currentRcVal));
                          }
                        }}
                        className="w-full text-xs font-mono font-bold tabular-nums text-right text-[#061459] bg-transparent focus:outline-none"
                      />
                      <span className="text-[11px] font-mono text-slate-500 ml-0.5">%</span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E89611] text-[#051044] shrink-0">
                      Skor RC: {rcDraft}%
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-indigo-100 bg-white/10 px-2 py-0.5 rounded border border-white/15 shrink-0">
                    {rcChecklistSummary.total} Dokumen RC
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  {allowManageCurrent && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewRcForm((prev) => !prev);
                        setNewRcError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#E89611] hover:bg-amber-400 text-[#051044] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {showNewRcForm ? 'Tutup Form Isian Baru' : 'Tambah Isian Baru Dokumen RC'}
                      </span>
                    </button>
                  )}

                  {allowManageCurrent && onSaveProposal && (
                    <button
                      type="button"
                      onClick={handleCommitInlinePreviewSave}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Detail RC</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDetailedRc(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Tutup Detail</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {rcSaveNotice && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 print:hidden">
                    {rcSaveNotice}
                  </div>
                )}

                {/* Ringkasan & Editor Metadata Verifikasi RC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                    <label className="block text-[11px] font-medium text-slate-500">
                      Status Verifikasi / Matriks
                    </label>
                    {allowManageCurrent ? (
                      <input
                        type="text"
                        value={statusManualDraft}
                        onChange={(e) => setStatusManualDraft(e.target.value)}
                        placeholder={proposal.statusVerifikasi}
                        className="mt-1 w-full px-2.5 py-1.5 text-xs font-semibold text-[#061459] bg-white border border-[#C7D3E8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#061459] print:hidden"
                      />
                    ) : null}
                    <div
                      className={`mt-0.5 text-xs font-bold text-[#061459] ${
                        allowManageCurrent ? 'hidden print:block' : ''
                      }`}
                    >
                      {statusManualDraft.trim() || proposal.statusVerifikasi}
                    </div>
                  </div>

                  <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                    <label className="block text-[11px] font-medium text-slate-500">
                      Pembahasan dengan BPBPK NTB
                    </label>
                    {allowManageCurrent ? (
                      <div className="mt-1 flex items-center bg-white border border-[#C7D3E8] rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-[#061459] print:hidden">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={pembahasanDraft}
                          onChange={(e) => setPembahasanDraft(e.target.value)}
                          placeholder="0"
                          className="w-full font-mono text-xs font-bold tabular-nums text-[#061459] bg-transparent focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-500 ml-1.5 select-none">Kali</span>
                      </div>
                    ) : null}
                    <div
                      className={`mt-0.5 font-mono text-xs font-bold text-[#061459] tabular-nums ${
                        allowManageCurrent ? 'hidden print:block' : ''
                      }`}
                    >
                      {tryParseNumberFlexible(pembahasanDraft) ?? 0} Kali Pembahasan
                    </div>
                  </div>

                  <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                    <div className="text-[11px] font-medium text-slate-500">
                      Kelengkapan Dokumen RC
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-slate-800 font-mono tabular-nums">
                      Ada {rcChecklistSummary.ada}/{rcChecklistSummary.total} · Sesuai{' '}
                      {rcChecklistSummary.sesuai}/{rcChecklistSummary.total} · Kurang{' '}
                      {rcChecklistSummary.kurang}/{rcChecklistSummary.total}
                    </div>
                  </div>

                  <div className="border border-[#C7D3E8] rounded-xl px-3.5 py-2.5 bg-[#F8FAFE]">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-slate-500">
                        Tautan Berkas / Data RC
                      </label>
                      {safeRcLinkHref && (
                        <a
                          href={safeRcLinkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 hover:underline shrink-0"
                          title={linkDataRcDraft}
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {allowManageCurrent ? (
                      <input
                        type="text"
                        value={linkDataRcDraft}
                        onChange={(e) => setLinkDataRcDraft(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="mt-1 w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-[#C7D3E8] rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#061459] print:hidden"
                      />
                    ) : null}
                    <div
                      className={`mt-0.5 text-xs ${
                        allowManageCurrent ? 'hidden print:block' : ''
                      }`}
                    >
                      {safeRcLinkHref ? (
                        <a
                          href={safeRcLinkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline max-w-full"
                          title={linkDataRcDraft}
                        >
                          <span className="truncate">Buka Link Data RC</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : linkDataRcDraft.trim() ? (
                        <span className="font-medium text-slate-700 truncate block">
                          {linkDataRcDraft.trim()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Belum diisi</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabel Rincian Lebih Detail Status Readiness Criteria (RC) */}
                <div className="overflow-x-auto border border-[#C7D3E8] rounded-xl">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#EEF2FA] border-b border-[#C7D3E8] text-[#061459]">
                        <th className="py-2 px-2.5 text-center font-bold border-r border-[#C7D3E8] w-10">
                          No
                        </th>
                        <th className="py-2 px-3 text-left font-bold border-r border-[#C7D3E8] w-[22%]">
                          Dokumen Readiness Criteria
                        </th>
                        <th className="py-2 px-3 text-left font-bold border-r border-[#C7D3E8] w-[22%]">
                          Acuan / Standar Kelengkapan
                        </th>
                        <th className="py-2 px-2 text-center font-bold border-r border-[#C7D3E8] w-12">
                          Ada
                        </th>
                        <th className="py-2 px-2 text-center font-bold border-r border-[#C7D3E8] w-14">
                          Kurang
                        </th>
                        <th className="py-2 px-2 text-center font-bold border-r border-[#C7D3E8] w-14">
                          Sesuai
                        </th>
                        <th className="py-2 px-2.5 text-center font-bold border-r border-[#C7D3E8] w-[14%]">
                          Status Detail
                        </th>
                        <th className="py-2 px-3 text-left font-bold">
                          Keterangan &amp; Catatan Verifikasi Lengkap
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C7D3E8] text-slate-700">
                      {KEMENPU_RC_ROWS.map((row, idx) => {
                        const entry = rcTableDraft[row.key] ?? {
                          status: '',
                          keterangan: '',
                        };
                        const flags = getRcChecklistFlags(entry);
                        const statusMeta = getRcRowStatusMeta(flags);
                        const docLabel = entry.customLabel || row.defaultLabel;
                        const rawLegacy = proposal.templateDetails?.rcDetails;
                        const legacyFsDedRabSub =
                          row.key === 'fsDedRab' && rawLegacy
                            ? (
                                [
                                  {
                                    key: 'studiKelayakan',
                                    title: 'Studi Kelayakan (FS)',
                                    data: rawLegacy.studiKelayakan,
                                  },
                                  {
                                    key: 'ded',
                                    title: 'DED Teknis',
                                    data: rawLegacy.ded,
                                  },
                                  {
                                    key: 'rab',
                                    title: 'RAB',
                                    data: rawLegacy.rab,
                                  },
                                ] as const
                              ).filter((sub) => Boolean(sub.data))
                            : [];

                        return (
                          <tr key={`detail-${row.key}`} className="hover:bg-[#F8FAFE]">
                            <td className="py-2.5 px-2.5 border-r border-[#C7D3E8] text-center font-mono font-semibold text-slate-500 align-top">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#C7D3E8] align-top">
                              {row.key === 'lainnya' && allowManageCurrent ? (
                                <>
                                  <input
                                    type="text"
                                    value={entry.customLabel ?? row.defaultLabel}
                                    onChange={(e) =>
                                      handleRcCellChange('lainnya', 'customLabel', e.target.value)
                                    }
                                    placeholder="Lainnya (silakan tambahkan)"
                                    className="w-full px-2 py-1 text-xs font-semibold text-[#061459] bg-white border border-[#C7D3E8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#061459] print:hidden"
                                  />
                                  <div className="hidden print:block font-semibold text-[#061459]">
                                    {docLabel}
                                  </div>
                                </>
                              ) : (
                                <div className="font-semibold text-[#061459]">{docLabel}</div>
                              )}
                              {legacyFsDedRabSub.length > 0 && (
                                <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600 border-t border-slate-200 pt-1.5">
                                  {legacyFsDedRabSub.map((sub) => (
                                    <li key={sub.key}>
                                      <span className="font-semibold text-slate-800">
                                        {sub.title}:
                                      </span>{' '}
                                      <span>{sub.data?.status || '-'}</span>
                                      {sub.data?.keterangan && (
                                        <span className="text-slate-500">
                                          {' '}
                                          ({sub.data.keterangan})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#C7D3E8] text-[11px] text-slate-600 align-top leading-relaxed">
                              {row.placeholderNote}
                            </td>
                            {(
                              [
                                {
                                  key: 'ada',
                                  label: 'Ada',
                                  accent: 'text-emerald-700 accent-emerald-700',
                                },
                                {
                                  key: 'kurang',
                                  label: 'Kurang',
                                  accent: 'text-amber-700 accent-amber-600',
                                },
                                {
                                  key: 'sesuai',
                                  label: 'Sesuai',
                                  accent: 'text-blue-700 accent-blue-700',
                                },
                              ] as const
                            ).map((col) => {
                              const checked = flags[col.key];
                              return (
                                <td
                                  key={`detail-col-${row.key}-${col.key}`}
                                  className="py-2.5 px-2 border-r border-[#C7D3E8] text-center align-top"
                                >
                                  {allowManageCurrent ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleRcFlagToggle(row.key, col.key)}
                                      aria-label={`Detail ${docLabel} - ${col.label}`}
                                      className={`w-4 h-4 rounded border-slate-300 cursor-pointer ${col.accent}`}
                                    />
                                  ) : (
                                    <span
                                      className={`font-bold text-sm leading-none ${
                                        checked ? col.accent.split(' ')[0] : 'text-slate-300'
                                      }`}
                                    >
                                      {checked ? '✓' : '—'}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-2.5 border-r border-[#C7D3E8] text-center align-top">
                              <span
                                className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded border whitespace-nowrap ${statusMeta.badgeClass}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 align-top leading-relaxed">
                              {allowManageCurrent ? (
                                <textarea
                                  rows={2}
                                  value={entry.keterangan}
                                  onChange={(e) =>
                                    handleRcCellChange(row.key, 'keterangan', e.target.value)
                                  }
                                  placeholder={`Isi keterangan detail (${row.placeholderNote})...`}
                                  className="w-full px-2 py-1 text-xs bg-white border border-[#C7D3E8] rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#061459]"
                                />
                              ) : (
                                <div className="text-xs text-slate-700 whitespace-pre-wrap">
                                  {entry.keterangan || 'Belum ada keterangan tambahan.'}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {customRcDraft.map((item, customIdx) => {
                        const rowNumber = KEMENPU_RC_ROWS.length + customIdx + 1;
                        const flags = getRcChecklistFlags(item);
                        const statusMeta = getRcRowStatusMeta(flags);
                        return (
                          <tr
                            key={item.id}
                            className="bg-amber-50/25 hover:bg-amber-50/45 transition-colors"
                          >
                            <td className="py-2.5 px-2 border-r border-[#C7D3E8] text-center align-top">
                              <div className="font-mono font-semibold text-[#061459]">
                                {rowNumber}
                              </div>
                              {allowManageCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomRcItem(item.id)}
                                  title={`Hapus dokumen "${item.namaDokumen}"`}
                                  aria-label={`Hapus dokumen ${item.namaDokumen}`}
                                  className="mt-1.5 inline-flex items-center justify-center p-1 rounded text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer print:hidden"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#C7D3E8] align-top">
                              {allowManageCurrent ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={item.namaDokumen}
                                    onChange={(e) =>
                                      handleCustomRcFieldChange(
                                        item.id,
                                        'namaDokumen',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Nama Dokumen Readiness Criteria..."
                                    className="w-full px-2 py-1 text-xs font-semibold text-[#061459] bg-white border border-[#C7D3E8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#061459]"
                                  />
                                  <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded">
                                    Isian Tambahan
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-semibold text-[#061459]">
                                    {item.namaDokumen}
                                  </div>
                                  <span className="inline-block mt-1 text-[10px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded">
                                    Isian Tambahan
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#C7D3E8] align-top">
                              {allowManageCurrent ? (
                                <input
                                  type="text"
                                  value={item.acuanStandar ?? ''}
                                  onChange={(e) =>
                                    handleCustomRcFieldChange(
                                      item.id,
                                      'acuanStandar',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Acuan / standar kelengkapan..."
                                  className="w-full px-2 py-1 text-[11px] text-slate-700 bg-white border border-[#C7D3E8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#061459]"
                                />
                              ) : (
                                <span className="text-[11px] text-slate-600 leading-relaxed">
                                  {item.acuanStandar || 'Dokumen pendukung tambahan sesuai kebutuhan verifikasi.'}
                                </span>
                              )}
                            </td>
                            {(
                              [
                                {
                                  key: 'ada',
                                  label: 'Ada',
                                  accent: 'text-emerald-700 accent-emerald-700',
                                },
                                {
                                  key: 'kurang',
                                  label: 'Kurang',
                                  accent: 'text-amber-700 accent-amber-600',
                                },
                                {
                                  key: 'sesuai',
                                  label: 'Sesuai',
                                  accent: 'text-blue-700 accent-blue-700',
                                },
                              ] as const
                            ).map((col) => {
                              const checked = flags[col.key];
                              return (
                                <td
                                  key={`custom-rc-${item.id}-${col.key}`}
                                  className="py-2.5 px-2 border-r border-[#C7D3E8] text-center align-top"
                                >
                                  {allowManageCurrent ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleCustomRcFlagToggle(item.id, col.key)}
                                      aria-label={`Detail ${item.namaDokumen} - ${col.label}`}
                                      className={`w-4 h-4 rounded border-slate-300 cursor-pointer ${col.accent}`}
                                    />
                                  ) : (
                                    <span
                                      className={`font-bold text-sm leading-none ${
                                        checked ? col.accent.split(' ')[0] : 'text-slate-300'
                                      }`}
                                    >
                                      {checked ? '✓' : '—'}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-2.5 border-r border-[#C7D3E8] text-center align-top">
                              <span
                                className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded border whitespace-nowrap ${statusMeta.badgeClass}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 align-top leading-relaxed">
                              {allowManageCurrent ? (
                                <textarea
                                  rows={2}
                                  value={item.keterangan}
                                  onChange={(e) =>
                                    handleCustomRcFieldChange(
                                      item.id,
                                      'keterangan',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Isi keterangan & catatan verifikasi dokumen tambahan..."
                                  className="w-full px-2 py-1 text-xs bg-white border border-[#C7D3E8] rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#061459]"
                                />
                              ) : (
                                <div className="text-xs text-slate-700 whitespace-pre-wrap">
                                  {item.keterangan || 'Belum ada keterangan tambahan.'}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Form & Bilah Aksi Tambah Isian Baru Dokumen Readiness Criteria */}
                {allowManageCurrent && (
                  <div className="print:hidden space-y-3">
                    {!showNewRcForm ? (
                      <div className="px-3.5 py-2.5 rounded-xl bg-[#EEF2FA] border border-[#C7D3E8] flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-slate-700 flex flex-wrap items-center gap-2">
                          <span>
                            {customRcDraft.length > 0
                              ? `Terdapat ${customRcDraft.length} isian dokumen RC tambahan.`
                              : 'Butuh dokumen RC tambahan di luar 6 item standar? Tambahkan baris isian baru di sini.'}
                          </span>
                          {rcSaveNotice && (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {rcSaveNotice}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewRcForm(true);
                            setNewRcError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#061459] hover:bg-[#0A1D6E] text-white border border-[#E89611]/70 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#E89611]" />
                          <span>Tambah Isian Baru Dokumen RC</span>
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleAddCustomRcItem}
                        className="border border-[#061459]/30 rounded-xl p-4 bg-[#F8FAFE] space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C7D3E8] pb-2">
                          <div className="text-xs font-bold text-[#061459]">
                            Isian Baru Dokumen Readiness Criteria (RC)
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Otomatis tersimpan ke tabel Detail Status RC
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#061459] mb-1">
                              Nama Dokumen Readiness Criteria <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={newRcNama}
                              onChange={(e) => {
                                setNewRcNama(e.target.value);
                                if (newRcError) setNewRcError(null);
                              }}
                              placeholder="Contoh: Surat Rekomendasi Teknis / Berita Acara Kesepakatan Lahan"
                              className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#061459] mb-1">
                              Acuan / Standar Kelengkapan (Opsional)
                            </label>
                            <input
                              type="text"
                              value={newRcAcuan}
                              onChange={(e) => setNewRcAcuan(e.target.value)}
                              placeholder="Contoh: Ditandatangani pejabat berwenang / Sesuai ketentuan KemenPU"
                              className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-5">
                            <div className="block text-[11px] font-semibold text-[#061459] mb-1.5">
                              Status Checklist Dokumen
                            </div>
                            <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-white border border-[#C7D3E8]">
                              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newRcAda}
                                  onChange={(e) => setNewRcAda(e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 accent-emerald-700 cursor-pointer"
                                />
                                <span>Ada</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newRcKurang}
                                  onChange={(e) => setNewRcKurang(e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 accent-amber-600 cursor-pointer"
                                />
                                <span>Kurang</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newRcSesuai}
                                  onChange={(e) => setNewRcSesuai(e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 accent-blue-700 cursor-pointer"
                                />
                                <span>Sesuai</span>
                              </label>
                              <span
                                className={`ml-auto inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${
                                  getRcRowStatusMeta({
                                    ada: newRcAda,
                                    kurang: newRcKurang,
                                    sesuai: newRcSesuai,
                                  }).badgeClass
                                }`}
                              >
                                {
                                  getRcRowStatusMeta({
                                    ada: newRcAda,
                                    kurang: newRcKurang,
                                    sesuai: newRcSesuai,
                                  }).label
                                }
                              </span>
                            </div>
                          </div>

                          <div className="md:col-span-7">
                            <label className="block text-[11px] font-semibold text-[#061459] mb-1">
                              Keterangan &amp; Catatan Verifikasi
                            </label>
                            <input
                              type="text"
                              value={newRcKeterangan}
                              onChange={(e) => setNewRcKeterangan(e.target.value)}
                              placeholder="Catatan kondisi dokumen, nomor surat, atau tindak lanjut yang diperlukan..."
                              className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                            />
                          </div>
                        </div>

                        {newRcError && (
                          <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                            {newRcError}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewRcForm(false);
                              setNewRcError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-[#C7D3E8] rounded-lg transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambahkan &amp; Simpan ke Tabel RC</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* 5 Indikator Kesiapan Inti & Catatan Sinkronisasi Balai */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  <div className="lg:col-span-7 border border-[#C7D3E8] rounded-xl p-3.5 bg-[#F8FAFE]">
                    <div className="text-xs font-bold text-[#061459] mb-2">
                      5 Indikator Inti Readiness Criteria (RC)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CORE_READINESS_META.map((item) => {
                        const checked = proposal.readiness[item.key];
                        const content = (
                          <div className="flex items-start gap-2 text-left">
                            {checked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-500">{item.desc}</div>
                            </div>
                          </div>
                        );

                        if (allowManageCurrent) {
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => onToggleReadiness(proposal.id, item.key)}
                              className="p-2 rounded-lg bg-white border border-[#C7D3E8] hover:border-[#061459] transition-colors cursor-pointer text-left"
                            >
                              {content}
                            </button>
                          );
                        }

                        return (
                          <div
                            key={item.key}
                            className="p-2 rounded-lg bg-white border border-[#C7D3E8]"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-5 border border-[#C7D3E8] rounded-xl p-3.5 bg-[#F8FAFE] flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#061459] mb-1.5">
                        Catatan Teknis &amp; Tindak Lanjut Verifikasi Balai
                      </div>
                      {allowManageCurrent ? (
                        <>
                          <textarea
                            rows={3}
                            value={catatanTeknisDraft}
                            onChange={(e) => setCatatanTeknisDraft(e.target.value)}
                            placeholder="Isi catatan teknis, progres lahan, DED, atau tindak lanjut verifikasi balai..."
                            className="w-full px-2.5 py-2 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#061459] print:hidden"
                          />
                          <p className="hidden print:block text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {catatanTeknisDraft.trim() ||
                              'Belum ada catatan teknis tambahan untuk usulan ini.'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {catatanTeknisDraft.trim() ||
                            'Belum ada catatan teknis tambahan untuk usulan ini.'}
                        </p>
                      )}
                    </div>

                    {allowManageCurrent && onSaveProposal && (
                      <div className="pt-2 border-t border-[#D7E0F0] flex flex-wrap items-center justify-between gap-2 print:hidden">
                        <span className="text-[11px] text-slate-500">
                          Simpan seluruh perubahan status, metadata, isian baru &amp; catatan RC.
                        </span>
                        <button
                          type="button"
                          onClick={handleCommitInlinePreviewSave}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap ml-auto"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Perubahan Detail RC</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Data Pengesahan & Persetujuan di Bagian Bawah Detail Status RC (di bawah 5 Indikator Inti RC) */}
                {!isTemplateDemo && (
                  <div
                    id="profil-pdf-signatory-panel"
                    aria-label="Data Pengesahan Cetak PDF Profil Usulan"
                    className="bg-white border border-[#C7D3E8] rounded-xl overflow-hidden break-inside-avoid print:border-slate-200"
                  >
                    <div className="px-4 py-2.5 bg-[#061459] text-white border-b-2 border-[#E89611] flex flex-wrap items-center justify-between gap-2 print:hidden">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Pengesahan &amp; Persetujuan (Cetak PDF)
                        </h4>
                        <p className="text-[11px] text-indigo-200 mt-0.5">
                          Ditampilkan di bagian bawah Detail Status Readiness Criteria (RC) di bawah 5 Indikator Inti RC saat Preview atau Cetak PDF
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSignatories(createEmptyProfilSignatories())}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        title="Kosongkan nama dan jabatan pengesah"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Kolom</span>
                      </button>
                    </div>

              <div className="p-4 sm:p-5 print:hidden space-y-4">
                <div className="max-w-xs">
                  <label className="block text-[11px] font-semibold text-[#061459] mb-1">
                    Tempat &amp; Tanggal (Sebelah Kanan)
                  </label>
                  <input
                    type="text"
                    value={signatories.tempatTanggal}
                    onChange={(e) =>
                      setSignatories((prev) => ({
                        ...prev,
                        tempatTanggal: e.target.value,
                      }))
                    }
                    placeholder="Contoh: Mataram, 17 November 2026"
                    className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Mengesahkan 1 */}
                  <div className="space-y-3 border border-[#C7D3E8] rounded-xl p-4 bg-[#F8FAFE]">
                    <div className="text-xs font-bold text-[#061459]">
                      Mengesahkan 1
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Jabatan
                      </label>
                      <input
                        type="text"
                        value={signatories.mengesahkan.jabatan}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            mengesahkan: {
                              ...prev.mengesahkan,
                              jabatan: e.target.value,
                            },
                          }))
                        }
                        placeholder="Contoh: Kepala BPBPK Provinsi NTB"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Nama Lengkap &amp; Gelar
                      </label>
                      <input
                        type="text"
                        value={signatories.mengesahkan.nama}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            mengesahkan: {
                              ...prev.mengesahkan,
                              nama: e.target.value,
                            },
                          }))
                        }
                        placeholder="Nama pejabat yang mengesahkan"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                      />
                    </div>
                  </div>

                  {/* Mengesahkan 2 (kolom tengah) */}
                  <div className="space-y-3 border border-[#C7D3E8] rounded-xl p-4 bg-[#F8FAFE]">
                    <div className="text-xs font-bold text-[#061459]">
                      Mengesahkan 2
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Jabatan
                      </label>
                      <input
                        type="text"
                        value={signatories.mengesahkan3?.jabatan ?? ''}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            mengesahkan3: {
                              jabatan: e.target.value,
                              nama: prev.mengesahkan3?.nama ?? '',
                            },
                          }))
                        }
                        placeholder="Contoh: Kepala Bappeda Provinsi NTB"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Nama Lengkap &amp; Gelar
                      </label>
                      <input
                        type="text"
                        value={signatories.mengesahkan3?.nama ?? ''}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            mengesahkan3: {
                              jabatan: prev.mengesahkan3?.jabatan ?? '',
                              nama: e.target.value,
                            },
                          }))
                        }
                        placeholder="Nama pejabat yang mengesahkan"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                      />
                    </div>
                  </div>

                  {/* Sebelah Kanan: Menyetujui */}
                  <div className="space-y-3 border border-[#C7D3E8] rounded-xl p-4 bg-[#F8FAFE]">
                    <div className="text-xs font-bold text-[#061459]">
                      Menyetujui (Sebelah Kanan)
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Jabatan
                      </label>
                      <input
                        type="text"
                        value={signatories.menyetujui.jabatan}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            menyetujui: {
                              ...prev.menyetujui,
                              jabatan: e.target.value,
                            },
                          }))
                        }
                        placeholder="Contoh: Ketua Tim Sinkronisasi Program"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Nama Lengkap &amp; Gelar
                      </label>
                      <input
                        type="text"
                        value={signatories.menyetujui.nama}
                        onChange={(e) =>
                          setSignatories((prev) => ({
                            ...prev,
                            menyetujui: {
                              ...prev.menyetujui,
                              nama: e.target.value,
                            },
                          }))
                        }
                        placeholder="Nama pejabat yang menyetujui"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Print-only Formal Signature Block */}
              <div className="hidden print:grid print:grid-cols-3 gap-6 py-4 px-5 text-center text-xs text-slate-900">
                {[
                  signatories.mengesahkan,
                  signatories.mengesahkan3 ?? { jabatan: '', nama: '' },
                ].map((party, idx) => (
                  <div
                    key={`profil-print-mengesahkan-${idx}`}
                    className="flex flex-col items-center justify-between min-h-[110px]"
                  >
                    <div>
                      <div className="h-4" />
                      <div className="font-bold">Mengesahkan,</div>
                      {party.jabatan.trim() && (
                        <div className="text-[11px] text-slate-700 mt-0.5 max-w-[190px]">
                          {party.jabatan.trim()}
                        </div>
                      )}
                    </div>
                    <div className="pt-10">
                      <div className="font-bold underline underline-offset-4">
                        {party.nama.trim() || '( .............................. )'}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex flex-col items-center justify-between min-h-[110px]">
                  <div>
                    <div className="text-[11px] text-slate-700 h-4">
                      {signatories.tempatTanggal.trim()}
                    </div>
                    <div className="font-bold">Menyetujui,</div>
                    {signatories.menyetujui.jabatan.trim() && (
                      <div className="text-[11px] text-slate-700 mt-0.5 max-w-[190px]">
                        {signatories.menyetujui.jabatan.trim()}
                      </div>
                    )}
                  </div>
                    <div className="pt-10">
                      <div className="font-bold underline underline-offset-4">
                        {signatories.menyetujui.nama.trim() ||
                          '( .............................. )'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                )}
              </div>
            </section>
          </div>
          <div className="h-2 w-full batik-pu-strip border-t-2 border-[#E89611] shrink-0" aria-hidden="true" />
        </div>
      </div>

      <ProposalPdfPreviewOverlay
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        onDownloadPdf={() => {
          void (async () => {
            const [wordmarkDataUrl, batikAssets] = await Promise.all([
              loadPuWordmarkDataUrl(),
              loadPuBatikAssets(),
            ]);
            exportProposalProfilePdf({
              ...pdfPreviewInput,
              wordmarkDataUrl,
              batikAssets,
            });
          })();
        }}
        onPrintDirect={() => window.print()}
        onEditSignatories={() => {
          setShowDetailedRc(true);
          window.setTimeout(() => {
            const el = document.getElementById('profil-pdf-signatory-panel');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }}
        onToggleIncludeDetailRc={(nextVal) => setIncludeDetailRcInPdf(nextVal)}
        pdfInput={pdfPreviewInput}
      />
    </div>
  );
};
