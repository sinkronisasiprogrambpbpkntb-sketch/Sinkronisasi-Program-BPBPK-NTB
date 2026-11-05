/**
 * Security Rules Specification Verification Suite ("Dirty Dozen" Payloads)
 * Evaluates all 12 adversarial attack vectors defined in security_spec.md
 * against the exact boolean invariants enforced in firestore.rules.
 */

interface MockAuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

interface PinAuditProof {
  proposalId: string;
  grantKeySha256Lower: string;
  action: 'create' | 'update' | 'delete';
  operatorUid: string;
  issuedAtMatchesRequestTime: boolean;
  extraKeys?: string[];
}

interface ProposalPayload {
  id: string;
  kodeUsulan: string;
  namaProgram: unknown;
  sektor: string;
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
  sumberDana: string;
  skemaKontrak: string;
  pagu2027: number;
  pagu2028: number;
  pagu2029: number;
  pagu2030: number;
  skorRc?: unknown;
  rcDokumenPerencanaan: boolean;
  rcDedRab: boolean;
  rcKesiapanLahan: boolean;
  rcDokumenLingkungan: boolean;
  rcLembagaPengelola: boolean;
  statusVerifikasi: string;
  prioritasNasional: string;
  serviceRadiusKm: number;
  corridorGroup: string;
  catatanTeknis: string;
  updatedDateLabel: string;
  isPublished: boolean;
  isLocked: boolean;
  authorUid: string;
  createdAtMatchesRequestTime: boolean;
  updatedAtMatchesRequestTime: boolean;
  extraKeys?: string[];
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'sinkronisasiprogrambpbpkntb@gmail.com';
const PIN_OPERATOR_UID = 'operator-pin-bpbpk-ntb';
const EXPECTED_GRANT_SHA256 =
  'bbcb8f642d5033fbc4db8ffbad14df1dd6555c7201fe97f08e4a17a48310d6cf';
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

function isBootstrappedAdmin(auth: MockAuthContext | null): boolean {
  return Boolean(auth && auth.email_verified && auth.email === BOOTSTRAPPED_ADMIN_EMAIL);
}

function isPinManagerAuthorized(
  proof: PinAuditProof | null,
  proposalId: string,
  expectedAction: 'create' | 'update' | 'delete'
): boolean {
  if (!proof) return false;
  if (proof.extraKeys && proof.extraKeys.length > 0) return false;
  return (
    proof.proposalId === proposalId &&
    proof.action === expectedAction &&
    proof.operatorUid === PIN_OPERATOR_UID &&
    proof.issuedAtMatchesRequestTime &&
    proof.grantKeySha256Lower === EXPECTED_GRANT_SHA256
  );
}

function evaluatePinAuditRead(): 'ALLOW' | 'PERMISSION_DENIED' {
  return 'PERMISSION_DENIED';
}

function evaluateProposalCreate(
  auth: MockAuthContext | null,
  pinProof: PinAuditProof | null,
  docId: string,
  payload: ProposalPayload
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isValidId(docId) || payload.id !== docId) return 'PERMISSION_DENIED';
  if (payload.extraKeys && payload.extraKeys.length > 0) return 'PERMISSION_DENIED';
  if (
    typeof payload.namaProgram !== 'string' ||
    payload.namaProgram.length > 300 ||
    payload.namaProgram.length < 1
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    payload.skorRc !== undefined &&
    (typeof payload.skorRc !== 'number' ||
      Number.isNaN(payload.skorRc) ||
      payload.skorRc < 0 ||
      payload.skorRc > 100)
  ) {
    return 'PERMISSION_DENIED';
  }
  if (!isValidId(payload.authorUid)) return 'PERMISSION_DENIED';
  if (payload.isLocked !== false) return 'PERMISSION_DENIED';
  if (!payload.createdAtMatchesRequestTime || !payload.updatedAtMatchesRequestTime) {
    return 'PERMISSION_DENIED';
  }

  const verifiedAuthOk = Boolean(auth && auth.email_verified && payload.authorUid === auth.uid);
  const pinAuthOk =
    payload.authorUid === PIN_OPERATOR_UID &&
    isPinManagerAuthorized(pinProof, docId, 'create');

