import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  HardDrive,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  DriveUploadResult,
  getDriveAccessToken,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_URL,
  hasActiveDriveToken,
  saveProposalsToGoogleDrive,
  signInWithGoogleDrive,
} from '../lib/googleDrive';
import { ResolvedPlaceInfo, UsulanProgram } from '../types/ciptaKarya';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: UsulanProgram[];
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  operatorName: string;
  onSuccessNotice: (msg: string) => void;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  proposals,
  resolvedPlaces,
  operatorName,
  onSuccessNotice,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(() => hasActiveDriveToken());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveJson, setSaveJson] = useState<boolean>(true);
  const [saveCsv, setSaveCsv] = useState<boolean>(true);
  const [uploadResult, setUploadResult] = useState<{
    jsonResult?: DriveUploadResult;
    csvResult?: DriveUploadResult;
    folderUrl: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignInGoogle = async () => {
    setErrorMessage(null);
    setIsAuthenticating(true);
    try {
      await signInWithGoogleDrive();
      setIsConnected(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungkan Google Drive. Silakan coba lagi.';
      setErrorMessage(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleExecuteUpload = async () => {
    if (!saveJson && !saveCsv) {
      setErrorMessage('Pilih minimal satu format penyimpanan (JSON atau CSV).');
      return;
    }

    if (!hasActiveDriveToken()) {
      setErrorMessage('Silakan hubungkan akun Google terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      const result = await saveProposalsToGoogleDrive(
        proposals,
        resolvedPlaces,
        operatorName,
        {
          includeJson: saveJson,
          includeCsv: saveCsv,
        }
      );
      setUploadResult(result);
      onSuccessNotice(
        `Perubahan data (${proposals.length} usulan) berhasil disimpan ke folder Google Drive!`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengunggah berkas ke Google Drive.';
      setErrorMessage(msg);
      if (msg.includes('kedaluwarsa') || msg.includes('Belum terhubung')) {
        setIsConnected(false);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Simpan Perubahan ke Google Drive
              </h2>
              <p className="text-xs text-blue-200/80">
                Penyimpanan cadangan resmi SIMPRA BPBPK NTB TA 2027–2030
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Target Folder Banner */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="font-semibold text-slate-900 text-xs">
                  Folder Tujuan Google Drive
                </span>
              </div>
              <a
                href={GOOGLE_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2 shrink-0 cursor-pointer"
              >
                <span>Buka di Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed break-all">
              <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-blue-100">
                Folder ID: {GOOGLE_DRIVE_FOLDER_ID}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              Tautan bersama:{' '}
              <span className="font-mono text-[10px] text-slate-700">
                drive.google.com/.../1c1cyIl1gwx1xiI6Kt3WTiyaLr7yusJRF
              </span>
            </p>
          </div>

          {/* Authentication State Card */}
          {!isConnected ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-slate-600" />
                  <span>Otorisasi Akses Google Drive</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Hubungkan akun Google Anda untuk mengizinkan aplikasi mengunggah dan menyimpan
                  berkas rekapitulasi usulan ke folder Google Drive tersebut.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => void handleSignInGoogle()}
                className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Menghubungkan Akun Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                    <span>Hubungkan dengan Google (Izin Simpan Drive)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-950 text-xs">
                    Akun Google Terhubung
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Izin simpan berkas ke Google Drive aktif
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-medium text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                Siap Simpan
              </span>
            </div>
          )}

          {/* Data Payload Details & Format Selection */}
          <div className="space-y-3">
            <div className="font-semibold text-slate-800 text-xs">
              Rincian Data yang Akan Disimpan:
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-slate-500 text-[11px]">Jumlah Usulan</span>
                <p className="font-bold text-slate-900 text-sm">{proposals.length} Paket Kegiatan</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-slate-500 text-[11px]">Tahun Anggaran</span>
                <p className="font-bold text-slate-900 text-sm">TA. 2027–2030</p>
              </div>
            </div>

            {/* Format Selection Checkboxes */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-slate-600 block">
                Pilih Berkas Format Penyimpanan:
              </span>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveJson}
                  onChange={(e) => setSaveJson(e.target.checked)}
                  className="rounded text-blue-700 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                />
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-900">
                    Berkas Cadangan Lengkap (.JSON)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Menyimpan seluruh data detail, skor RC, koordinat spasial, dan rincian pagu.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCsv}
                  onChange={(e) => setSaveCsv(e.target.checked)}
                  className="rounded text-blue-700 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                />
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-900">
                    Matriks Rekapitulasi Tabel (.CSV)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Format tabel matriks yang dapat dibuka langsung di Google Sheets dan Excel.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Result Card */}
          {uploadResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Penyimpanan ke Google Drive Berhasil!</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-emerald-950 font-mono">
                {uploadResult.jsonResult && (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-white/80 rounded border border-emerald-100">
                    <span className="truncate">{uploadResult.jsonResult.name}</span>
                    {uploadResult.jsonResult.webViewLink && (
                      <a
                        href={uploadResult.jsonResult.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline shrink-0"
                      >
                        Lihat Berkas
                      </a>
                    )}
                  </div>
                )}
                {uploadResult.csvResult && (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-white/80 rounded border border-emerald-100">
                    <span className="truncate">{uploadResult.csvResult.name}</span>
                    {uploadResult.csvResult.webViewLink && (
                      <a
                        href={uploadResult.csvResult.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline shrink-0"
                      >
                        Lihat Berkas
                      </a>
                    )}
                  </div>
                )}
              </div>

              <a
                href={GOOGLE_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <span>Buka Folder Google Drive Sekarang</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            disabled={isUploading || isAuthenticating || (!saveJson && !saveCsv)}
            onClick={() => {
              if (!isConnected) {
                void handleSignInGoogle();
              } else {
                void handleExecuteUpload();
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ke Drive...</span>
              </>
            ) : isConnected ? (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>Konfirmasi Simpan ke Google Drive</span>
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4" />
                <span>Hubungkan Google & Simpan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
