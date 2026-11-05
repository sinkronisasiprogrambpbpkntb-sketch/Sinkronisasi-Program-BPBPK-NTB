# Security Specification — SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030

## 1. Data Invariants & Master Source of Truth
1. **Master Source of Truth**:
   - `/proposals/{proposalId}` holds official infrastructure program proposals (`ProposalRecord`) containing zero personal user PII.
   - `/pin_audit/{proposalId}` holds write-only atomic capability proofs (`PinWriteAudit`) verifying server-issued capability keys via `hashing.sha256(grantKey)` and `request.time`. Client `get`, `list`, and `delete` on `/pin_audit` are unconditionally denied (`if false`) so capability tokens can never be read or scraped.
   - `/system_state/{stateId}` holds the singleton initialization flag (`stateId == 'bootstrap'`, `SystemBootstrapState`) containing zero PII so deleted baseline proposals are never resurrected across sessions or devices. `list` and `delete` are unconditionally denied.
   - `/users/{userId}/public/profile` holds non-PII user display metadata (`UserPublicProfile`), keyed strictly by `request.auth.uid`.
   - `/users/{userId}/private/info` isolates user PII (`email`) in a dedicated split subcollection (`UserPrivateInfo`), accessible exclusively to `isOwner(userId)` or `isAdmin()`.
   - `/admins/{adminUid}` is the trusted RBAC registry (`AdminGrant`), writable exclusively by the bootstrapped administrator (`sinkronisasiprogrambpbpkntb@gmail.com` with `email_verified == true`).
2. **Access Control Invariants**:
   - **Viewer Mode (Versi Pelihat)**: May only `get` or `list` `/proposals/{proposalId}` documents where `resource.data.isPublished == true` and `get` `/system_state/bootstrap`. No writes or deletes are allowed without a valid atomic capability proof (`isPinManagerAuthorized`) or verified authenticated session.
   - **Editor Mode (Mode Pengelola)**: Every Firestore mutation (`create`, `update`, `delete`) atomically writes `/pin_audit/{targetId}` in the same `writeBatch` with `issuedAt == request.time`, `action` matching the operation, `operatorUid == 'operator-pin-bpbpk-ntb'`, and `hashing.sha256(grantKey)` matching the SHA-256 digest in `firestore.rules`.
   - **Identity Integrity**: On creation of `/proposals/{proposalId}`, `authorUid` must equal `'operator-pin-bpbpk-ntb'` (for Editor session) or `request.auth.uid` (for verified Auth user). `id`, `authorUid`, and `createdAt` are immutable across all updates.
   - **Temporal Integrity**: `createdAt`, `updatedAt`, and `issuedAt` must strictly equal `request.time` (`serverTimestamp()`). Replay of stale `/pin_audit/{proposalId}` documents fails immediately because `getAfter(...).data.issuedAt != request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Proposal Write Without Capability Proof**: `request.auth == null` attempting `create`, `update`, or `delete` on `/proposals/usulan-99` without an atomic `/pin_audit/usulan-99` write -> `PERMISSION_DENIED`.
2. **Forged Capability Key**: Client submitting atomic `/pin_audit/usulan-99` with an invalid 64-hex `grantKey` whose SHA-256 digest does not match -> `PERMISSION_DENIED`.
3. **Replay of Historical `/pin_audit` Document**: Attacker attempting `update` or `delete` on `/proposals/usulan-01` relying on an older `/pin_audit/usulan-01` document (`issuedAt != request.time`) -> `PERMISSION_DENIED`.
4. **Scraping `/pin_audit` Capability Keys**: Any client attempting `get` or `list` on `/pin_audit/usulan-01` to steal `grantKey` -> `PERMISSION_DENIED` (`allow get, list: if false`).
5. **Unverified Admin Email Spoof**: `auth = { uid: 'attacker', token: { email: 'sinkronisasiprogrambpbpkntb@gmail.com', email_verified: false } }` attempting `delete` -> `PERMISSION_DENIED`.
6. **Author UID Spoofing on Create**: Creating `/proposals/usulan-99` with mismatched `authorUid: 'spoofed-user'` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection on Create/Update**: Client sending valid `ProposalRecord`, `PinWriteAudit`, or `SystemBootstrapState` plus `{ isAdminOverride: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
8. **Immutable Field Mutation**: Updating `id`, `authorUid`, or `createdAt` on `/proposals/usulan-01` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Passing forged past/future timestamp instead of `request.time` for `updatedAt` or `issuedAt` -> `PERMISSION_DENIED`.
10. **ID Poisoning Attack**: Creating `/proposals/`, `/pin_audit/`, or `/system_state/other` with invalid ID -> `PERMISSION_DENIED` (`isValidId` / `stateId == 'bootstrap'`).
11. **Value Poisoning on Whitelisted Key**: Updating `namaProgram` with a boolean `true` or `skorRc` outside `[0, 100]` (e.g. `150`) -> `PERMISSION_DENIED` (`isValidProposalRecord` wraps `allow update`).
12. **Cross-User PII Leak & Unpublished Scraping**: User `uid: 'user-a'` attempting `get` on `/users/user-b/private/info`, or listing `/proposals` without `where('isPublished', '==', true)` -> `PERMISSION_DENIED`.
