import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { exportProposalsAsCsv } from '../data/initialProposals';
import { ResolvedPlaceInfo, UsulanProgram } from '../types/ciptaKarya';

export const GOOGLE_DRIVE_FOLDER_ID = '1c1cyIl1gwx1xiI6Kt3WTiyaLr7yusJRF';
export const GOOGLE_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1c1cyIl1gwx1xiI6Kt3WTiyaLr7yusJRF?usp=sharing';

export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// In-memory token cache (NEVER stored in localStorage or sessionStorage per skill guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const driveProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => driveProvider.addScope(scope));
driveProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Initialize Drive auth listener. Resets token on sign out.
 */
export function initDriveAuth(
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    }
  });
}

/**
 * Prompt user to authenticate with Google to grant Drive access
 */
export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error(
        'Gagal memperoleh access token Google Drive. Pastikan izin akses Drive disetujui.'
      );
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Drive Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Retrieve current cached access token in memory
 */
export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Check if active in-memory token exists
 */
export function hasActiveDriveToken(): boolean {
  return Boolean(cachedAccessToken);
}

/**
 * Clear cached token
 */
export async function disconnectDrive(): Promise<void> {
  cachedAccessToken = null;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
}

/**
 * Upload a file directly into the designated Google Drive folder via multipart upload
 */
export async function uploadFileToDrive(
  filename: string,
  content: string,
  mimeType: string,
  description?: string
): Promise<DriveUploadResult> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Belum terhubung ke Google Drive. Silakan masuk terlebih dahulu.');
  }

  const metadata = {
    name: filename,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
    description: description || 'Data Perubahan Usulan SIMPRA BPBPK NTB TA 2027–2030',
    mimeType,
  };

  const boundary = '-------simpra_drive_boundary_' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sesi Google Drive telah kedaluwarsa. Silakan masuk kembali.');
    }
    throw new Error(
      `Gagal menyimpan ke Google Drive (${response.status}): ${errorText || response.statusText}`
    );
  }

  const result = (await response.json()) as DriveUploadResult;
  return result;
}

/**
 * Save complete proposals state as JSON and optionally CSV into the designated Google Drive folder
 */
export async function saveProposalsToGoogleDrive(
  proposals: UsulanProgram[],
  resolvedPlaces: Record<string, ResolvedPlaceInfo>,
  operatorName: string,
  options: { includeJson: boolean; includeCsv: boolean } = { includeJson: true, includeCsv: true }
): Promise<{
  jsonResult?: DriveUploadResult;
  csvResult?: DriveUploadResult;
  folderUrl: string;
}> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let jsonResult: DriveUploadResult | undefined;
  let csvResult: DriveUploadResult | undefined;

  if (options.includeJson) {
    const jsonPayload = {
      judul: 'REKAPITULASI USULAN KEGIATAN TA. 2027–2030 BPBPK NUSA TENGGARA BARAT',
      sistem: 'SIMPRA BPBPK NTB (Sinkronisasi Program Infrastruktur Cipta Karya)',
      folderPenyimpanan: GOOGLE_DRIVE_FOLDER_URL,
      waktuPenyimpanan: now.toISOString(),
      disimpanOleh: operatorName,
      jumlahUsulan: proposals.length,
      usulan: proposals,
    };

    const jsonFileName = `REKAPITULASI_USULAN_SIMPRA_BPBPK_NTB_TA_2027_2030_${timestamp}.json`;
    jsonResult = await uploadFileToDrive(
      jsonFileName,
      JSON.stringify(jsonPayload, null, 2),
      'application/json',
      `Backup data usulan SIMPRA BPBPK NTB (${proposals.length} paket) disimpan oleh ${operatorName}`
    );
  }

  if (options.includeCsv) {
    const csvContent = exportProposalsAsCsv(proposals, resolvedPlaces);
    const csvFileName = `MATRIKS_USULAN_SIMPRA_BPBPK_NTB_TA_2027_2030_${timestamp}.csv`;
    csvResult = await uploadFileToDrive(
      csvFileName,
      csvContent,
      'text/csv',
      `Matriks CSV usulan SIMPRA BPBPK NTB (${proposals.length} paket)`
    );
  }

  return {
    jsonResult,
    csvResult,
    folderUrl: GOOGLE_DRIVE_FOLDER_URL,
  };
}
