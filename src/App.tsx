import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  BarChart3,
  Edit3,
  Eye,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Plus,
  Save,
  ShieldCheck,
  Table2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { AccessPortalView } from './components/AccessPortalView';
import { AnalyticsView } from './components/AnalyticsView';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ProposalDetailPanel } from './components/ProposalDetailPanel';
import { ProposalFormDrawer } from './components/ProposalFormDrawer';
import { ProposalPreviewModal } from './components/ProposalPreviewModal';
import { ProposalTable } from './components/ProposalTable';
import { SpatialMapView } from './components/SpatialMapView';
import {
  exportProposalsAsCsv,
  exportProposalsAsGeoJson,
  formatRpMiliar,
  getPaguForYearFilter,
  getReadinessScore,
  INITIAL_PROPOSALS,
  isActiveInYear,
  SEKTOR_SHORT_LABELS,
  TEMPLATE_DEMO_PROPOSAL,
} from './data/initialProposals';
import { useSpatialResolver } from './hooks/useSpatialResolver';
import {
  db,
  deleteProposalsFromFirestore,
  EDITOR_OPERATOR_UID,
  ensureEditorSession,
  extractQuotaNoticeFromError,
  fetchPublishedProposalsOnce,
  fromFirestoreProposalDoc,
  getPendingMutationCount,
  handleFirestoreError,
  hasActivePinSession,
  isSystemBootstrapped,
  OperationType,
  restoreDeletedProposalsToFirestore,
  saveProposalToFirestore,
  seedProposalsBatchIfEmpty,
  signOutAccount,
  subscribeMutationStatus,
  syncProposalsSnapshotToFirestore,
  updateProposalCoordinatesInFirestore,
  updateProposalReadinessInFirestore,
  updateProposalSkorRcInFirestore,
} from './lib/firebase';
import {
  AccessMode,
  AccountSessionProfile,
  LatLngPoint,
  ReadinessCriteria,
  ResolvedPlaceInfo,
  SektorCiptaKarya,
  StatusVerifikasi,
  UsulanProgram,
  WorkspaceView,
} from './types/ciptaKarya';

const STORAGE_KEY = 'simpra_ntb_ta_2027_2030_clean_v3';
const LOCAL_BOOTSTRAP_KEY = 'simpra_ntb_bootstrapped_clean_v3';
const SESSION_MODE_KEY = 'simpra_ntb_pin_mode_v1';
const ACCOUNT_PROFILE_STORAGE_KEY = 'simpra_ntb_pin_profile_v1';

const DEFAULT_ACCOUNT_PROFILE: AccountSessionProfile = {
  displayName: 'Pengelola SIMPRA BPBPK NTB',
  unitKerja: 'Tim Sinkronisasi Program BPBPK Nusa Tenggara Barat',
  loginMethod: 'pin',
};

type YearFilter = 'ALL' | '2027' | '2028' | '2029' | '2030';
type SektorFilter = 'ALL' | SektorCiptaKarya;

function normalizeProposalSektor(raw: UsulanProgram): UsulanProgram {
  const sektorStr = String(raw.sektor);
  if (sektorStr.includes('PLP') || sektorStr.includes('Penyehatan Lingkungan')) {
    return { ...raw, sektor: SektorCiptaKarya.SANITASI };
  }
  if (sektorStr.includes('PKP') || sektorStr.includes('Kawasan Permukiman')) {
    return { ...raw, sektor: SektorCiptaKarya.KAWASAN_STRATEGIS };
  }
  if (sektorStr.includes('BGL') || sektorStr.includes('Bangunan Gedung')) {
    return { ...raw, sektor: SektorCiptaKarya.BINA_PENATAAN_BANGUNAN };
  }
  return raw;
}

function readInitialLocalProposals(): UsulanProgram[] {
  try {
    // Purge legacy sample proposal caches so removed proposals do not reappear
    localStorage.removeItem('sipaki_ntb_ta_2027_2030_v2');
    localStorage.removeItem('sipro_ciptakarya_ta_2027_2030_v1');
    localStorage.removeItem('simpra_ntb_bootstrapped_v1');

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as UsulanProgram[];
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeProposalSektor);
      }
    }
  } catch (e) {
    console.warn('Gagal memuat data lokal awal:', e);
  }
  return INITIAL_PROPOSALS;
}

function getInitialAccessModeFromUrlOrSession(): AccessMode {
  try {
    const savedMode = sessionStorage.getItem(SESSION_MODE_KEY);
    if (savedMode === 'account' && hasActivePinSession()) {
      return 'account';
    }
  } catch {
    // Ignore restricted sessionStorage errors
  }
  return 'portal';
}

function readInitialAccountProfile(): AccountSessionProfile {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AccountSessionProfile>;
      if (typeof parsed.displayName === 'string') {
        return {
          displayName: parsed.displayName || DEFAULT_ACCOUNT_PROFILE.displayName,
          unitKerja: parsed.unitKerja || DEFAULT_ACCOUNT_PROFILE.unitKerja,
          loginMethod: 'pin',
        };
      }
    }
  } catch {
    // Ignore restricted localStorage errors
  }
  return DEFAULT_ACCOUNT_PROFILE;
}

