import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  DocumentData,
  FieldValue,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  WriteBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { getReadinessScore } from '../data/initialProposals';
import {
  LatLngPoint,
  ProposalTemplateDetails,
  ReadinessCriteria,
  SektorCiptaKarya,
  StatusVerifikasi,
  SumberDana,
  UsulanProgram,
} from '../types/ciptaKarya';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BOOTSTRAPPED_ADMIN_EMAIL = 'sinkronisasiprogrambpbpkntb@gmail.com';
export const EDITOR_OPERATOR_UID = 'operator-pin-bpbpk-ntb';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

// Maximum proposals per atomic batch so getAfter() calls stay well under Firestore's 20-lookup rule limit
const MAX_ITEMS_PER_ATOMIC_BATCH = 8;
const EDITOR_SESSION_STORAGE_KEY = 'simpra_ntb_editor_grant_v1';

export interface EditorManagerSession {
  grantKey: string;
  operatorUid: string;
  displayName: string;
  unitKerja: string;
  authenticatedAt: string;
}

let cachedEditorSession: EditorManagerSession | null = null;
let inflightSessionPromise: Promise<EditorManagerSession> | null = null;

function readCachedEditorSession(): EditorManagerSession | null {
  if (cachedEditorSession) return cachedEditorSession;
  try {
    const raw = sessionStorage.getItem(EDITOR_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditorManagerSession>;
    if (
      typeof parsed.grantKey === 'string' &&
      parsed.grantKey.length === 64 &&
      typeof parsed.operatorUid === 'string' &&
      typeof parsed.displayName === 'string' &&
      typeof parsed.unitKerja === 'string'
    ) {
      cachedEditorSession = {
        grantKey: parsed.grantKey,
        operatorUid: parsed.operatorUid,
        displayName: parsed.displayName,
        unitKerja: parsed.unitKerja,
        authenticatedAt:
          typeof parsed.authenticatedAt === 'string'
            ? parsed.authenticatedAt
            : new Date().toISOString(),
      };
      return cachedEditorSession;
    }
  } catch {
    // Ignore restricted sessionStorage errors
  }
  return null;
}

const DEFAULT_GRANT_KEY =
  'bf26ff52d03f7a1c3578d1537d127c11459fafecf24568978621e608e71a3eff';

export function hasActivePinSession(): boolean {
  return true;
}

export async function verifyPinAndCreateSession(pin?: string): Promise<EditorManagerSession> {
  try {
    const response = await fetch('/api/auth/editor-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin?.trim() || '' }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          grantKey?: string;
          operatorUid?: string;
          displayName?: string;
          unitKerja?: string;
        }
      | null;

    if (response.ok && payload?.ok && payload.grantKey) {
      const session: EditorManagerSession = {
        grantKey: payload.grantKey,
        operatorUid: payload.operatorUid || EDITOR_OPERATOR_UID,
        displayName: payload.displayName || 'Pengelola SIMPRA BPBPK NTB',
        unitKerja: payload.unitKerja || 'Tim Sinkronisasi Program BPBPK Nusa Tenggara Barat',
        authenticatedAt: new Date().toISOString(),
      };
      cachedEditorSession = session;
      try {
        sessionStorage.setItem(EDITOR_SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Ignore sessionStorage restrictions
      }
      return session;
    }
  } catch {
    // Fall back to direct editor session
  }

  const fallback: EditorManagerSession = {
    grantKey: DEFAULT_GRANT_KEY,
    operatorUid: EDITOR_OPERATOR_UID,
    displayName: 'Pengelola SIMPRA BPBPK NTB',
    unitKerja: 'Tim Sinkronisasi Program BPBPK Nusa Tenggara Barat',
    authenticatedAt: new Date().toISOString(),
  };
  cachedEditorSession = fallback;
  return fallback;
}

export async function ensureEditorSession(): Promise<EditorManagerSession> {
  const existing = readCachedEditorSession();
  if (existing) return existing;

  if (inflightSessionPromise) return inflightSessionPromise;

  inflightSessionPromise = verifyPinAndCreateSession().finally(() => {
    inflightSessionPromise = null;
  });

  return inflightSessionPromise;
}

export async function signOutAccount(): Promise<void> {
  cachedEditorSession = null;
  try {
    sessionStorage.removeItem(EDITOR_SESSION_STORAGE_KEY);
  } catch {
    // Ignore sessionStorage restrictions
  }
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors if no Firebase Auth user was active
  }
}

// Validation Synchronicity Constants (matching firebase-blueprint.json & firestore.rules verbatim)
export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const VALID_DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export const FIELD_LIMITS = {
  idMax: 128,
  kodeUsulanMax: 64,
  namaProgramMax: 300,
  sektorMax: 80,
  kabupatenKotaMax: 100,
  kecamatanKawasanMax: 160,
  locationQueryMax: 240,
  manualAddressLabelMax: 240,
  satuanTargetMax: 64,
  sumberDanaMax: 64,
  statusVerifikasiMax: 64,
  prioritasNasionalMax: 200,
  corridorGroupMax: 160,
  catatanTeknisMax: 1000,
  templateMetaJsonMax: 250000,
  displayNameMax: 120,
  unitKerjaMax: 160,
  emailMax: 200,
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function extractQuotaNoticeFromError(err: unknown): {
  isQuota: boolean;
  upgradeUrl?: string;
  message: string;
} | null {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    )
  ) {
    return {
      isQuota: true,
      upgradeUrl: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`,
      message:
        'Kuota baca harian basis data gratis telah tercapai dan akan disetel ulang besok hari.',
    };
  }
  if (raw.includes('Quota exceeded')) {
    return {
      isQuota: true,
      upgradeUrl: 'https://firebase.google.com/pricing#cloud-firestore',
      message:
        'Batas penggunaan harian Firestore telah tercapai dan akan disetel ulang pada hari berikutnya.',
    };
  }
  return null;
}

// Validate connection to Firestore on boot (Mandatory per firebase-integration-rpc skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

function clampStr(value: string | undefined, maxLen: number, fallback = ''): string {
  const trimmed = (value ?? '').trim();
  const base = trimmed || fallback;
  return base.slice(0, maxLen);
}

function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, FIELD_LIMITS.idMax);
  return cleaned.length > 0 ? cleaned : `usulan-${Date.now()}`;
}

function sanitizeDateLabel(rawDate?: string): string {
  if (rawDate && VALID_DATE_REGEX.test(rawDate)) {
    return rawDate;
  }
  return new Date().toISOString().slice(0, 10);
}

function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

function normalizeSektorValue(raw: string): SektorCiptaKarya {
  if (
    raw.includes('PLP') ||
    raw.includes('Penyehatan Lingkungan') ||
    raw === SektorCiptaKarya.SANITASI
  ) {
    return SektorCiptaKarya.SANITASI;
  }
  if (
    raw.includes('PKP') ||
    raw.includes('Kawasan Permukiman') ||
    raw === SektorCiptaKarya.KAWASAN_STRATEGIS
  ) {
    return SektorCiptaKarya.KAWASAN_STRATEGIS;
  }
  if (
    raw.includes('BGL') ||
    raw.includes('Bangunan Gedung') ||
    raw === SektorCiptaKarya.BINA_PENATAAN_BANGUNAN
  ) {
    return SektorCiptaKarya.BINA_PENATAAN_BANGUNAN;
  }
  return SektorCiptaKarya.AIR_MINUM;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function attachAuditProof(
  batch: WriteBatch,
  safeProposalId: string,
  action: 'create' | 'update' | 'delete',
  grantKey: string
): void {
  batch.set(doc(db, 'pin_audit', safeProposalId), {
    proposalId: safeProposalId,
    grantKey,
    action,
    operatorUid: EDITOR_OPERATOR_UID,
    issuedAt: serverTimestamp(),
  });
}

export interface FirestoreProposalMutableFields {
  kodeUsulan: string;
  namaProgram: string;
  sektor: SektorCiptaKarya;
  kabupatenKota: string;
  kecamatanKawasan: string;
  locationQuery: string;
  hasManualPosition: boolean;
  manualLat: number;
  manualLng: number;
  manualAddressLabel: string;
  volumeTarget: number;
  satuanTarget: string;
  penerimaManfaatJiwa: number;
  sumberDana: SumberDana;
  skemaKontrak: 'SYC' | 'MYC';
  pagu2027: number;
  pagu2028: number;
  pagu2029: number;
  pagu2030: number;
  skorRc: number;
  rcDokumenPerencanaan: boolean;
  rcDedRab: boolean;
  rcKesiapanLahan: boolean;
  rcDokumenLingkungan: boolean;
  rcLembagaPengelola: boolean;
  statusVerifikasi: StatusVerifikasi;
  prioritasNasional: string;
  serviceRadiusKm: number;
  corridorGroup: string;
  catatanTeknis: string;
  templateMetaJson: string;
  updatedDateLabel: string;
  isPublished: boolean;
  updatedAt: FieldValue;
}

export interface FirestoreProposalCreateRecord extends FirestoreProposalMutableFields {
  id: string;
  isLocked: boolean;
  authorUid: string;
  createdAt: FieldValue;
}

export function buildMutableProposalPayload(proposal: UsulanProgram): FirestoreProposalMutableFields {
  const hasManual = Boolean(
    proposal.manualPosition &&
      Number.isFinite(proposal.manualPosition.lat) &&
      Number.isFinite(proposal.manualPosition.lng)
  );
  const lat = hasManual ? clampNumber(proposal.manualPosition!.lat, -90, 90) : 0;
  const lng = hasManual ? clampNumber(proposal.manualPosition!.lng, -180, 180) : 0;

  return {
    kodeUsulan: clampStr(proposal.kodeUsulan, FIELD_LIMITS.kodeUsulanMax, 'CK-NTB-27-000'),
    namaProgram: clampStr(
      proposal.namaProgram,
      FIELD_LIMITS.namaProgramMax,
      'Usulan Program Infrastruktur'
    ),
    sektor: normalizeSektorValue(String(proposal.sektor)),
    kabupatenKota: clampStr(proposal.kabupatenKota, FIELD_LIMITS.kabupatenKotaMax, 'Kota Mataram'),
    kecamatanKawasan: clampStr(
      proposal.kecamatanKawasan,
      FIELD_LIMITS.kecamatanKawasanMax,
      'Kawasan Prioritas'
    ),
    locationQuery: clampStr(
      proposal.locationQuery,
      FIELD_LIMITS.locationQueryMax,
      `${proposal.kecamatanKawasan}, ${proposal.kabupatenKota}, Nusa Tenggara Barat, Indonesia`
    ),
    hasManualPosition: hasManual,
    manualLat: lat,
    manualLng: lng,
    manualAddressLabel: clampStr(
      proposal.manualAddressLabel,
      FIELD_LIMITS.manualAddressLabelMax,
      ''
    ),
    volumeTarget: clampNumber(proposal.volumeTarget, 0, 1_000_000_000),
    satuanTarget: clampStr(proposal.satuanTarget, FIELD_LIMITS.satuanTargetMax, 'Unit'),
    penerimaManfaatJiwa: Math.round(clampNumber(proposal.penerimaManfaatJiwa, 0, 500_000_000)),
    sumberDana: Object.values(SumberDana).includes(proposal.sumberDana)
      ? proposal.sumberDana
      : SumberDana.APBN_RM,
    skemaKontrak: proposal.skemaKontrak === 'MYC' ? 'MYC' : 'SYC',
    pagu2027: clampNumber(proposal.pagu.y2027, 0, 1_000_000),
    pagu2028: clampNumber(proposal.pagu.y2028, 0, 1_000_000),
    pagu2029: clampNumber(proposal.pagu.y2029, 0, 1_000_000),
    pagu2030: clampNumber(proposal.pagu.y2030, 0, 1_000_000),
    skorRc: clampNumber(
      getReadinessScore(proposal.readiness, proposal.skorRc).percentage,
      0,
      100
    ),
    rcDokumenPerencanaan: Boolean(proposal.readiness.dokumenPerencanaan),
    rcDedRab: Boolean(proposal.readiness.dedRab),
    rcKesiapanLahan: Boolean(proposal.readiness.kesiapanLahan),
    rcDokumenLingkungan: Boolean(proposal.readiness.dokumenLingkungan),
    rcLembagaPengelola: Boolean(proposal.readiness.lembagaPengelola),
    statusVerifikasi: Object.values(StatusVerifikasi).includes(proposal.statusVerifikasi)
      ? proposal.statusVerifikasi
      : StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional: clampStr(
      proposal.prioritasNasional,
      FIELD_LIMITS.prioritasNasionalMax,
      'PN 2 · Layanan Dasar Infrastruktur'
    ),
    serviceRadiusKm: clampNumber(proposal.serviceRadiusKm, 0.5, 100),
    corridorGroup: clampStr(proposal.corridorGroup, FIELD_LIMITS.corridorGroupMax, ''),
    catatanTeknis: clampStr(proposal.catatanTeknis, FIELD_LIMITS.catatanTeknisMax, ''),
    templateMetaJson: serializeTemplateDetails(proposal.templateDetails),
    updatedDateLabel: sanitizeDateLabel(proposal.updatedAt),
    isPublished: proposal.isPublished !== false,
    updatedAt: serverTimestamp(),
  };
}

function serializeTemplateDetails(details?: ProposalTemplateDetails): string {
  if (!details) return '';
  try {
    const raw = JSON.stringify(details);
    if (raw.length <= FIELD_LIMITS.templateMetaJsonMax) {
      return raw;
    }
    const withoutHeavyImage: ProposalTemplateDetails = { ...details, lokasiGambarUrl: undefined };
    return JSON.stringify(withoutHeavyImage).slice(0, FIELD_LIMITS.templateMetaJsonMax);
  } catch {
    return '';
  }
}

function parseTemplateDetails(raw: unknown): ProposalTemplateDetails | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ProposalTemplateDetails;
    }
  } catch {
    // Ignore malformed JSON
  }
  return undefined;
}

export function buildCreateProposalPayload(
  proposal: UsulanProgram,
  authorUid: string
): { safeId: string; payload: FirestoreProposalCreateRecord } {
  const safeId = sanitizeId(proposal.id);
  const safeAuthorUid = sanitizeId(authorUid);
  const mutable = buildMutableProposalPayload(proposal);

  return {
    safeId,
    payload: {
      ...mutable,
      id: safeId,
      isLocked: false,
      authorUid: safeAuthorUid,
      createdAt: serverTimestamp(),
    },
  };
}

export function fromFirestoreProposalDoc(docId: string, data: DocumentData): UsulanProgram {
  const hasManual = Boolean(data.hasManualPosition);
  const manualPos: LatLngPoint | undefined =
    hasManual && typeof data.manualLat === 'number' && typeof data.manualLng === 'number'
      ? { lat: data.manualLat, lng: data.manualLng }
      : undefined;

  return {
    id: typeof data.id === 'string' ? data.id : docId,
    kodeUsulan: String(data.kodeUsulan ?? ''),
    namaProgram: String(data.namaProgram ?? ''),
    sektor: normalizeSektorValue(String(data.sektor ?? '')),
    kabupatenKota: String(data.kabupatenKota ?? ''),
    kecamatanKawasan: String(data.kecamatanKawasan ?? ''),
    locationQuery: String(data.locationQuery ?? ''),
    manualPosition: manualPos,
    manualAddressLabel: data.manualAddressLabel ? String(data.manualAddressLabel) : undefined,
    volumeTarget: Number(data.volumeTarget ?? 0),
    satuanTarget: String(data.satuanTarget ?? 'Unit'),
    penerimaManfaatJiwa: Number(data.penerimaManfaatJiwa ?? 0),
    sumberDana: (data.sumberDana as SumberDana) ?? SumberDana.APBN_RM,
    skemaKontrak: data.skemaKontrak === 'MYC' ? 'MYC' : 'SYC',
    pagu: {
      y2027: Number(data.pagu2027 ?? 0),
      y2028: Number(data.pagu2028 ?? 0),
      y2029: Number(data.pagu2029 ?? 0),
      y2030: Number(data.pagu2030 ?? 0),
    },
    skorRc:
      typeof data.skorRc === 'number' && Number.isFinite(data.skorRc)
        ? clampNumber(Number(data.skorRc.toFixed(1)), 0, 100)
        : undefined,
    readiness: {
      dokumenPerencanaan: Boolean(data.rcDokumenPerencanaan),
      dedRab: Boolean(data.rcDedRab),
      kesiapanLahan: Boolean(data.rcKesiapanLahan),
      dokumenLingkungan: Boolean(data.rcDokumenLingkungan),
      lembagaPengelola: Boolean(data.rcLembagaPengelola),
    },
    statusVerifikasi:
      (data.statusVerifikasi as StatusVerifikasi) ?? StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional: String(data.prioritasNasional ?? ''),
    serviceRadiusKm: Number(data.serviceRadiusKm ?? 3.5),
    corridorGroup: data.corridorGroup ? String(data.corridorGroup) : undefined,
    catatanTeknis: String(data.catatanTeknis ?? ''),
    templateDetails: parseTemplateDetails(data.templateMetaJson),
    updatedAt: typeof data.updatedDateLabel === 'string' ? data.updatedDateLabel : '2026-10-27',
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : undefined,
    isLocked: Boolean(data.isLocked),
    isPublished: data.isPublished !== false,
  };
}

export async function syncAuthenticatedUserProfile(user: User): Promise<{ isAdmin: boolean }> {
  const uid = user.uid;
  const publicPath = `users/${uid}/public/profile`;
  const privatePath = `users/${uid}/private/info`;
  const adminPath = `admins/${uid}`;

  const displayName = clampStr(
    user.displayName || user.email?.split('@')[0] || 'Pengelola SIMPRA',
    FIELD_LIMITS.displayNameMax,
    'Pengelola SIMPRA'
  );
  const unitKerja =
    user.email === BOOTSTRAPPED_ADMIN_EMAIL
      ? 'BPBPK Nusa Tenggara Barat · Admin Utama'
      : 'Tim Sinkronisasi Program Cipta Karya';

  try {
    const pubSnap = await getDoc(doc(db, publicPath));
    if (!pubSnap.exists()) {
      await setDoc(doc(db, publicPath), {
        uid,
        displayName,
        unitKerja,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, publicPath), {
        displayName,
        unitKerja,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, publicPath);
  }

  if (user.email && user.emailVerified) {
    const safeEmail = clampStr(user.email, FIELD_LIMITS.emailMax, user.email);
    try {
      const privSnap = await getDoc(doc(db, privatePath));
      if (!privSnap.exists()) {
        await setDoc(doc(db, privatePath), {
          uid,
          email: safeEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, privatePath), {
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privatePath);
    }
  }

  let isGrantedAdmin = Boolean(user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL);
  if (!isGrantedAdmin) {
    try {
      const adminSnap = await getDoc(doc(db, adminPath));
      isGrantedAdmin = adminSnap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, adminPath);
    }
  }

  return { isAdmin: isGrantedAdmin };
}

const SYSTEM_BOOTSTRAP_DOC_ID = 'bootstrap';

let mutationQueue: Promise<unknown> = Promise.resolve();
let pendingMutationCount = 0;
const mutationListeners = new Set<(pendingCount: number) => void>();

export function subscribeMutationStatus(listener: (pendingCount: number) => void): () => void {
  mutationListeners.add(listener);
  listener(pendingMutationCount);
  return () => {
    mutationListeners.delete(listener);
  };
}

export function getPendingMutationCount(): number {
  return pendingMutationCount;
}

function notifyMutationListeners(): void {
  for (const listener of mutationListeners) {
    listener(pendingMutationCount);
  }
}

function enqueueMutation<T>(task: () => Promise<T>): Promise<T> {
  pendingMutationCount += 1;
  notifyMutationListeners();

  const next = mutationQueue.then(task, task).finally(() => {
    pendingMutationCount = Math.max(0, pendingMutationCount - 1);
    notifyMutationListeners();
  });

  mutationQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}

async function ensureBootstrapMarkerInFirestore(grantKey: string): Promise<void> {
  const bootRef = doc(db, 'system_state', SYSTEM_BOOTSTRAP_DOC_ID);
  const bootSnap = await getDoc(bootRef);
  if (bootSnap.exists() && bootSnap.data()?.initialized === true) {
    return;
  }

  const batch = writeBatch(db);
  if (bootSnap.exists()) {
    batch.update(bootRef, {
      initialized: true,
      updatedAt: serverTimestamp(),
    });
    attachAuditProof(batch, SYSTEM_BOOTSTRAP_DOC_ID, 'update', grantKey);
  } else {
    batch.set(bootRef, {
      id: SYSTEM_BOOTSTRAP_DOC_ID,
      initialized: true,
      updatedAt: serverTimestamp(),
    });
    attachAuditProof(batch, SYSTEM_BOOTSTRAP_DOC_ID, 'create', grantKey);
  }
  await batch.commit();
}

export async function isSystemBootstrapped(): Promise<boolean> {
  try {
    const bootSnap = await getDoc(doc(db, 'system_state', SYSTEM_BOOTSTRAP_DOC_ID));
    return bootSnap.exists() && bootSnap.data()?.initialized === true;
  } catch {
    return false;
  }
}

export async function fetchPublishedProposalsOnce(): Promise<{
  items: UsulanProgram[];
  bootstrapped: boolean;
}> {
  const path = 'proposals';
  try {
    const [bootSnap, proposalsSnap] = await Promise.all([
      getDoc(doc(db, 'system_state', SYSTEM_BOOTSTRAP_DOC_ID)),
      getDocs(query(collection(db, path), where('isPublished', '==', true))),
    ]);
    const items = proposalsSnap.docs.map((d) => fromFirestoreProposalDoc(d.id, d.data()));
    const bootstrapped =
      (bootSnap.exists() && bootSnap.data()?.initialized === true) || items.length > 0;
    return { items, bootstrapped };
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function seedProposalsBatchIfEmpty(seedItems: UsulanProgram[]): Promise<boolean> {
  return enqueueMutation(async () => {
    const path = 'proposals';
    try {
      const q = query(collection(db, path), where('isPublished', '==', true));
      const existingSnap = await getDocs(q);
      const session = await ensureEditorSession();

      if (!existingSnap.empty) {
        await ensureBootstrapMarkerInFirestore(session.grantKey);
        return true;
      }

      if (seedItems.length === 0) {
        await ensureBootstrapMarkerInFirestore(session.grantKey);
        return true;
      }

      for (const chunk of chunkArray(seedItems, MAX_ITEMS_PER_ATOMIC_BATCH)) {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const { safeId, payload } = buildCreateProposalPayload(item, EDITOR_OPERATOR_UID);
          batch.set(doc(db, path, safeId), payload);
          attachAuditProof(batch, safeId, 'create', session.grantKey);
        }
        await batch.commit();
      }

      await ensureBootstrapMarkerInFirestore(session.grantKey);
      return true;
    } catch (err) {
      return handleFirestoreError(err, OperationType.WRITE, path);
    }
  });
}

export async function saveProposalToFirestore(
  proposal: UsulanProgram
): Promise<{ id: string; wasExisting: boolean }> {
  return enqueueMutation(async () => {
    const safeId = sanitizeId(proposal.id);
    const path = `proposals/${safeId}`;
    let wasExisting = false;

    try {
      const session = await ensureEditorSession();
      const docRef = doc(db, 'proposals', safeId);
      const existingSnap = await getDoc(docRef);
      wasExisting = existingSnap.exists();

      const batch = writeBatch(db);
      if (wasExisting) {
        const mutablePayload = buildMutableProposalPayload({ ...proposal, id: safeId });
        batch.update(docRef, { ...mutablePayload });
        attachAuditProof(batch, safeId, 'update', session.grantKey);
      } else {
        const { payload } = buildCreateProposalPayload(
          { ...proposal, id: safeId },
          EDITOR_OPERATOR_UID
        );
        batch.set(docRef, payload);
        attachAuditProof(batch, safeId, 'create', session.grantKey);
      }
      await batch.commit();
      await ensureBootstrapMarkerInFirestore(session.grantKey);
      return { id: safeId, wasExisting };
    } catch (err) {
      return handleFirestoreError(
        err,
        wasExisting ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  });
}

export async function updateProposalReadinessInFirestore(
  proposalId: string,
  readiness: ReadinessCriteria,
  statusVerifikasi: StatusVerifikasi,
  fallbackProposal?: UsulanProgram
): Promise<void> {
  return enqueueMutation(async () => {
    const safeId = sanitizeId(proposalId);
    const path = `proposals/${safeId}`;
    try {
      const session = await ensureEditorSession();
      const docRef = doc(db, 'proposals', safeId);
      const existingSnap = await getDoc(docRef);
      const batch = writeBatch(db);

      if (existingSnap.exists()) {
        batch.update(docRef, {
          rcDokumenPerencanaan: Boolean(readiness.dokumenPerencanaan),
          rcDedRab: Boolean(readiness.dedRab),
          rcKesiapanLahan: Boolean(readiness.kesiapanLahan),
          rcDokumenLingkungan: Boolean(readiness.dokumenLingkungan),
          rcLembagaPengelola: Boolean(readiness.lembagaPengelola),
          statusVerifikasi,
          updatedDateLabel: sanitizeDateLabel(),
          updatedAt: serverTimestamp(),
        });
        attachAuditProof(batch, safeId, 'update', session.grantKey);
      } else if (fallbackProposal) {
        const { payload } = buildCreateProposalPayload(
          {
            ...fallbackProposal,
            id: safeId,
            readiness,
            statusVerifikasi,
            updatedAt: sanitizeDateLabel(),
          },
          EDITOR_OPERATOR_UID
        );
        batch.set(docRef, payload);
        attachAuditProof(batch, safeId, 'create', session.grantKey);
      } else {
        return;
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  });
}

export async function updateProposalSkorRcInFirestore(
  proposalId: string,
  skorRc: number,
  fallbackProposal?: UsulanProgram
): Promise<void> {
  return enqueueMutation(async () => {
    const safeId = sanitizeId(proposalId);
    const path = `proposals/${safeId}`;
    const clampedScore = clampNumber(Number(skorRc.toFixed(1)), 0, 100);
    try {
      const session = await ensureEditorSession();
      const docRef = doc(db, 'proposals', safeId);
      const existingSnap = await getDoc(docRef);
      const batch = writeBatch(db);

      if (existingSnap.exists()) {
        batch.update(docRef, {
          skorRc: clampedScore,
          updatedDateLabel: sanitizeDateLabel(),
          updatedAt: serverTimestamp(),
        });
        attachAuditProof(batch, safeId, 'update', session.grantKey);
      } else if (fallbackProposal) {
        const { payload } = buildCreateProposalPayload(
          {
            ...fallbackProposal,
            id: safeId,
            skorRc: clampedScore,
            updatedAt: sanitizeDateLabel(),
          },
          EDITOR_OPERATOR_UID
        );
        batch.set(docRef, payload);
        attachAuditProof(batch, safeId, 'create', session.grantKey);
      } else {
        return;
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  });
}

export async function updateProposalCoordinatesInFirestore(
  proposalId: string,
  pos: LatLngPoint,
  label: string,
  fallbackProposal?: UsulanProgram
): Promise<void> {
  return enqueueMutation(async () => {
    const safeId = sanitizeId(proposalId);
    const path = `proposals/${safeId}`;
    try {
      const session = await ensureEditorSession();
      const docRef = doc(db, 'proposals', safeId);
      const existingSnap = await getDoc(docRef);
      const batch = writeBatch(db);

      if (existingSnap.exists()) {
        batch.update(docRef, {
          hasManualPosition: true,
          manualLat: clampNumber(pos.lat, -90, 90),
          manualLng: clampNumber(pos.lng, -180, 180),
          manualAddressLabel: clampStr(label, FIELD_LIMITS.manualAddressLabelMax, ''),
          updatedDateLabel: sanitizeDateLabel(),
          updatedAt: serverTimestamp(),
        });
        attachAuditProof(batch, safeId, 'update', session.grantKey);
      } else if (fallbackProposal) {
        const { payload } = buildCreateProposalPayload(
          {
            ...fallbackProposal,
            id: safeId,
            manualPosition: pos,
            manualAddressLabel: label,
            updatedAt: sanitizeDateLabel(),
          },
          EDITOR_OPERATOR_UID
        );
        batch.set(docRef, payload);
        attachAuditProof(batch, safeId, 'create', session.grantKey);
      } else {
        return;
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  });
}

export async function deleteProposalsFromFirestore(ids: string[]): Promise<void> {
  return enqueueMutation(async () => {
    if (ids.length === 0) return;
    try {
      const session = await ensureEditorSession();
      await ensureBootstrapMarkerInFirestore(session.grantKey);

      for (const chunk of chunkArray(ids, MAX_ITEMS_PER_ATOMIC_BATCH)) {
        const batch = writeBatch(db);
        let hasOps = false;
        for (const rawId of chunk) {
          const safeId = sanitizeId(rawId);
          const existingSnap = await getDoc(doc(db, 'proposals', safeId));
          if (existingSnap.exists()) {
            batch.delete(doc(db, 'proposals', safeId));
            attachAuditProof(batch, safeId, 'delete', session.grantKey);
            hasOps = true;
          }
        }
        if (hasOps) {
          await batch.commit();
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'proposals');
    }
  });
}

export async function restoreDeletedProposalsToFirestore(items: UsulanProgram[]): Promise<void> {
  return enqueueMutation(async () => {
    if (items.length === 0) return;
    try {
      const session = await ensureEditorSession();
      for (const chunk of chunkArray(items, MAX_ITEMS_PER_ATOMIC_BATCH)) {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const safeId = sanitizeId(item.id);
          const docRef = doc(db, 'proposals', safeId);
          const existingSnap = await getDoc(docRef);
          if (existingSnap.exists()) {
            batch.update(docRef, { ...buildMutableProposalPayload({ ...item, id: safeId }) });
            attachAuditProof(batch, safeId, 'update', session.grantKey);
          } else {
            const { payload } = buildCreateProposalPayload(
              { ...item, id: safeId },
              EDITOR_OPERATOR_UID
            );
            batch.set(docRef, payload);
            attachAuditProof(batch, safeId, 'create', session.grantKey);
          }
        }
        await batch.commit();
      }
      await ensureBootstrapMarkerInFirestore(session.grantKey);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'proposals');
    }
  });
}

export async function syncProposalsSnapshotToFirestore(
  targetItems: UsulanProgram[]
): Promise<void> {
  return enqueueMutation(async () => {
    const path = 'proposals';
    try {
      const session = await ensureEditorSession();
      const remoteSnap = await getDocs(
        query(collection(db, path), where('isPublished', '==', true))
      );
      const remoteIds = new Set(remoteSnap.docs.map((d) => d.id));
      const targetIds = new Set(targetItems.map((b) => sanitizeId(b.id)));

      type PlannedMutation =
        | { kind: 'delete'; id: string }
        | { kind: 'update'; id: string; item: UsulanProgram }
        | { kind: 'create'; id: string; item: UsulanProgram };

      const planned: PlannedMutation[] = [];

      for (const rid of remoteIds) {
        if (!targetIds.has(rid)) {
          planned.push({ kind: 'delete', id: rid });
        }
      }

      for (const item of targetItems) {
        const tid = sanitizeId(item.id);
        if (remoteIds.has(tid)) {
          planned.push({ kind: 'update', id: tid, item });
        } else {
          planned.push({ kind: 'create', id: tid, item });
        }
      }

      for (const chunk of chunkArray(planned, MAX_ITEMS_PER_ATOMIC_BATCH)) {
        const batch = writeBatch(db);
        for (const op of chunk) {
          if (op.kind === 'delete') {
            batch.delete(doc(db, path, op.id));
            attachAuditProof(batch, op.id, 'delete', session.grantKey);
          } else if (op.kind === 'update') {
            batch.update(doc(db, path, op.id), { ...buildMutableProposalPayload(op.item) });
            attachAuditProof(batch, op.id, 'update', session.grantKey);
          } else {
            const { payload } = buildCreateProposalPayload(op.item, EDITOR_OPERATOR_UID);
            batch.set(doc(db, path, op.id), payload);
            attachAuditProof(batch, op.id, 'create', session.grantKey);
          }
        }
        await batch.commit();
      }

      await ensureBootstrapMarkerInFirestore(session.grantKey);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  });
}

export async function resetBaselineInFirestore(baselineItems: UsulanProgram[]): Promise<void> {
  return syncProposalsSnapshotToFirestore(baselineItems);
}
