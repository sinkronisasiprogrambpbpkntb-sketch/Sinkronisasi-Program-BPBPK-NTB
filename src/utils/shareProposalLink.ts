import { SektorCiptaKarya, WorkspaceView } from '../types/ciptaKarya';
import { RcPdfLayoutMode } from './exportRcInfographicPdf';
import {
  ALL_SEKTORS,
  RcTierFilter,
  SEKTOR_ENUM_TO_CODE,
  SortOrder,
  YearFilterValue,
} from './rcInfographicData';

export interface HostShareOriginInfo {
  currentOrigin: string;
  sharedOrigin: string;
  isDevHost: boolean;
}

export function getShareHostInfo(): HostShareOriginInfo {
  if (typeof window === 'undefined') {
    return { currentOrigin: '', sharedOrigin: '', isDevHost: false };
  }
  const { protocol, hostname, port, origin } = window.location;
  const isDevHost = hostname.startsWith('ais-dev-');
  const sharedHostname = isDevHost ? hostname.replace(/^ais-dev-/, 'ais-pre-') : hostname;
  const sharedOrigin = `${protocol}//${sharedHostname}${port ? `:${port}` : ''}`;
  return {
    currentOrigin: origin,
    sharedOrigin,
    isDevHost,
  };
}

export function buildProposalProfileShareUrl(
  proposalId: string,
  options?: {
    preferSharedHost?: boolean;
    mode?: 'lihat' | 'edit';
    format?: 'pdf' | 'sheet';
  }
): string {
  if (typeof window === 'undefined') return '';
  const hostInfo = getShareHostInfo();
  const preferShared = options?.preferSharedHost ?? true;
  const baseOrigin =
    hostInfo.isDevHost && preferShared ? hostInfo.sharedOrigin : hostInfo.currentOrigin;

  const url = new URL(window.location.pathname || '/', baseOrigin);
  if ((options?.mode ?? 'lihat') === 'lihat') {
    url.searchParams.set('mode', 'lihat');
  }
  url.searchParams.set('view', WorkspaceView.MATRIX);
  url.searchParams.set('profil', proposalId);
  if ((options?.format ?? 'pdf') === 'pdf') {
    url.searchParams.set('format', 'pdf');
  }
  return url.toString();
}

export interface RcInfographicShareOptions {
  preferSharedHost?: boolean;
  year?: YearFilterValue;
  sektor?: 'ALL' | SektorCiptaKarya;
  sectors?: SektorCiptaKarya[];
  fundingSources?: string[] | null;
  tier?: RcTierFilter;
  sortOrder?: SortOrder;
  layoutMode?: RcPdfLayoutMode;
  searchQuery?: string;
}

export function buildRcInfographicPdfShareUrl(
  options?: RcInfographicShareOptions
): string {
  if (typeof window === 'undefined') return '';
  const hostInfo = getShareHostInfo();
  const preferShared = options?.preferSharedHost ?? true;
  const baseOrigin =
    hostInfo.isDevHost && preferShared ? hostInfo.sharedOrigin : hostInfo.currentOrigin;

  const url = new URL(window.location.pathname || '/', baseOrigin);
  url.searchParams.set('mode', 'lihat');
  url.searchParams.set('view', WorkspaceView.RC_INFOGRAPHIC);
  url.searchParams.set('format', 'pdf');

  if (options?.year && options.year !== 'ALL') {
    url.searchParams.set('ta', options.year);
  }
  if (options?.sektor && options.sektor !== 'ALL') {
    url.searchParams.set('sektor', SEKTOR_ENUM_TO_CODE[options.sektor]);
  } else if (
    options?.sectors &&
    options.sectors.length > 0 &&
    options.sectors.length < ALL_SEKTORS.length
  ) {
    const codes = options.sectors.map((s) => SEKTOR_ENUM_TO_CODE[s]).filter(Boolean);
    if (codes.length > 0) {
      url.searchParams.set('sektors', codes.join(','));
    }
  }
  if (options?.fundingSources && options.fundingSources.length > 0) {
    url.searchParams.set('dana', options.fundingSources.join('|'));
  }
  if (options?.tier && options.tier !== 'ALL') {
    url.searchParams.set('tier', options.tier);
  }
  if (options?.sortOrder && options.sortOrder !== 'desc') {
    url.searchParams.set('sort', options.sortOrder);
  }
  if (options?.layoutMode && options.layoutMode !== 'multi') {
    url.searchParams.set('layout', options.layoutMode);
  }
  if (options?.searchQuery && options.searchQuery.trim().length > 0) {
    url.searchParams.set('q', options.searchQuery.trim());
  }

  return url.toString();
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(tempInput);
      return copied;
    } catch {
      return false;
    }
  }
}