function sortProposalsStable(items: UsulanProgram[]): UsulanProgram[] {
  return [...items].sort((a, b) => a.kodeUsulan.localeCompare(b.kodeUsulan));
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const VIEW_LABELS: Record<WorkspaceView, string> = {
  [WorkspaceView.OVERVIEW]: 'Ikhtisar & Peta Terpadu',
  [WorkspaceView.SPATIAL]: 'Eksplorasi Data Spasial',
  [WorkspaceView.MATRIX]: 'Matriks Usulan & Kesiapan RC',
  [WorkspaceView.BUDGET]: 'Proyeksi Anggaran 2027–2030',
};

function DashboardWorkspace() {
  const [proposals, setProposals] = useState<UsulanProgram[]>(() => readInitialLocalProposals());
  const proposalsRef = useRef<UsulanProgram[]>(proposals);
  proposalsRef.current = proposals;
  const bootstrappedRef = useRef<boolean>(false);
  const deferredSnapshotRef = useRef<UsulanProgram[] | null>(null);

  const [dbQuotaAlert, setDbQuotaAlert] = useState<{
    message: string;
    upgradeUrl?: string;
  } | null>(null);
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false);

  const [accessMode, setAccessMode] = useState<AccessMode>(() =>
    getInitialAccessModeFromUrlOrSession()
  );
  const [accountProfile, setAccountProfile] = useState<AccountSessionProfile>(() =>
    readInitialAccountProfile()
  );

  const markLocalBootstrapped = useCallback(() => {
    bootstrappedRef.current = true;
    try {
      localStorage.setItem(LOCAL_BOOTSTRAP_KEY, 'true');
    } catch {
      // Ignore localStorage restrictions
    }
  }, []);

  const updateAccessMode = useCallback((nextMode: AccessMode) => {
    setAccessMode(nextMode);
    try {
      sessionStorage.setItem(SESSION_MODE_KEY, nextMode);
    } catch {
      // Ignore sessionStorage restrictions
    }
  }, []);

  // Keep local proposal cache synchronized whenever proposals state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
    } catch {
      // Ignore localStorage quota/restriction errors
    }
  }, [proposals]);

  // Apply any deferred Firestore snapshot once all queued mutations settle
  useEffect(() => {
    return subscribeMutationStatus((pendingCount) => {
      if (pendingCount === 0 && deferredSnapshotRef.current !== null) {
        const latest = deferredSnapshotRef.current;
        deferredSnapshotRef.current = null;
        if (bootstrappedRef.current || latest.length > 0) {
          setProposals(sortProposalsStable(latest));
        }
      }
    });
  }, []);

  // Real-time Firestore listener and automatic session initialization in Editor Mode ('account')
  useEffect(() => {
    if (accessMode !== 'account') return;

    let cancelled = false;
    const localFallback = readInitialLocalProposals();

    const initAndSubscribe = async () => {
      try {
        await ensureEditorSession();
        const ready = await seedProposalsBatchIfEmpty(localFallback);
        if (ready && !cancelled) {
          markLocalBootstrapped();
          if (getPendingMutationCount() === 0 && deferredSnapshotRef.current !== null) {
            const latest = deferredSnapshotRef.current;
            deferredSnapshotRef.current = null;
            setProposals(sortProposalsStable(latest));
          }
        }
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota && !cancelled) {
          setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
        }
      }
    };

    void initAndSubscribe();

    const q = query(collection(db, 'proposals'), where('isPublished', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (cancelled) return;
        const docs = snapshot.docs.map((d) => fromFirestoreProposalDoc(d.id, d.data()));
        if (docs.length > 0) {
          markLocalBootstrapped();
        }

        if (getPendingMutationCount() > 0) {
          deferredSnapshotRef.current = docs;
          return;
        }

        deferredSnapshotRef.current = null;
        if (docs.length > 0 || bootstrappedRef.current) {
          setProposals(sortProposalsStable(docs));
        } else {
          void isSystemBootstrapped().then((booted) => {
            if (!cancelled && booted && getPendingMutationCount() === 0) {
              markLocalBootstrapped();
              setProposals(sortProposalsStable(docs));
            }
          });
        }
      },
      (error) => {
        const quota = extractQuotaNoticeFromError(error);
        if (quota) {
          setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
          return;
        }
        try {
          handleFirestoreError(error, OperationType.LIST, 'proposals');
        } catch {
          // Logged structured FirestoreErrorInfo for diagnostics
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [accessMode, markLocalBootstrapped]);

  // Firestore read when on Login Portal so package count reflects live persisted data
  const refreshPortalProposals = useCallback(async () => {
    try {
      const { items: remoteItems, bootstrapped } = await fetchPublishedProposalsOnce();
      if (bootstrapped || remoteItems.length > 0) {
        markLocalBootstrapped();
        setProposals(sortProposalsStable(remoteItems));
      }
    } catch (err) {
      const quota = extractQuotaNoticeFromError(err);
      if (quota) {
        setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
      }
    }
  }, [markLocalBootstrapped]);

  useEffect(() => {
    if (accessMode === 'account') return;
    void refreshPortalProposals();
  }, [accessMode, refreshPortalProposals]);

  const canEdit = accessMode === 'account';

  const canManageProposal = useCallback(
    (_proposal: UsulanProgram): boolean => {
      return canEdit;
    },
    [canEdit]
  );

  const { resolvedPlaces, isResolving, resolverError, registerResolvedPlace } =
    useSpatialResolver(proposals);

  const [activeView, setActiveView] = useState<WorkspaceView>(WorkspaceView.OVERVIEW);
  const [yearFilter, setYearFilter] = useState<YearFilter>('ALL');
  const [sektorFilter, setSektorFilter] = useState<SektorFilter>('ALL');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState<number>(0);

  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingProposal, setEditingProposal] = useState<UsulanProgram | null>(null);
  const [previewProposalId, setPreviewProposalId] = useState<string | null>(null);
  const [showTemplateDemo, setShowTemplateDemo] = useState<boolean>(false);
  const [pendingDeleteTargets, setPendingDeleteTargets] = useState<UsulanProgram[]>([]);
  const [lastDeletedItems, setLastDeletedItems] = useState<UsulanProgram[]>([]);
  const [pickingProposalId, setPickingProposalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (proposals.length === 0) {
      if (selectedProposalId !== null) setSelectedProposalId(null);
      return;
    }
    if (!selectedProposalId || !proposals.some((p) => p.id === selectedProposalId)) {
      setSelectedProposalId(proposals[0].id);
    }
  }, [proposals, selectedProposalId]);

  const mapSectionRef = useRef<HTMLDivElement>(null);

  const showNotice = useCallback((msg: string, clearUndo = true) => {
    if (clearUndo) setLastDeletedItems([]);
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastDeletedItems([]);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleEnterAccount = useCallback(
    (profile: AccountSessionProfile) => {
      setAccountProfile(profile);
      try {
        localStorage.setItem(ACCOUNT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Ignore restricted localStorage errors
      }
      updateAccessMode('account');
    },
    [updateAccessMode]
  );

  const handleLogoutAccount = useCallback(async () => {
    setDrawerOpen(false);
    setEditingProposal(null);
    setPickingProposalId(null);
    setPendingDeleteTargets([]);
    setPreviewProposalId(null);
    setShowTemplateDemo(false);
    await signOutAccount();
    updateAccessMode('portal');
  }, [updateAccessMode]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (sektorFilter !== 'ALL' && p.sektor !== sektorFilter) return false;
      if (!isActiveInYear(p, yearFilter)) return false;
      return true;
    });
  }, [proposals, sektorFilter, yearFilter]);

  const selectedProposal = useMemo(() => {
    if (!selectedProposalId) return null;
    return proposals.find((p) => p.id === selectedProposalId) ?? null;
  }, [proposals, selectedProposalId]);

  const previewProposal = useMemo(() => {
    if (!previewProposalId) return null;
    return proposals.find((p) => p.id === previewProposalId) ?? null;
  }, [proposals, previewProposalId]);

  const pickingProposal = useMemo(() => {
    if (!pickingProposalId) return null;
    return proposals.find((p) => p.id === pickingProposalId) ?? null;
  }, [proposals, pickingProposalId]);

  const kpis = useMemo(() => {
    const count = filteredProposals.length;
    const totalPagu = filteredProposals.reduce(
      (sum, p) => sum + getPaguForYearFilter(p, yearFilter),
      0
    );
    const totalBeneficiaries = filteredProposals.reduce(
      (sum, p) => sum + p.penerimaManfaatJiwa,
      0
    );
    const verifiedCount = filteredProposals.filter(
      (p) => p.statusVerifikasi === StatusVerifikasi.TERVERIFIKASI
    ).length;
    const avgReadiness =
      count > 0
        ? Math.round(
            filteredProposals.reduce(
              (sum, p) => sum + getReadinessScore(p.readiness, p.skorRc).percentage,
              0
            ) / count
          )
        : 0;
    const mycCount = filteredProposals.filter((p) => p.skemaKontrak === 'MYC').length;

    return {
      count,
      mycCount,
      totalPagu: Number(totalPagu.toFixed(1)),
      totalBeneficiaries,
      verifiedCount,
      avgReadiness,
    };
  }, [filteredProposals, yearFilter]);

  const handleFocusOnMap = useCallback(
    (id: string) => {
      setSelectedProposalId(id);
      if (activeView === WorkspaceView.MATRIX || activeView === WorkspaceView.BUDGET) {
        setActiveView(WorkspaceView.SPATIAL);
      }
      setFocusTrigger((c) => c + 1);
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [activeView]
  );

  const handleStartPickCoordinate = useCallback(
    (proposal: UsulanProgram) => {
      if (!canEdit) return;
      setPickingProposalId(proposal.id);
      setSelectedProposalId(proposal.id);
      if (activeView === WorkspaceView.MATRIX || activeView === WorkspaceView.BUDGET) {
        setActiveView(WorkspaceView.SPATIAL);
      }
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [activeView, canEdit]
  );

  const handlePickCoordinate = useCallback(
    async (pos: LatLngPoint) => {
      if (!pickingProposalId || !canEdit) return;
      const label = `Titik Spasial (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`;
      const targetId = pickingProposalId;
      const targetProposal = proposals.find((p) => p.id === targetId);

      setProposals((prev) =>
        prev.map((p) =>
          p.id === targetId
            ? {
                ...p,
                manualPosition: pos,
                manualAddressLabel: label,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : p
        )
      );
      setPickingProposalId(null);
      markLocalBootstrapped();

      try {
        await updateProposalCoordinatesInFirestore(targetId, pos, label, targetProposal);
        showNotice(
          `Titik koordinat diperbarui ke ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} dan tersimpan otomatis.`
        );
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
        showNotice('Titik koordinat tersimpan di perangkat ini (sinkronisasi Cloud tertunda).');
      }
    },
    [pickingProposalId, canEdit, proposals, markLocalBootstrapped, showNotice]
  );

  const handleToggleReadiness = useCallback(
    async (id: string, key: keyof ReadinessCriteria) => {
      if (!canEdit) return;
      const target = proposals.find((p) => p.id === id);
      if (!target) return;

      const nextReadiness: ReadinessCriteria = {
        ...target.readiness,
        [key]: !target.readiness[key],
      };

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                readiness: nextReadiness,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : p
        )
      );
      markLocalBootstrapped();

      try {
        await updateProposalReadinessInFirestore(
          id,
          nextReadiness,
          target.statusVerifikasi,
          target
        );
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
        showNotice('Perubahan dokumen RC tersimpan secara lokal (sinkronisasi Cloud tertunda).');
      }
    },
    [canEdit, proposals, markLocalBootstrapped, showNotice]
  );

  const handleUpdateSkorRc = useCallback(
    async (id: string, rawScore: number) => {
      if (!canEdit) return;
      const target = proposals.find((p) => p.id === id);
      if (!target) return;

      const clampedScore = Math.min(100, Math.max(0, Number(rawScore.toFixed(1))));

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                skorRc: clampedScore,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : p
        )
      );
      markLocalBootstrapped();

      try {
        await updateProposalSkorRcInFirestore(id, clampedScore, target);
        showNotice(
          `Skor RC manual usulan "${target.kodeUsulan}" (${clampedScore}%) tersimpan otomatis.`
        );
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
        showNotice('Skor RC manual tersimpan secara lokal (sinkronisasi Cloud tertunda).');
      }
    },
    [canEdit, proposals, markLocalBootstrapped, showNotice]
  );

  const handleAutoSaveProposal = useCallback(
    async (saved: UsulanProgram, resolvedFromSearch?: ResolvedPlaceInfo) => {
      if (!canEdit) return;
      if (resolvedFromSearch) {
        registerResolvedPlace(saved.locationQuery, resolvedFromSearch);
      }
      const enriched: UsulanProgram = {
        ...saved,
        authorUid: saved.authorUid || EDITOR_OPERATOR_UID,
        isPublished: true,
      };

      setProposals((prev) =>
        sortProposalsStable(
          prev.some((p) => p.id === enriched.id)
            ? prev.map((p) => (p.id === enriched.id ? enriched : p))
            : [enriched, ...prev]
        )
      );
      markLocalBootstrapped();

      try {
        await saveProposalToFirestore(enriched);
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
      }
    },
    [canEdit, markLocalBootstrapped, registerResolvedPlace]
  );

  const handleSaveProposal = useCallback(
    async (
      saved: UsulanProgram,
      resolvedFromSearch?: ResolvedPlaceInfo,
      keepOpen = false
    ) => {
      if (!canEdit) return;
      if (resolvedFromSearch) {
        registerResolvedPlace(saved.locationQuery, resolvedFromSearch);
      }
      const enriched: UsulanProgram = {
        ...saved,
        authorUid: saved.authorUid || EDITOR_OPERATOR_UID,
        isPublished: true,
      };

      setProposals((prev) =>
        sortProposalsStable(
          prev.some((p) => p.id === enriched.id)
            ? prev.map((p) => (p.id === enriched.id ? enriched : p))
            : [enriched, ...prev]
        )
      );
      setSelectedProposalId(enriched.id);
      if (keepOpen) {
        setEditingProposal(enriched);
      } else {
        setDrawerOpen(false);
        setEditingProposal(null);
      }
      markLocalBootstrapped();

      try {
        const { wasExisting } = await saveProposalToFirestore(enriched);
        showNotice(
          wasExisting
            ? `Perubahan pada usulan "${enriched.kodeUsulan}" berhasil disimpan.`
            : `Usulan baru "${enriched.kodeUsulan}" berhasil ditambahkan dan disimpan.`
        );
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
        showNotice('Data usulan tersimpan secara lokal (sinkronisasi Cloud tertunda).');
      }
    },
    [canEdit, markLocalBootstrapped, registerResolvedPlace, showNotice]
  );

  const handleSaveSingleFromPanel = useCallback(
    async (target: UsulanProgram) => {
      if (!canEdit) return;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await new Promise((resolve) => setTimeout(resolve, 25));

      const latest = proposalsRef.current.find((p) => p.id === target.id) ?? target;
      const enriched: UsulanProgram = {
        ...latest,
        authorUid: latest.authorUid || EDITOR_OPERATOR_UID,
        isPublished: true,
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      setProposals((prev) =>
        sortProposalsStable(
          prev.some((p) => p.id === enriched.id)
            ? prev.map((p) => (p.id === enriched.id ? enriched : p))
            : [enriched, ...prev]
        )
      );
      markLocalBootstrapped();

      try {
        await saveProposalToFirestore(enriched);
        showNotice(`Perubahan pada usulan "${enriched.kodeUsulan}" berhasil disimpan.`);
      } catch (err) {
        const quota = extractQuotaNoticeFromError(err);
        if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
        showNotice('Perubahan usulan tersimpan secara lokal (sinkronisasi Cloud tertunda).');
      }
    },
    [canEdit, markLocalBootstrapped, showNotice]
  );

  const handleManualSaveAll = useCallback(async () => {
    if (!canEdit || isSavingManual) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((resolve) => setTimeout(resolve, 25));

    setIsSavingManual(true);
    markLocalBootstrapped();
    const snapshot = proposalsRef.current;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore localStorage restrictions
    }

    try {
      await syncProposalsSnapshotToFirestore(snapshot);
      showNotice(`Seluruh data usulan (${snapshot.length} paket) berhasil disimpan.`);
    } catch (err) {
      const quota = extractQuotaNoticeFromError(err);
      if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
      showNotice(
        `Data usulan (${snapshot.length} paket) tersimpan di perangkat ini (sinkronisasi Cloud tertunda).`
      );
    } finally {
      setIsSavingManual(false);
    }
  }, [canEdit, isSavingManual, markLocalBootstrapped, showNotice]);

  const handleRequestDeleteById = useCallback(
    (id: string) => {
      if (!canEdit) return;
      const found = proposals.find((p) => p.id === id);
      if (found && canManageProposal(found)) {
        setPendingDeleteTargets([found]);
      }
    },
    [canEdit, proposals, canManageProposal]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!canEdit || pendingDeleteTargets.length === 0) return;
    const allowedTargets = pendingDeleteTargets.filter((t) => canManageProposal(t));
    if (allowedTargets.length === 0) {
      setPendingDeleteTargets([]);
      return;
    }

    const idsToRemove = new Set(allowedTargets.map((t) => t.id));
    const removedSnapshot = [...allowedTargets];

    markLocalBootstrapped();
    setProposals((prev) => {
      const remaining = prev.filter((p) => !idsToRemove.has(p.id));
      if (selectedProposalId && idsToRemove.has(selectedProposalId)) {
        setSelectedProposalId(remaining[0]?.id ?? null);
      }
      if (previewProposalId && idsToRemove.has(previewProposalId)) {
        setPreviewProposalId(null);
      }
      return remaining;
    });
    setPendingDeleteTargets([]);

    try {
      await deleteProposalsFromFirestore(Array.from(idsToRemove));
      setLastDeletedItems(removedSnapshot);
      setToastMessage(
        removedSnapshot.length === 1
          ? `Usulan "${removedSnapshot[0].kodeUsulan}" telah dihapus dan tersimpan otomatis.`
          : `${removedSnapshot.length} usulan program telah dihapus dan tersimpan otomatis.`
      );
    } catch (err) {
      const quota = extractQuotaNoticeFromError(err);
      if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
      showNotice('Usulan dihapus secara lokal (sinkronisasi Cloud tertunda).');
    }
  }, [
    canEdit,
    pendingDeleteTargets,
    canManageProposal,
    markLocalBootstrapped,
    selectedProposalId,
    previewProposalId,
    showNotice,
  ]);

  const handleUndoDelete = useCallback(async () => {
    if (!canEdit || lastDeletedItems.length === 0) return;
    const snapshotToRestore = [...lastDeletedItems];

    markLocalBootstrapped();
    setProposals((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const restored = snapshotToRestore.filter((item) => !existingIds.has(item.id));
      return sortProposalsStable([...restored, ...prev]);
    });
    if (snapshotToRestore[0]) {
      setSelectedProposalId(snapshotToRestore[0].id);
    }
    setLastDeletedItems([]);

    try {
      await restoreDeletedProposalsToFirestore(snapshotToRestore);
      setToastMessage('Penghapusan dibatalkan. Data usulan berhasil dipulihkan otomatis.');
    } catch (err) {
      const quota = extractQuotaNoticeFromError(err);
      if (quota) setDbQuotaAlert({ message: quota.message, upgradeUrl: quota.upgradeUrl });
      showNotice('Data usulan dipulihkan secara lokal (sinkronisasi Cloud tertunda).');
    }
  }, [canEdit, lastDeletedItems, markLocalBootstrapped, showNotice]);

  const handleOpenPreviewOrTemplate = useCallback(() => {
    const target = selectedProposal ?? filteredProposals[0] ?? proposals[0] ?? null;
    if (target) {
      setShowTemplateDemo(false);
      setSelectedProposalId(target.id);
      setPreviewProposalId(target.id);
    } else {
      setPreviewProposalId(null);
      setShowTemplateDemo(true);
    }
  }, [selectedProposal, filteredProposals, proposals]);

  const handleExportGeoJson = useCallback(() => {
    const geojson = exportProposalsAsGeoJson(filteredProposals, resolvedPlaces);
    downloadTextFile(
      geojson,
      `usulan-ciptakarya-${yearFilter.toLowerCase()}-spasial.geojson`,
      'application/geo+json'
    );
    showNotice('Berkas spasial GeoJSON berhasil diunduh.');
  }, [filteredProposals, resolvedPlaces, yearFilter, showNotice]);

  const handleExportCsv = useCallback(() => {
    const csv = exportProposalsAsCsv(filteredProposals, resolvedPlaces);
    downloadTextFile(
      csv,
      `matriks-usulan-ciptakarya-${yearFilter.toLowerCase()}.csv`,
      'text/csv;charset=utf-8;'
    );
    showNotice('Matriks CSV berhasil diunduh.');
  }, [filteredProposals, resolvedPlaces, yearFilter, showNotice]);

  const navItems: Array<{
    id: WorkspaceView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: WorkspaceView.OVERVIEW, label: 'Ikhtisar & Spasial', icon: LayoutDashboard },
    { id: WorkspaceView.SPATIAL, label: 'Eksplorasi Peta GIS', icon: MapIcon },
    { id: WorkspaceView.MATRIX, label: 'Matriks Usulan & RC', icon: Table2 },
    { id: WorkspaceView.BUDGET, label: 'Proyeksi 2027–2030', icon: BarChart3 },
  ];

  // Render PIN Sign-In Portal when mode is 'portal'
  if (accessMode === 'portal') {
    return (
      <AccessPortalView
        totalPackages={proposals.length}
        onEnterAccount={handleEnterAccount}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Workspace Sidebar (256px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col justify-between transition-transform duration-150 lg:static lg:translate-x-0 shrink-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              SIMPRA BPBPK NTB
            </span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Tutup navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-5">
            <nav className="space-y-1" aria-label="Menu Utama">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Sector Filter in Sidebar */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="px-3 text-[11px] font-medium text-slate-400 mb-2">
                Cakupan Sektor Teknis
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSektorFilter('ALL')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    sektorFilter === 'ALL'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Semua Sektor</span>
                  <span className="font-mono tabular-nums text-[11px]">{proposals.length}</span>
                </button>
                {Object.values(SektorCiptaKarya).map((sek) => {
                  const count = proposals.filter((p) => p.sektor === sek).length;
                  return (
                    <button
                      key={sek}
                      type="button"
                      onClick={() => setSektorFilter(sek)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        sektorFilter === sek
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate pr-2">{SEKTOR_SHORT_LABELS[sek]}</span>
                      <span className="font-mono tabular-nums text-[11px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Active PIN Session & Controls */}
        <div className="p-4 border-t border-slate-800 space-y-2.5">
          <div className="px-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{accountProfile.displayName}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {accountProfile.unitKerja}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              Sesi PIN Terverifikasi · Cloud Aktif
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenPreviewOrTemplate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Preview Usulan / Template</span>
          </button>

          <button
            type="button"
            onClick={() => void handleLogoutAccount()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi PIN</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb Trail Left — Account & Primary Actions Right */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden md:inline whitespace-nowrap">
                SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030
              </span>
              <span className="text-slate-300 hidden md:inline" aria-hidden="true">
                /
              </span>
              <span className="font-display font-semibold text-slate-900 truncate">
                {VIEW_LABELS[activeView]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden xl:inline text-xs text-slate-500 truncate max-w-[200px]">
              {accountProfile.displayName}
            </span>

            <button
              type="button"
              onClick={handleOpenPreviewOrTemplate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Buka tampilan Preview Usulan (Template KEMENPU)"
            >
              <Eye className="w-3.5 h-3.5 text-blue-700" />
              <span>Preview Usulan</span>
            </button>

            <button
              type="button"
              disabled={isSavingManual}
              onClick={() => void handleManualSaveAll()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Simpan seluruh perubahan edit maupun penambahan usulan"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingManual ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingProposal(null);
                setDrawerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Usulan</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLogoutAccount()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Keluar dari akun dan kembali ke halaman masuk"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Firestore Quota Notice if Triggered */}
        {dbQuotaAlert && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-6 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
            <span>
              {dbQuotaAlert.message}{' '}
              {dbQuotaAlert.upgradeUrl && (
                <a
                  href={dbQuotaAlert.upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  Lihat rincian kuota Firestore
                </a>
              )}
            </span>
            <button
              type="button"
              onClick={() => setDbQuotaAlert(null)}
              className="text-amber-800 hover:text-amber-950 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Action Feedback Banner with Undo Support */}
        {toastMessage && (
          <div className="bg-slate-900 text-white px-6 py-2.5 text-xs flex items-center justify-between gap-4">
            <span>{toastMessage}</span>
            <div className="flex items-center gap-3 shrink-0">
              {canEdit && lastDeletedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleUndoDelete()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer whitespace-nowrap"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Urungkan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setToastMessage(null);
                  setLastDeletedItems([]);
                }}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Workspace Viewport */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {/* Context Header & Interactive Year / Sector Segmented Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Dashboard Sinkronisasi Program Infrastruktur Cipta Karya Tahun Anggaran 2027–2030
              </h1>
            </div>

            {/* Interactive Year Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className="inline-flex items-center p-1 bg-slate-200/75 rounded-lg"
                role="group"
                aria-label="Filter Tahun Anggaran"
              >
                {(
                  [
                    { id: 'ALL', label: '2027–2030' },
                    { id: '2027', label: 'TA 2027' },
                    { id: '2028', label: 'TA 2028' },
                    { id: '2029', label: 'TA 2029' },
                    { id: '2030', label: 'TA 2030' },
                  ] as const
                ).map((yr) => (
                  <button
                    key={yr.id}
                    type="button"
                    onClick={() => setYearFilter(yr.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      yearFilter === yr.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {yr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4-Column Full-Width KPI Strip */}
          <section
            aria-label="Ringkasan Indikator Utama"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">Total Paket Usulan</div>
              <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {kpis.count} Paket
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <span>{kpis.mycCount} Kontrak Tahun Jamak (MYC)</span>
                <span aria-hidden="true"> · </span>
                <span>{kpis.count - kpis.mycCount} SYC</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">
                Kebutuhan Pagu ({yearFilter === 'ALL' ? 'TA 2027–2030' : `TA ${yearFilter}`})
              </div>
              <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-blue-700">
                {formatRpMiliar(kpis.totalPagu)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Akumulasi APBN RM, SBSN, dan PHLN
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">
                Kesiapan Teknis (Readiness Criteria)
              </div>
              <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {kpis.avgReadiness}%
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <span className="font-mono tabular-nums">{kpis.verifiedCount}</span> dari{' '}
                <span className="font-mono tabular-nums">{kpis.count}</span> paket terverifikasi
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">
                Estimasi Cakupan Penerima Manfaat
              </div>
              <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {kpis.totalBeneficiaries.toLocaleString('id-ID')} Jiwa
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Layanan SPAM, Sanitasi, PKS & Bina Penataan Bangunan
              </div>
            </div>
          </section>

          {/* VIEW 1: IKHTISAR & PETA TERPADU */}
          {activeView === WorkspaceView.OVERVIEW && (
            <>
              <div
                ref={mapSectionRef}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                <div className="lg:col-span-8">
                  <SpatialMapView
                    proposals={filteredProposals}
                    resolvedPlaces={resolvedPlaces}
                    isResolving={isResolving}
                    resolverError={resolverError}
                    selectedProposalId={selectedProposalId}
                    focusTrigger={focusTrigger}
                    yearFilter={yearFilter}
                    canEdit={canEdit}
                    canManageProposal={canManageProposal}
                    heightClassName="h-[520px]"
                    pickingModeForTitle={pickingProposal?.namaProgram ?? null}
                    onCancelPickingMode={() => setPickingProposalId(null)}
                    onPickCoordinate={(pos) => void handlePickCoordinate(pos)}
                    onSelectProposal={(id) => setSelectedProposalId(id || null)}
                    onInspectDetail={(id) => {
                      setSelectedProposalId(id);
                      setPreviewProposalId(id);
                    }}
                    onEditProposal={(p) => {
                      if (!canManageProposal(p)) return;
                      setEditingProposal(p);
                      setDrawerOpen(true);
                    }}
                    onDeleteProposal={(p) => {
                      if (!canManageProposal(p)) return;
                      setPendingDeleteTargets([p]);
                    }}
                    onExportGeoJson={handleExportGeoJson}
                  />
                </div>

                <div className="lg:col-span-4">
                  <ProposalDetailPanel
                    proposal={selectedProposal}
                    resolvedInfo={
                      selectedProposal ? resolvedPlaces[selectedProposal.locationQuery] : undefined
                    }
                    canEdit={canEdit}
                    canManageSelected={selectedProposal ? canManageProposal(selectedProposal) : false}
                    onPreview={(id) => {
                      setShowTemplateDemo(false);
                      setPreviewProposalId(id);
                    }}
                    onFocusOnMap={handleFocusOnMap}
                    onStartPickCoordinate={handleStartPickCoordinate}
                    onToggleReadiness={(id, key) => void handleToggleReadiness(id, key)}
                    onUpdateSkorRc={(id, val) => void handleUpdateSkorRc(id, val)}
                    onSaveProposal={(p) => void handleSaveSingleFromPanel(p)}
                    onEdit={(p) => {
                      if (!canManageProposal(p)) return;
                      setEditingProposal(p);
                      setDrawerOpen(true);
                    }}
                    onDelete={handleRequestDeleteById}
                    onAddNew={() => {
                      if (!canEdit) return;
                      setEditingProposal(null);
                      setDrawerOpen(true);
                    }}
                    onOpenTemplateDemo={() => {
                      setPreviewProposalId(null);
                      setShowTemplateDemo(true);
                    }}
                  />
                </div>
              </div>

              <AnalyticsView proposals={filteredProposals} compact />

              <ProposalTable
                proposals={filteredProposals}
                resolvedPlaces={resolvedPlaces}
                selectedProposalId={selectedProposalId}
                canEdit={canEdit}
                isSavingAll={isSavingManual}
                canManageProposal={canManageProposal}
                onSelectProposal={(id) => setSelectedProposalId(id)}
                onPreviewProposal={(id) => {
                  setShowTemplateDemo(false);
                  setPreviewProposalId(id);
                }}
                onEditProposal={(p) => {
                  if (!canManageProposal(p)) return;
                  setEditingProposal(p);
                  setDrawerOpen(true);
                }}
                onUpdateSkorRc={(id, val) => void handleUpdateSkorRc(id, val)}
                onDeleteProposals={(targets) => setPendingDeleteTargets(targets)}
                onJumpToMap={handleFocusOnMap}
                onAddNew={() => {
                  if (!canEdit) return;
                  setEditingProposal(null);
                  setDrawerOpen(true);
                }}
                onSaveAll={() => void handleManualSaveAll()}
                onExportCsv={handleExportCsv}
                onExportGeoJson={handleExportGeoJson}
                onOpenTemplateDemo={() => {
                  setPreviewProposalId(null);
                  setShowTemplateDemo(true);
                }}
              />
            </>
          )}

          {/* VIEW 2: EKSPLORASI DATA SPASIAL (GIS WORKSPACE) */}
          {activeView === WorkspaceView.SPATIAL && (
            <div ref={mapSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <SpatialMapView
                  proposals={filteredProposals}
                  resolvedPlaces={resolvedPlaces}
                  isResolving={isResolving}
                  resolverError={resolverError}
                  selectedProposalId={selectedProposalId}
                  focusTrigger={focusTrigger}
                  yearFilter={yearFilter}
                  canEdit={canEdit}
                  canManageProposal={canManageProposal}
                  heightClassName="h-[640px]"
                  pickingModeForTitle={pickingProposal?.namaProgram ?? null}
                  onCancelPickingMode={() => setPickingProposalId(null)}
                  onPickCoordinate={(pos) => void handlePickCoordinate(pos)}
                  onSelectProposal={(id) => setSelectedProposalId(id || null)}
                  onInspectDetail={(id) => {
                    setSelectedProposalId(id);
                    setPreviewProposalId(id);
                  }}
                  onEditProposal={(p) => {
                    if (!canManageProposal(p)) return;
                    setEditingProposal(p);
                    setDrawerOpen(true);
                  }}
                  onDeleteProposal={(p) => {
                    if (!canManageProposal(p)) return;
                    setPendingDeleteTargets([p]);
                  }}
                  onExportGeoJson={handleExportGeoJson}
                />
              </div>

              <div className="lg:col-span-4 space-y-4">
                <ProposalDetailPanel
                  proposal={selectedProposal}
                  resolvedInfo={
                    selectedProposal ? resolvedPlaces[selectedProposal.locationQuery] : undefined
                  }
                  canEdit={canEdit}
                  canManageSelected={selectedProposal ? canManageProposal(selectedProposal) : false}
                  onPreview={(id) => {
                    setShowTemplateDemo(false);
                    setPreviewProposalId(id);
                  }}
                  onFocusOnMap={handleFocusOnMap}
                  onStartPickCoordinate={handleStartPickCoordinate}
                  onToggleReadiness={(id, key) => void handleToggleReadiness(id, key)}
                  onUpdateSkorRc={(id, val) => void handleUpdateSkorRc(id, val)}
                  onSaveProposal={(p) => void handleSaveSingleFromPanel(p)}
                  onEdit={(p) => {
                    if (!canManageProposal(p)) return;
                    setEditingProposal(p);
                    setDrawerOpen(true);
                  }}
                  onDelete={handleRequestDeleteById}
                  onAddNew={() => {
                    if (!canEdit) return;
                    setEditingProposal(null);
                    setDrawerOpen(true);
                  }}
                  onOpenTemplateDemo={() => {
                    setPreviewProposalId(null);
                    setShowTemplateDemo(true);
                  }}
                />

                {/* Spatial Layer Directory */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-900 mb-2">
                    Daftar Objek Spasial Aktif ({filteredProposals.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredProposals.map((p) => {
                      const active = p.id === selectedProposalId;
                      const allowItemManage = canManageProposal(p);
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between gap-2 py-2 px-2 rounded-md text-xs transition-colors ${
                            active ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleFocusOnMap(p.id)}
                            className="min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="text-[11px] text-slate-500">
                              <span className="font-mono">{p.kodeUsulan}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{p.kabupatenKota}</span>
                            </div>
                            <div className="truncate text-slate-900">{p.namaProgram}</div>
                          </button>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProposalId(p.id);
                                setPreviewProposalId(p.id);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                              title="Pratinjau lembar usulan"
                              aria-label={`Pratinjau ${p.namaProgram}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {allowItemManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProposalId(p.id);
                                    setEditingProposal(p);
                                    setDrawerOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
                                  title="Edit usulan"
                                  aria-label={`Edit ${p.namaProgram}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteTargets([p])}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                                  title="Hapus usulan"
                                  aria-label={`Hapus ${p.namaProgram}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: MATRIKS USULAN & KESIAPAN RC */}
          {activeView === WorkspaceView.MATRIX && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-8">
                <ProposalTable
                  proposals={filteredProposals}
                  resolvedPlaces={resolvedPlaces}
                  selectedProposalId={selectedProposalId}
                  canEdit={canEdit}
                  isSavingAll={isSavingManual}
                  canManageProposal={canManageProposal}
                  onSelectProposal={(id) => setSelectedProposalId(id)}
                  onPreviewProposal={(id) => {
                    setShowTemplateDemo(false);
                    setPreviewProposalId(id);
                  }}
                  onEditProposal={(p) => {
                    if (!canManageProposal(p)) return;
                    setEditingProposal(p);
                    setDrawerOpen(true);
                  }}
                  onUpdateSkorRc={(id, val) => void handleUpdateSkorRc(id, val)}
                  onDeleteProposals={(targets) => setPendingDeleteTargets(targets)}
                  onJumpToMap={handleFocusOnMap}
                  onAddNew={() => {
                    if (!canEdit) return;
                    setEditingProposal(null);
                    setDrawerOpen(true);
                  }}
                  onSaveAll={() => void handleManualSaveAll()}
                  onExportCsv={handleExportCsv}
                  onExportGeoJson={handleExportGeoJson}
                  onOpenTemplateDemo={() => {
                    setPreviewProposalId(null);
                    setShowTemplateDemo(true);
                  }}
                />
              </div>
              <div className="xl:col-span-4">
                <ProposalDetailPanel
                  proposal={selectedProposal}
                  resolvedInfo={
                    selectedProposal ? resolvedPlaces[selectedProposal.locationQuery] : undefined
                  }
                  canEdit={canEdit}
                  canManageSelected={selectedProposal ? canManageProposal(selectedProposal) : false}
                  onPreview={(id) => {
                    setShowTemplateDemo(false);
                    setPreviewProposalId(id);
                  }}
                  onFocusOnMap={handleFocusOnMap}
                  onStartPickCoordinate={handleStartPickCoordinate}
                  onToggleReadiness={(id, key) => void handleToggleReadiness(id, key)}
                  onUpdateSkorRc={(id, val) => void handleUpdateSkorRc(id, val)}
                  onSaveProposal={(p) => void handleSaveSingleFromPanel(p)}
                  onEdit={(p) => {
                    if (!canManageProposal(p)) return;
                    setEditingProposal(p);
                    setDrawerOpen(true);
                  }}
                  onDelete={handleRequestDeleteById}
                  onAddNew={() => {
                    if (!canEdit) return;
                    setEditingProposal(null);
                    setDrawerOpen(true);
                  }}
                  onOpenTemplateDemo={() => {
                    setPreviewProposalId(null);
                    setShowTemplateDemo(true);
                  }}
                />
              </div>
            </div>
          )}

          {/* VIEW 4: PROYEKSI ANGGARAN 2027-2030 */}
          {activeView === WorkspaceView.BUDGET && <AnalyticsView proposals={filteredProposals} />}
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030 · Sinkronisasi Program Infrastruktur Cipta Karya
          </span>
          <span>Layanan Peta & Geospasial Terbuka · OpenStreetMap</span>
        </footer>
      </div>

      {/* Add / Edit Proposal Drawer (Only active when canEdit is true) */}
      {canEdit && (
        <ProposalFormDrawer
          isOpen={drawerOpen}
          editingProposal={editingProposal}
          existingResolvedPosition={
            editingProposal ? resolvedPlaces[editingProposal.locationQuery]?.position : undefined
          }
          totalCount={proposals.length}
          onClose={() => {
            setDrawerOpen(false);
            setEditingProposal(null);
          }}
          onAutoSave={(saved, resolved) => void handleAutoSaveProposal(saved, resolved)}
          onSave={(saved, resolved, keepOpen) =>
            void handleSaveProposal(saved, resolved, keepOpen)
          }
          onRequestDelete={(p) => {
            if (canManageProposal(p)) setPendingDeleteTargets([p]);
          }}
        />
      )}

      {/* Executive Proposal Preview Modal (KEMENPU Template) */}
      <ProposalPreviewModal
        proposal={showTemplateDemo ? TEMPLATE_DEMO_PROPOSAL : previewProposal}
        proposalsList={filteredProposals}
        resolvedPlaces={resolvedPlaces}
        canEdit={canEdit}
        isTemplateDemo={showTemplateDemo}
        canManageProposal={canManageProposal}
        onClose={() => {
          setShowTemplateDemo(false);
          setPreviewProposalId(null);
        }}
        onSelectProposal={(id) => {
          setShowTemplateDemo(false);
          setSelectedProposalId(id);
          setPreviewProposalId(id);
        }}
        onToggleReadiness={(id, key) => void handleToggleReadiness(id, key)}
        onUpdateSkorRc={(id, val) => void handleUpdateSkorRc(id, val)}
        onSaveProposal={(p) => void handleSaveSingleFromPanel(p)}
        onEditProposal={(p) => {
          if (showTemplateDemo) {
            setShowTemplateDemo(false);
            setEditingProposal(null);
            setDrawerOpen(true);
            return;
          }
          if (!canManageProposal(p)) return;
          setEditingProposal(p);
          setDrawerOpen(true);
        }}
        onDeleteProposal={(p) => {
          if (showTemplateDemo || !canManageProposal(p)) return;
          setPendingDeleteTargets([p]);
        }}
        onFocusMainMap={handleFocusOnMap}
      />

      {/* Safe Deletion Confirmation Modal */}
      {canEdit && (
        <DeleteConfirmModal
          targets={pendingDeleteTargets}
          onCancel={() => setPendingDeleteTargets([])}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </div>
  );
}

export default function App() {
  return <DashboardWorkspace />;
}