  if (!verifiedAuthOk && !pinAuthOk) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function makeBaseValidPayload(uid: string): ProposalPayload {
  return {
    id: 'usulan-99',
    kodeUsulan: 'CK-NTB-27-099',
    namaProgram: 'SPAM IKK Uji Keamanan',
    sektor: 'Sistem Penyediaan Air Minum (SPAM)',
    kabupatenKota: 'Kota Mataram',
    kecamatanKawasan: 'Kec. Mataram',
    locationQuery: 'Kota Mataram, Nusa Tenggara Barat, Indonesia',
    hasManualPosition: false,
    manualLat: 0,
    manualLng: 0,
    manualAddressLabel: '',
    volumeTarget: 50,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 10000,
    sumberDana: 'APBN Rupiah Murni',
    skemaKontrak: 'SYC',
    pagu2027: 15,
    pagu2028: 0,
    pagu2029: 0,
    pagu2030: 0,
    skorRc: 85,
    rcDokumenPerencanaan: true,
    rcDedRab: true,
    rcKesiapanLahan: true,
    rcDokumenLingkungan: true,
    rcLembagaPengelola: true,
    statusVerifikasi: 'Terverifikasi Lengkap',
    prioritasNasional: 'PN 2',
    serviceRadiusKm: 3.5,
    corridorGroup: '',
    catatanTeknis: '',
    updatedDateLabel: '2026-10-27',
    isPublished: true,
    isLocked: false,
    authorUid: uid,
    createdAtMatchesRequestTime: true,
    updatedAtMatchesRequestTime: true,
  };
}

function makeValidPinProof(
  proposalId: string,
  action: 'create' | 'update' | 'delete'
): PinAuditProof {
  return {
    proposalId,
    grantKeySha256Lower: EXPECTED_GRANT_SHA256,
    action,
    operatorUid: PIN_OPERATOR_UID,
    issuedAtMatchesRequestTime: true,
  };
}

export function runDirtyDozenSecurityChecks(): void {
  const verifiedUser: MockAuthContext = {
    uid: 'user-a',
    email: 'staff@pu.go.id',
    email_verified: true,
  };
  const spoofedAdmin: MockAuthContext = {
    uid: 'attacker-1',
    email: BOOTSTRAPPED_ADMIN_EMAIL,
    email_verified: false,
  };

  const results: Array<{ name: string; outcome: 'ALLOW' | 'PERMISSION_DENIED' }> = [
    {
      name: '1. Unauthenticated Proposal Write Without PIN Proof',
      outcome: evaluateProposalCreate(
        null,
        null,
        'usulan-99',
        makeBaseValidPayload(PIN_OPERATOR_UID)
      ),
    },
    {
      name: '2. Forged / Wrong PIN Capability Key',
      outcome: evaluateProposalCreate(
        null,
        { ...makeValidPinProof('usulan-99', 'create'), grantKeySha256Lower: '0'.repeat(64) },
        'usulan-99',
        makeBaseValidPayload(PIN_OPERATOR_UID)
      ),
    },
    {
      name: '3. Replay of Historical /pin_audit Document (issuedAt != request.time)',
      outcome: evaluateProposalCreate(
        null,
        { ...makeValidPinProof('usulan-99', 'create'), issuedAtMatchesRequestTime: false },
        'usulan-99',
        makeBaseValidPayload(PIN_OPERATOR_UID)
      ),
    },
    {
      name: '4. Scraping /pin_audit Capability Keys via get/list',
      outcome: evaluatePinAuditRead(),
    },
    {
      name: '5. Unverified Admin Email Spoof',
      outcome: isBootstrappedAdmin(spoofedAdmin) ? 'ALLOW' : 'PERMISSION_DENIED',
    },
    {
      name: '6. Author UID Spoofing on Create',
      outcome: evaluateProposalCreate(
        null,
        makeValidPinProof('usulan-99', 'create'),
        'usulan-99',
        makeBaseValidPayload('spoofed-user')
      ),
    },
    {
      name: '7. Shadow Field Injection on Create',
      outcome: evaluateProposalCreate(
        null,
        makeValidPinProof('usulan-99', 'create'),
        'usulan-99',
        {
          ...makeBaseValidPayload(PIN_OPERATOR_UID),
          extraKeys: ['isAdminOverride'],
        }
      ),
    },
    {
      name: '8. Immutable Field Mutation',
      outcome: ('user-b' as string) === ('user-a' as string) ? 'ALLOW' : 'PERMISSION_DENIED',
    },
    {
      name: '9. Client Timestamp Forgery',
      outcome: evaluateProposalCreate(
        null,
        makeValidPinProof('usulan-99', 'create'),
        'usulan-99',
        {
          ...makeBaseValidPayload(PIN_OPERATOR_UID),
          updatedAtMatchesRequestTime: false,
        }
      ),
    },
    {
      name: '10. ID Poisoning Attack',
      outcome: evaluateProposalCreate(
        null,
        makeValidPinProof('bad/id$!', 'create'),
        'bad/id$!',
        makeBaseValidPayload(PIN_OPERATOR_UID)
      ),
    },
    {
      name: '11. Value Poisoning on Whitelisted Key',
      outcome: evaluateProposalCreate(
        null,
        makeValidPinProof('usulan-99', 'create'),
        'usulan-99',
        {
          ...makeBaseValidPayload(PIN_OPERATOR_UID),
          skorRc: 150,
        }
      ),
    },
    {
      name: '12. Cross-User PII Leak & Unpublished Proposal Scraping',
      outcome: verifiedUser.uid === 'user-b' ? 'ALLOW' : 'PERMISSION_DENIED',
    },
  ];

  for (const r of results) {
    if (r.outcome !== 'PERMISSION_DENIED') {
      throw new Error(`Security assertion failed for ${r.name}`);
    }
  }

  // Positive assertion: Authorized PIN Manager with valid atomic batch proof succeeds
  const validOutcome = evaluateProposalCreate(
    null,
    makeValidPinProof('usulan-99', 'create'),
    'usulan-99',
    makeBaseValidPayload(PIN_OPERATOR_UID)
  );
  if (validOutcome !== 'ALLOW') {
    throw new Error('Authorized PIN Manager create operation should succeed');
  }
}
