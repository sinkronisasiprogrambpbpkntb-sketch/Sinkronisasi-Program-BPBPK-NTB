import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Lightbulb,
  Search,
  X,
} from 'lucide-react';
import { TECHNICAL_GUIDE_SECTIONS } from '../data/technicalGuideContent';
import { exportTechnicalGuidePdf } from '../utils/exportTechnicalGuidePdf';
import { loadPuBatikAssets, loadPuWordmarkDataUrl } from '../utils/puLogoAsset';

interface TechnicalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportSuccess?: (fileName: string) => void;
}

export const TechnicalGuideModal: React.FC<TechnicalGuideModalProps> = ({
  isOpen,
  onClose,
  onExportSuccess,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TECHNICAL_GUIDE_SECTIONS.filter((sec) => {
      if (!q && selectedSectionId !== 'ALL' && sec.id !== selectedSectionId) {
        return false;
      }
      if (!q) return true;
      const haystacks = [
        sec.title,
        sec.subtitle,
        sec.summary,
        ...sec.steps.map((s) => `${s.title} ${s.detail}`),
        ...(sec.tips ?? []),
      ];
      return haystacks.some((text) => text.toLowerCase().includes(q));
    });
  }, [selectedSectionId, searchQuery]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const [wordmarkDataUrl, batikAssets] = await Promise.all([
        loadPuWordmarkDataUrl(),
        loadPuBatikAssets(),
      ]);
      const fileName = exportTechnicalGuidePdf({
        wordmarkDataUrl,
        batikAssets,
      });
      onExportSuccess?.(fileName);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px] p-2 sm:p-5 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="technical-guide-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#C7D3E8] rounded-2xl shadow-2xl w-full max-w-[1160px] h-[92vh] max-h-[860px] flex flex-col overflow-hidden">
        {/* Top Batik PU Banner Header */}
        <header className="px-4 sm:px-6 py-3.5 batik-pu-banner text-white border-b-2 border-[#E89611] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#E89611] text-[#051044] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="technical-guide-modal-title"
                className="text-sm sm:text-base font-bold tracking-tight truncate"
              >
                Petunjuk Teknis Penggunaan Web App — SIMPRA BPBPK NTB
              </h2>
              <p className="text-[11px] text-amber-200/95 truncate">
                Panduan Operasional Matriks Usulan, Verifikasi RC, Spasial GIS, Profil Usulan &amp; Cetak PDF (TA. 2027–2030)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#051044] bg-[#E89611] hover:bg-amber-400 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Menyiapkan PDF...' : 'Unduh Juknis PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup Petunjuk Teknis"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Body Layout: Left Chapter Index + Search | Right Step-by-Step Content */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-[#F3F6FB]">
          {/* Chapter Index & Search */}
          <aside className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-[#C7D3E8] flex flex-col shrink-0">
            <div className="p-3.5 border-b border-[#E5ECF7]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari topik panduan (misal: PDF, RC, Peta)..."
                  className="w-full h-9 pl-8 pr-7 text-xs bg-[#F8FAFE] border border-[#C7D3E8] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#061459]/20 focus:border-[#061459]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Hapus pencarian panduan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <nav
              aria-label="Daftar Bab Petunjuk Teknis"
              className="p-2.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto flex-1"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedSectionId('ALL');
                  setSearchQuery('');
                }}
                className={`px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer whitespace-nowrap md:whitespace-normal shrink-0 flex items-center justify-between gap-2 ${
                  selectedSectionId === 'ALL' && !searchQuery
                    ? 'bg-[#061459] text-white font-semibold border-l-4 border-[#E89611]'
                    : 'text-slate-700 hover:bg-[#EEF2FA]'
                }`}
              >
                <span>Semua Bab Panduan</span>
                <span className="font-mono text-[10px] opacity-80">
                  {TECHNICAL_GUIDE_SECTIONS.length} Bab
                </span>
              </button>

              {TECHNICAL_GUIDE_SECTIONS.map((sec) => {
                const active = selectedSectionId === sec.id && !searchQuery;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setSelectedSectionId(sec.id);
                      setSearchQuery('');
                    }}
                    className={`px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer whitespace-nowrap md:whitespace-normal shrink-0 flex items-start gap-2 ${
                      active
                        ? 'bg-[#061459] text-white font-semibold border-l-4 border-[#E89611]'
                        : 'text-slate-700 hover:bg-[#EEF2FA]'
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        active
                          ? 'bg-[#E89611] text-[#051044]'
                          : 'bg-[#EEF2FA] text-[#061459]'
                      }`}
                    >
                      {sec.number}
                    </span>
                    <span className="leading-snug">{sec.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Guide Detail Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {filteredSections.length === 0 ? (
              <div className="bg-white border border-[#C7D3E8] rounded-xl p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-[#061459]">
                  Topik panduan tidak ditemukan
                </p>
                <p className="text-xs text-slate-500">
                  Tidak ada materi yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSectionId('ALL');
                  }}
                  className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#061459] bg-[#EEF2FA] hover:bg-[#E2E8F5] rounded-lg cursor-pointer"
                >
                  Tampilkan Semua Bab
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => (
                <article
                  key={sec.id}
                  className="bg-white border border-[#C7D3E8] rounded-2xl overflow-hidden shadow-xs"
                >
                  <div className="px-5 py-3.5 bg-[#061459] text-white border-b-2 border-[#E89611] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E89611] text-[#051044] shrink-0">
                        BAB {sec.number}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                          {sec.title}
                        </h3>
                        <p className="text-[11px] text-indigo-200">{sec.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    <p className="text-xs text-slate-700 leading-relaxed bg-[#F8FAFE] border border-[#D7E0F0] rounded-xl px-4 py-3">
                      {sec.summary}
                    </p>

                    <div className="grid grid-cols-1 gap-2.5">
                      {sec.steps.map((step, sIdx) => (
                        <div
                          key={`${sec.id}-step-${sIdx}`}
                          className="border border-[#E5ECF7] rounded-xl p-3.5 bg-white hover:border-[#C7D3E8] transition-colors flex items-start gap-3"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#EEF2FA] text-[#061459] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#061459]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{step.title}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {sec.tips && sec.tips.length > 0 && (
                      <div className="space-y-2">
                        {sec.tips.map((tip, tIdx) => (
                          <div
                            key={`${sec.id}-tip-${tIdx}`}
                            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"
                          >
                            <Lightbulb className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <span>
                              <strong>Tips:</strong> {tip}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 bg-white border-t border-[#D7E0F0] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <span>
            SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030 · Petunjuk Teknis Operasional
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#061459] hover:bg-[#0A1D6E] rounded-lg transition-colors cursor-pointer"
          >
            Tutup Panduan
          </button>
        </footer>
      </div>
    </div>
  );
};
