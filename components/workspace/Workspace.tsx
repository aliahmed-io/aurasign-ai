'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, AlertCircle, FileText, Edit3, Check, Download } from 'lucide-react';
import { useAppStore, Clause } from '@/store/appStore';
import useSound from 'use-sound';

const popSound = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.webp,.tiff';
const ACCEPTED_LABEL = 'PDF · Word · Text · Image (JPG, PNG)';

const RISK_COLORS: Record<string, { bar: string; bg: string; border: string; text: string; label: string; glow: string }> = {
  high: {
    bar: 'bg-[#FF3B30]',
    bg: 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40',
    border: 'border-red-300 dark:border-red-800',
    text: 'text-[#FF3B30]',
    label: 'HIGH RISK',
    glow: 'shadow-[0_0_20px_rgba(255,59,48,0.18)] dark:shadow-[0_0_25px_rgba(255,59,48,0.25)]',
  },
  medium: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'MEDIUM RISK',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.18)] dark:shadow-[0_0_25px_rgba(245,158,11,0.25)]',
  },
  low: {
    bar: 'bg-[#34C759]',
    bg: 'bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/40',
    border: 'border-green-300 dark:border-green-800',
    text: 'text-[#34C759]',
    label: 'LOW RISK',
    glow: 'shadow-[0_0_20px_rgba(52,199,89,0.15)] dark:shadow-[0_0_25px_rgba(52,199,89,0.2)]',
  },
};

const RISK_DESC: Record<string, string> = {
  high: 'Significant legal exposure or liability loop. Seek legal adjustment prior to execution.',
  medium: 'Moderate performance obligation or rigid timeline bounds. Review contract guidelines.',
  low: 'Standard contract clause. Within normal operational parameters.',
};


export function Workspace() {
  const uploadStatus = useAppStore((state) => state.uploadStatus);
  const setUploadStatus = useAppStore((state) => state.setUploadStatus);
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const contractClauses = useAppStore((state) => state.contractClauses);
  const setContractClauses = useAppStore((state) => state.setContractClauses);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const fileName = useAppStore((state) => state.fileName);
  const setFileName = useAppStore((state) => state.setFileName);
  const ext = fileName ? fileName.split('.').pop()?.toLowerCase() || 'pdf' : 'pdf';
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const highlightedClauseId = useAppStore((state) => state.highlightedClauseId);
  const setHighlightedClauseId = useAppStore((state) => state.setHighlightedClauseId);
  const fullText = useAppStore((state) => state.fullText);
  const setFullText = useAppStore((state) => state.setFullText);

  const [playPop] = useSound(popSound, { volume: 0.5 });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // States for manual editing, center view switching, & AI corrections
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocText, setEditedDocText] = useState('');
  const [correctedTextVal, setCorrectedTextVal] = useState('');
  const [centerViewMode, setCenterViewMode] = useState<'verbatim' | 'deconstructed'>('verbatim');

  const hasSearch = searchQuery.trim().length > 2;

  // Fallback: If fullText is empty but clauses exist, reconstruct a beautiful deconstructed text
  const fallbackText = useMemo(() => {
    if (contractClauses.length === 0) return '';
    return contractClauses.map((c, i) => `SECTION ${i + 1}: ${c.entities?.[0] || 'Clause'}\n${c.text}`).join('\n\n');
  }, [contractClauses]);

  // Keep edited text in sync with store fullText
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (uploadStatus === 'complete') {
      timer = setTimeout(() => setEditedDocText(fullText || fallbackText), 0);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [fullText, fallbackText, uploadStatus]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (highlightedClauseId) {
      const clause = contractClauses.find(c => c.id === highlightedClauseId);
      if (clause) {
        const text = clause.text.toLowerCase();
        let suggestion = '';
        if (clause.riskSeverity === 'high') {
          if (text.includes('ip') || text.includes('intellectual')) {
            suggestion = 'All Intellectual Property created during the course of the engagement remains the sole property of the Client, provided that the Contractor retains ownership of all pre-existing code, templates, and generic tools.';
          } else if (text.includes('compete') || text.includes('prohibited')) {
            suggestion = 'During the term of this agreement and for a period of two (2) years following its termination, Contractor shall not provide software development or consulting services directly to Client\'s direct B2B SaaS competitors within the Client\'s core market segment.';
          } else if (text.includes('indemnify') || text.includes('losses')) {
            suggestion = 'Contractor agrees to indemnify Client against direct losses arising from Contractor\'s gross negligence or willful misconduct, capped at total compensation received. Client\'s liability for breach is capped at the total agreement value.';
          } else {
            suggestion = 'The Buyer shall pay all invoices within 45 days of receipt. Late payments shall accrue interest at a reasonable rate of 1.0% per month, up to a maximum of 10% per annum.';
          }
        } else if (clause.riskSeverity === 'medium') {
          suggestion = 'Either party may terminate this Agreement at any time by providing at least 30 days prior written notice to the other party, subject to payment of outstanding fees for completed services.';
        } else {
          suggestion = 'Standard boilerplate clause is accepted without revisions.';
        }
        timer = setTimeout(() => setCorrectedTextVal(suggestion), 0);
      }
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [highlightedClauseId, contractClauses]);

  // Scroll matching highlighted text into view inside central container
  useEffect(() => {
    if (highlightedClauseId && uploadStatus === 'complete' && !isEditing) {
      const element = document.getElementById(`doc-clause-${highlightedClauseId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedClauseId, uploadStatus, isEditing, centerViewMode]);

  // Advanced DOM-Aware Highlighting Engine (Overlays AI Highlights onto Semantic HTML)
  useEffect(() => {
    if (!editorRef.current || isEditing || centerViewMode === 'deconstructed' || uploadStatus !== 'complete') return;

    const container = editorRef.current;
    
    // First, restore the clean HTML without our highlight spans so we don't duplicate
    const cleanHtml = editedDocText || fallbackText;
    if (container.innerHTML !== cleanHtml && !container.querySelector('.doc-clause-highlight')) {
      container.innerHTML = cleanHtml;
    }

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const highlightClauseInDOM = (clause: Clause) => {
      let targetNorm = normalize(clause.text);
      if (!targetNorm) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      let currentNorm = '';
      const textNodes: { node: Text, normStart: number, normEnd: number }[] = [];

      while ((node = walker.nextNode())) {
        const txt = node.nodeValue || '';
        const norm = normalize(txt);
        textNodes.push({ node: node as Text, normStart: currentNorm.length, normEnd: currentNorm.length + norm.length });
        currentNorm += norm;
      }

      // Find the first matching normalized string
      let startIdx = currentNorm.indexOf(targetNorm);
      if (startIdx === -1) {
        // Fallback: match first 45 chars
        const shortNorm = normalize(clause.text.substring(0, 45));
        startIdx = currentNorm.indexOf(shortNorm);
        if (startIdx === -1) return;
        targetNorm = shortNorm; // Approximate
      }

      const endIdx = startIdx + targetNorm.length;
      const overlappingNodes = textNodes.filter(n => n.normEnd > startIdx && n.normStart < endIdx);
      if (overlappingNodes.length === 0) return;

      const isClauseHighlighted = highlightedClauseId === clause.id;
      const sev = clause.riskSeverity || 'low';
      
      let baseClass = 'doc-clause-highlight ';
      if (isClauseHighlighted) {
        baseClass += sev === 'high' ? 'bg-[#FF3B30]/30 text-[#FF3B30] dark:text-red-400 font-semibold ring-2 ring-[#FF3B30] rounded px-1 shadow-[0_0_15px_rgba(255,59,48,0.18)] transition-all duration-300 cursor-pointer inline relative z-20' :
                     sev === 'medium' ? 'bg-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold ring-2 ring-amber-500 rounded px-1 shadow-[0_0_15px_rgba(245,158,11,0.18)] transition-all duration-300 cursor-pointer inline relative z-20' :
                     'bg-[#34C759]/30 text-[#34C759] dark:text-green-400 font-semibold ring-2 ring-[#34C759] rounded px-1 shadow-[0_0_15px_rgba(52,199,89,0.15)] transition-all duration-300 cursor-pointer inline relative z-20';
      } else {
        baseClass += sev === 'high' ? 'border-b-2 border-dashed border-[#FF3B30]/60 hover:bg-[#FF3B30]/10 transition-all cursor-pointer' :
                     sev === 'medium' ? 'border-b-2 border-dashed border-amber-500/60 hover:bg-amber-500/10 transition-all cursor-pointer' :
                     'border-b-2 border-dashed border-[#34C759]/60 hover:bg-[#34C759]/10 transition-all cursor-pointer';
      }

      // We modify the DOM nodes backwards to preserve node references
      for (let i = overlappingNodes.length - 1; i >= 0; i--) {
        const n = overlappingNodes[i];
        const isFirst = i === 0;
        const isLast = i === overlappingNodes.length - 1;

        const txt = n.node.nodeValue || '';
        let strStart = 0;
        let strEnd = txt.length;

        if (isFirst) {
          const targetNormStartInNode = startIdx - n.normStart;
          let normCount = 0;
          while (strStart < txt.length && normCount < targetNormStartInNode) {
            if (/[a-z0-9]/.test(txt[strStart].toLowerCase())) normCount++;
            strStart++;
          }
        }

        if (isLast) {
          const targetNormEndInNode = endIdx - n.normStart;
          let tempNormCount = 0;
          strEnd = 0;
          while (strEnd < txt.length && tempNormCount < targetNormEndInNode) {
            if (/[a-z0-9]/.test(txt[strEnd].toLowerCase())) tempNormCount++;
            strEnd++;
          }
        }

        const before = txt.substring(0, strStart);
        const matchText = txt.substring(strStart, strEnd);
        const after = txt.substring(strEnd);

        if (!matchText) continue;

        const span = document.createElement('span');
        span.className = baseClass;
        if (isFirst) span.id = `doc-clause-${clause.id}`;
        span.onclick = (e) => {
          e.stopPropagation();
          setHighlightedClauseId(isClauseHighlighted ? null : clause.id);
          playPop();
        };
        span.textContent = matchText;

        const parent = n.node.parentNode;
        if (parent) {
          if (after) parent.insertBefore(document.createTextNode(after), n.node.nextSibling);
          parent.insertBefore(span, n.node.nextSibling);
          if (before) n.node.nodeValue = before;
          else parent.removeChild(n.node);
        }
      }
    };

    contractClauses.forEach(highlightClauseInDOM);

  }, [editedDocText, fallbackText, contractClauses, highlightedClauseId, isEditing, centerViewMode, playPop, setHighlightedClauseId, uploadStatus]);

  const reset = () => {
    setUploadStatus('idle');
    setContractClauses([]);
    setFullText('');
    setEditedDocText('');
    setSearchQuery('');
    setErrorMessage(null);
    setFileName(null);
    setIsEditing(false);
    setHighlightedClauseId(null);
    setCenterViewMode('verbatim');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    setFileName(file.name);
    setIsLoading(true);
    setUploadStatus('processing');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      if (data.clauses && data.clauses.length > 0) {
        setContractClauses(data.clauses);
        setFullText(data.fullText || '');
        setUploadStatus('complete');
      } else {
        throw new Error('No clauses were extracted. The document may be empty or unreadable.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
      setUploadStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run AI analysis on the updated manual or implemented text draft
  const handleReanalyze = async () => {
    setIsLoading(true);
    setUploadStatus('processing');
    setHighlightedClauseId(null);
    setIsEditing(false);

    try {
      const textToAnalyze = editedDocText || fallbackText;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      if (data.clauses && data.clauses.length > 0) {
        setContractClauses(data.clauses);
        setFullText(data.fullText || '');
        setUploadStatus('complete');
        playPop();
      } else {
        throw new Error('No clauses could be extracted from the edited text.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
      setUploadStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };



  // Smart Download Engine
  const handleDownload = () => {
    const textToDownload = editedDocText || fallbackText;
    if (!textToDownload) return;
    playPop();

    const name = fileName || 'contract_audit.pdf';
    const ext = name.split('.').pop()?.toLowerCase() || 'pdf';

    const isPdfFallback = !['docx', 'doc', 'md', 'txt'].includes(ext);

    if (ext === 'pdf' || isPdfFallback) {
      // Smart PDF Print saving: opens printable formatted tab & triggers native print/PDF save dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const titleName = name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        printWindow.document.write(`
          <html>
            <head>
              <meta charset="utf-8">
              <title>${titleName} (Revised Draft)</title>
              <style>
                @page {
                  size: auto;
                  margin: 20mm;
                }
                body {
                  font-family: Georgia, serif;
                  line-height: 1.6;
                  color: #111;
                  padding: 40px;
                  max-width: 800px;
                  margin: 0 auto;
                }
                h1 {
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 5px;
                  font-family: Arial, sans-serif;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .meta {
                  text-align: center;
                  font-size: 11px;
                  color: #555;
                  margin-bottom: 30px;
                  font-family: Arial, sans-serif;
                }
                hr {
                  border: 0;
                  border-top: 2px solid #333;
                  margin-bottom: 30px;
                }
                .content {
                  font-size: 11pt;
                }
              </style>
            </head>
            <body>
              <h1>${titleName}</h1>
              <div class="meta">AuraSign Revised Audit Version &bull; Verbatim Copy Draft</div>
              <hr />
              <div class="content">${textToDownload}</div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else if (ext === 'docx' || ext === 'doc') {
      // High-fidelity structured MS-Word doc export using custom office XML wrapper
      const titleName = name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>${titleName}</title>
            <style>
              @page {
                size: 8.5in 11in;
                margin: 1.0in 1.0in 1.0in 1.0in;
              }
              body {
                font-family: 'Georgia', serif;
                line-height: 1.6;
                color: #222;
              }
              h1 {
                font-family: 'Arial', sans-serif;
                font-size: 18pt;
                text-align: center;
                margin-bottom: 6pt;
                font-weight: bold;
              }
              .meta {
                font-family: 'Arial', sans-serif;
                font-size: 9pt;
                color: #666;
                text-align: center;
                margin-bottom: 24pt;
              }
              hr {
                border: 0;
                border-top: 1px solid #999;
                margin-bottom: 24pt;
              }
              p {
                margin-bottom: 12pt;
                font-size: 11pt;
              }
            </style>
          </head>
          <body>
            <h1>${titleName.toUpperCase()}</h1>
            <div class="meta">AuraSign Revised Contract Audit Version &bull; Verbatim Copy Draft</div>
            <hr />
            <div>${textToDownload}</div>
          </body>
        </html>
      `;
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name.replace(`.${ext}`, `_revised.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (ext === 'md') {
      const blob = new Blob([textToDownload], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name.replace(`.${ext}`, `_revised.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Default to plain text for .txt and general text
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name.replace(`.${ext}`, `_revised.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };



  // Safe loading spinner during Zustand store rehydration
  if (!hasHydrated) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4 bg-[#FDFBF7]/40 dark:bg-white/5 backdrop-blur-2xl px-10 py-8 rounded-[30px] border border-[#4A3B2C]/10 dark:border-white/10 shadow-2xl">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#D4A373]/30 dark:border-white/10" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[#D4A373] dark:border-white animate-spin" />
          </div>
          <p className="text-sm font-medium tracking-wide text-[#4A3B2C]/70 dark:text-white/70">Restoring Workspace...</p>
        </div>
      </div>
    );
  }

  // 5. Compute Side-Floating card lists depending on view modes

  // A. Risk Mode Sorting: Prioritized by risk severity (High -> Medium -> Low)
  const riskPriority = { high: 3, medium: 2, low: 1 };
  const sortedSuggestionsByRisk = [...contractClauses].sort((a, b) => {
    const sevA = a.riskSeverity ?? 'low';
    const sevB = b.riskSeverity ?? 'low';
    return (riskPriority[sevB] ?? 1) - (riskPriority[sevA] ?? 1);
  });
  
  const riskMediumLowClauses = sortedSuggestionsByRisk.filter(c => c.riskSeverity !== 'high');
  const riskHighClauses = sortedSuggestionsByRisk.filter(c => c.riskSeverity === 'high');

  // B. Timeline Mode Sorting: Sequential order top-to-bottom as found in contract
  const timelineLeftClauses = contractClauses.filter((_, idx) => idx % 2 === 0);
  const timelineRightClauses = contractClauses.filter((_, idx) => idx % 2 !== 0);

  // C. Map display card groups based on toggle state
  const leftSidebarCards = viewMode === 'risk' ? riskMediumLowClauses : timelineLeftClauses;
  const rightSidebarCards = viewMode === 'risk' ? riskHighClauses : timelineRightClauses;

  const leftSidebarTitle = viewMode === 'risk' ? 'OPERATIONAL CRITERIA (MED/LOW)' : 'CONTRACT PIPELINE (EVEN)';
  const rightSidebarTitle = viewMode === 'risk' ? 'CRITICAL EXPOSURES (HIGH)' : 'CONTRACT PIPELINE (ODD)';

  // Check if current text differs from originally uploaded cached text, suggesting a re-analysis
  const isEdited = (editedDocText || fallbackText) !== (fullText || fallbackText);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">

      {/* ========================================== */}
      {/*   1. UPLOAD / PROCESSING LAYERS            */}
      {/* ========================================== */}
      {(uploadStatus === 'idle' || uploadStatus === 'processing') && (
        <div
          onClick={() => !isLoading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`pointer-events-auto relative flex flex-col items-center justify-center gap-5 p-12 sm:p-20 rounded-[40px] backdrop-blur-2xl border border-dashed transition-all cursor-pointer select-none
            ${isDragOver
              ? 'bg-[#D4A373]/20 dark:bg-white/20 border-[#D4A373] dark:border-white/60 scale-[1.02]'
              : 'bg-[#FDFBF7]/95 dark:bg-zinc-900/90 border-[#4A3B2C]/20 dark:border-white/20 hover:border-[#D4A373]/60 dark:hover:border-white/50'
            } ${isLoading ? 'cursor-wait' : ''}`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[#D4A373]/30 dark:border-white/10" />
                <div className="absolute inset-0 rounded-full border-t-2 border-[#D4A373] dark:border-white animate-spin" />
                <FileText className="w-8 h-8 text-[#D4A373] dark:text-white/70" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-[#4A3B2C] dark:text-white">
                  Analyzing <span className="text-[#D4A373] dark:text-white/60">{fileName}</span>
                </p>
                <p className="text-sm text-[#4A3B2C]/50 dark:text-white/40 mt-1">AI is reading your contract…</p>
              </div>
            </div>
          ) : (
            <>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors
                ${isDragOver ? 'bg-[#D4A373]/20 dark:bg-white/20' : 'bg-[#4A3B2C]/8 dark:bg-white/10'}`}>
                <UploadCloud className="w-10 h-10 text-[#8B6F47] dark:text-white/80" />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-semibold text-[#4A3B2C] dark:text-white">
                  {isDragOver ? 'Drop to analyze' : 'Upload Contract'}
                </h2>
                <p className="text-[#4A3B2C]/50 dark:text-white/50 font-light mt-1">
                  Drag and drop, or click to browse
                </p>
                <p className="text-xs text-[#4A3B2C]/35 dark:text-white/30 mt-2 tracking-wide uppercase">
                  {ACCEPTED_LABEL}
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-3 max-w-xs p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-left">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <input
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/*   2. COMPLETE 2D WORKSPACE LAYOUT          */}
      {/* ========================================== */}
      {uploadStatus === 'complete' && (
        <div className="w-full max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-6 pt-24 relative select-text">
          
          {/* Floating Pill Toggles (Original Navbar Design restored!) */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FDFBF7]/90 dark:bg-zinc-900/90 backdrop-blur-md border border-[#4A3B2C]/10 dark:border-white/10 shadow-xl z-30 select-none">
            {(['risk', 'timeline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); playPop(); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                  ${viewMode === mode
                    ? 'bg-[#D4A373] text-white dark:bg-white dark:text-black shadow-sm'
                    : 'text-[#4A3B2C]/60 dark:text-white/50 hover:text-[#4A3B2C] dark:hover:text-white'
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Central Workspace sidebars */}
          <div className="flex-1 flex gap-6 items-stretch justify-center min-h-0 relative mb-5">
            
            {/* LEFT COLUMN: Low/Med Risks or Even Contract Sections */}
            <div className="hidden lg:flex w-72 shrink-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar pointer-events-auto select-none animate-fade-in">
              <h3 className="text-[10px] font-bold tracking-widest text-[#4A3B2C]/50 dark:text-white/40 uppercase mb-1">
                {leftSidebarTitle}
              </h3>
              {leftSidebarCards.map((clause) => (
                <RiskCard key={clause.id} clause={clause} />
              ))}
            </div>

            {/* CENTER PANEL: True Contract Scrollable Sheet (Verbatim/Deconstructed switch and smart downloads) */}
            <div className="flex-1 max-w-xl bg-[#FDFBF7]/95 dark:bg-zinc-950/90 backdrop-blur-2xl rounded-[30px] border border-[#4A3B2C]/10 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden pointer-events-auto">
              
              {/* Central Sheet Header & Dynamic Control Buttons */}
              <div className="p-6 border-b border-[#4A3B2C]/8 dark:border-white/8 select-none flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-[#4A3B2C] dark:text-white truncate">
                      {fileName || 'contract_document.pdf'}
                    </h2>
                    <p className="text-xs text-[#4A3B2C]/50 dark:text-white/40 mt-0.5 truncate">
                      {isEditing ? 'Editing Mode. Type directly to adjust text.' : 'Audited Document View. Highlights show audited sections.'}
                    </p>
                  </div>
                  
                  {/* Control Action Buttons (New Contract, Edit Text, Re-analyze, Download Draft) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    
                    {/* Start with a New Contract button */}
                    <button
                      onClick={reset}
                      title="Start with a new contract"
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#4A3B2C]/5 dark:bg-white/5 border border-[#4A3B2C]/15 dark:border-white/15 text-[#4A3B2C]/70 dark:text-white/70 hover:bg-[#D4A373]/10 hover:text-[#D4A373] dark:hover:text-[#D4A373] transition-all flex items-center gap-1"
                    >
                      New Contract
                    </button>

                    {/* Manual Edit Mode button */}
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setFullText(editedDocText);
                        }
                        setIsEditing(!isEditing);
                        playPop();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1
                        ${isEditing
                          ? 'bg-[#34C759] text-white hover:bg-green-600'
                          : 'bg-[#D4A373]/10 border border-[#D4A373]/30 text-[#D4A373] hover:bg-[#D4A373]/25'
                        }`}
                    >
                      {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      {isEditing ? 'Done' : 'Edit Text'}
                    </button>

                    {/* Smart Download button in header */}
                    <button
                      onClick={handleDownload}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4A373] hover:bg-[#8B6F47] dark:bg-white dark:hover:bg-white/90 text-white dark:text-black transition-all flex items-center gap-1 shadow-sm select-none"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>

                    {/* Pulsing Re-analyze button (Visible when changes exist) */}
                    {isEdited && (
                      <button
                        onClick={handleReanalyze}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0A84FF] text-white hover:bg-blue-600 transition-all flex items-center gap-1 animate-pulse shadow-md shadow-blue-500/10"
                      >
                        Re-analyze
                      </button>
                    )}

                  </div>
                </div>

                {/* Sub-Header segment: Segmented center switch */}
                <div className="flex items-center justify-between border-t border-[#4A3B2C]/5 dark:border-white/5 pt-2.5">
                  
                  {/* Verbatim vs Deconstructed layout center switch */}
                  <div className="flex items-center gap-1 bg-[#4A3B2C]/5 dark:bg-white/5 border border-[#4A3B2C]/10 dark:border-white/10 rounded-full p-0.5 select-none shrink-0">
                    <button
                      onClick={() => { setCenterViewMode('verbatim'); playPop(); }}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all
                        ${centerViewMode === 'verbatim'
                          ? 'bg-[#D4A373] text-white dark:bg-white dark:text-black shadow-sm'
                          : 'text-[#4A3B2C]/60 dark:text-white/50 hover:text-[#4A3B2C]'
                        }`}
                    >
                      True Contract
                    </button>
                    <button
                      onClick={() => { setCenterViewMode('deconstructed'); playPop(); }}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all
                        ${centerViewMode === 'deconstructed'
                          ? 'bg-[#D4A373] text-white dark:bg-white dark:text-black shadow-sm'
                          : 'text-[#4A3B2C]/60 dark:text-white/50 hover:text-[#4A3B2C]'
                        }`}
                    >
                      Audited Structure
                    </button>
                  </div>

                  <div className="text-[10px] text-[#4A3B2C]/40 dark:text-white/30 font-semibold uppercase tracking-wider select-none">
                    Format: {ext.toUpperCase()}
                  </div>

                </div>

              </div>
              
              {/* Central Paragraph / Editor Sheet Area */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-[#0a0a0a] text-sm text-[#3A2E22] dark:text-white/80 leading-relaxed font-serif whitespace-pre-line select-text">
                {centerViewMode === 'deconstructed' && !isEditing ? (
                  /* Audited Structure View: Structured sequential list of section headers with dotted underlines (re-enabled!) */
                  contractClauses.map((clause: Clause, idx: number) => {
                    const isHighlighted = highlightedClauseId === clause.id;
                    const severity = clause.riskSeverity || 'low';
                    const risk = RISK_COLORS[severity] ?? RISK_COLORS.low;
                    const isMatch = hasSearch && clause.text.toLowerCase().includes(searchQuery.toLowerCase());

                    // Dotted underline text style matching the screenshot
                    let underlineStyle = 'underline decoration-dotted decoration-2 underline-offset-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-zinc-900 transition-colors py-0.5';
                    if (severity === 'high') {
                      underlineStyle += ' decoration-[#FF3B30]';
                    } else if (severity === 'medium') {
                      underlineStyle += ' decoration-amber-500';
                    } else {
                      underlineStyle += ' decoration-[#34C759]';
                    }

                    // Highlights when selected/clicked
                    let highlightClass = 'block p-3 rounded-2xl transition-all duration-300 ';
                    if (isHighlighted) {
                      highlightClass += `${risk.bg} ${risk.border} border-l-4 border-l-current ${risk.glow} scale-[1.01]`;
                    } else if (isMatch) {
                      highlightClass += 'bg-[#D4A373]/5 border-l-2 border-l-[#D4A373]';
                    } else {
                      highlightClass += 'bg-transparent border-transparent';
                    }

                    return (
                      <div key={`decon-clause-${clause.id}`} className="mb-6 block text-left">
                        {/* Section Header */}
                        <h4 className="font-serif font-bold text-xs text-[#4A3B2C] dark:text-amber-100/90 tracking-wide uppercase mb-1.5 select-none">
                          SECTION {idx + 1}: {clause.entities?.[0] || 'Obligation'}
                        </h4>

                        {/* Clause Body Text with Underline */}
                        <div
                          id={`doc-clause-${clause.id}`}
                          onClick={() => {
                            setHighlightedClauseId(isHighlighted ? null : clause.id);
                            playPop();
                          }}
                          className={highlightClass}
                        >
                          <p className={`text-sm leading-relaxed text-[#3A2E22] dark:text-white/85 font-serif ${underlineStyle}`}>
                            {clause.text}
                          </p>
                        </div>

                        {/* AI Suggested Correction Box: Render inline below the clicked clause paragraph */}
                        {isHighlighted && (
                          <div className="mt-3 mb-4 pl-4 animate-fade-in relative z-20">
                            <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-zinc-950/95 dark:bg-zinc-900 border border-zinc-800 text-white shadow-2xl text-left max-w-sm">
                              <span className="text-[10px] font-bold tracking-widest text-[#D4A373] uppercase flex items-center gap-1 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                AI Suggested Correction
                              </span>
                              <textarea
                                className="w-full text-xs p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-20 leading-relaxed font-sans select-text"
                                value={correctedTextVal}
                                onChange={(e) => setCorrectedTextVal(e.target.value)}
                              />
                              <div className="flex items-center justify-between select-none">
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  Resolving {severity.toUpperCase()} risk parameter
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setHighlightedClauseId(null); }}
                                    className="text-xs font-semibold text-zinc-400 hover:text-white px-2 py-1 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const originalText = clause.text;
                                      const newDocText = (editedDocText || fallbackText).replace(originalText, correctedTextVal);
                                      setEditedDocText(newDocText);
                                      setFullText(newDocText);
                                      setHighlightedClauseId(null);
                                      playPop();
                                    }}
                                    className="bg-[#0A84FF] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all shadow-blue-500/10"
                                  >
                                    Implement
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Native Rich Text View (Mimics Original Layout) */
                  <>
                    <div
                      ref={editorRef}
                      contentEditable={isEditing}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        if (isEditing) {
                          setEditedDocText(e.currentTarget.innerHTML);
                          setFullText(e.currentTarget.innerHTML);
                        }
                      }}
                      className={`w-full min-h-[500px] outline-none font-serif ${isEditing ? 'ring-2 ring-[#D4A373] p-4 rounded-xl shadow-inner bg-black/5 dark:bg-white/5 cursor-text' : ''}`}
                      dangerouslySetInnerHTML={{ __html: editedDocText || fallbackText }}
                    />
                    
                    {/* Global AI Suggestion Overlay Box for Verbatim View */}
                    {highlightedClauseId && !isEditing && (
                      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-auto z-[60] animate-fade-in shadow-2xl">
                        <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-zinc-950/95 dark:bg-zinc-900 border border-zinc-800 text-white shadow-2xl backdrop-blur-xl">
                          <span className="text-[10px] font-bold tracking-widest text-[#D4A373] uppercase flex items-center gap-1 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            AI Suggested Correction
                          </span>
                          <textarea
                            className="w-full text-xs p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-24 leading-relaxed font-sans select-text"
                            value={correctedTextVal}
                            onChange={(e) => setCorrectedTextVal(e.target.value)}
                          />
                          <div className="flex items-center justify-between select-none mt-1">
                            <span className="text-[9px] text-zinc-500 font-mono">
                              Resolving risk parameter
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setHighlightedClauseId(null); }}
                                className="text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const clause = contractClauses.find(c => c.id === highlightedClauseId);
                                  if (clause) {
                                    // Safe replace over plain text nodes or HTML strings
                                    const newDocText = (editedDocText || fallbackText).replace(clause.text, correctedTextVal);
                                    setEditedDocText(newDocText);
                                    setFullText(newDocText);
                                  }
                                  setHighlightedClauseId(null);
                                  playPop();
                                }}
                                className="bg-[#0A84FF] hover:bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-md shadow-blue-500/20 transition-all"
                              >
                                Implement
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: High Risks or Odd Contract Sections */}
            <div className="hidden lg:flex w-72 shrink-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar pointer-events-auto select-none animate-fade-in">
              <h3 className="text-[10px] font-bold tracking-widest text-[#4A3B2C]/50 dark:text-white/40 uppercase mb-1">
                {rightSidebarTitle}
              </h3>
              {rightSidebarCards.map((clause) => (
                <RiskCard key={clause.id} clause={clause} />
              ))}
            </div>

          </div>

          {/* Mobile floating AI recommendation overlay card (Slides up on mobile screen if not editing) */}
          {highlightedClauseId && !isEditing && (
            <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40 pointer-events-auto select-none animate-fade-in">
              {(() => {
                const clause = contractClauses.find(c => c.id === highlightedClauseId);
                if (!clause) return null;
                const sev = (clause.riskSeverity ?? 'low') as 'high' | 'medium' | 'low';
                const risk = RISK_COLORS[sev] ?? RISK_COLORS.low;
                return (
                  <div className={`p-4 rounded-2xl bg-[#FDFBF7]/95 dark:bg-zinc-900/95 border ${risk.border} shadow-2xl flex flex-col gap-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider ${risk.text}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {risk.label}
                      </span>
                      <button
                        onClick={() => setHighlightedClauseId(null)}
                        className="text-[#4A3B2C]/40 dark:text-white/30 hover:text-[#4A3B2C] dark:hover:text-white text-base leading-none"
                      >×</button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#4A3B2C]/70 dark:text-white/60 font-medium select-text">
                      {RISK_DESC[sev]}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Bottom Filter/Search Utility */}
          <div className="flex justify-center pointer-events-auto shrink-0 select-none">
            <div className="flex w-full max-w-md items-center gap-3 bg-[#FDFBF7]/95 dark:bg-zinc-900/95 backdrop-blur-md border border-[#4A3B2C]/10 dark:border-white/10 shadow-lg rounded-2xl px-4 py-2.5">
              <input
                type="text"
                placeholder="Search audit parameters…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-[#4A3B2C] dark:text-white focus:outline-none placeholder:text-[#4A3B2C]/40 dark:placeholder:text-white/40 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#4A3B2C]/40 dark:text-white/30 hover:text-[#4A3B2C] dark:hover:text-white text-base leading-none transition-colors"
                >×</button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ==========================================
//   SUB-COMPONENTS FOR DUAL COLUMN CARDS     
// ==========================================

function RiskCard({ clause }: { clause: Clause }) {
  const highlightedClauseId = useAppStore((state) => state.highlightedClauseId);
  const setHighlightedClauseId = useAppStore((state) => state.setHighlightedClauseId);
  const viewMode = useAppStore((state) => state.viewMode);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const [playPop] = useSound(popSound, { volume: 0.35 });

  const isHighlighted = highlightedClauseId === clause.id;
  const hasSearch = searchQuery.trim().length > 2;
  const isMatch = hasSearch && clause.text.toLowerCase().includes(searchQuery.toLowerCase());
  const isActive = isHighlighted || (hasSearch && isMatch);

  const sev = (clause.riskSeverity ?? 'low') as 'high' | 'medium' | 'low';
  const risk = RISK_COLORS[sev] ?? RISK_COLORS.low;

  return (
    <div
      onClick={() => {
        setHighlightedClauseId(isHighlighted ? null : clause.id);
        playPop();
      }}
      className={`
        w-full rounded-2xl overflow-hidden backdrop-blur-md border text-left
        transition-all duration-300 cursor-pointer select-none
        ${isActive
          ? `bg-[#FDFBF7]/95 dark:bg-[#1a1a1a]/95 ${risk.border} ${risk.glow} border-l-4 scale-[1.01] shadow-xl`
          : 'bg-[#FDFBF7]/75 dark:bg-zinc-900/40 border-[#4A3B2C]/10 dark:border-white/10 hover:border-[#D4A373]/30 dark:hover:border-white/20 shadow-sm'
        }
      `}
    >
      <div className={`h-1 w-full ${risk.bar}`} />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider ${risk.text}`}>
            <span className="w-1 h-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />
            {risk.label}
          </span>
          {clause.date && viewMode === 'timeline' && (
            <span className="text-[9px] font-mono text-[#4A3B2C]/50 dark:text-white/40 tracking-wider">
              {clause.date}
            </span>
          )}
          {clause.entities && clause.entities.length > 0 && viewMode !== 'timeline' && (
            <span className="text-[9px] text-[#4A3B2C]/40 dark:text-white/30 font-medium truncate max-w-[120px]">
              {clause.entities[0]}
            </span>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-[#3A2E22] dark:text-white/80 line-clamp-3">
          {clause.text}
        </p>

        {/* AI Insight Slide down */}
        {isActive && (
          <div className="mt-3 pt-3 border-t border-[#4A3B2C]/8 dark:border-white/8 animate-fade-in select-text space-y-2.5">
            {clause.reasoning && (
              <div>
                <p className={`text-[9px] leading-relaxed text-[#D4A373] font-bold tracking-wider uppercase`}>
                  AI Analysis:
                </p>
                <p className="text-[10px] leading-relaxed text-[#4A3B2C]/70 dark:text-white/60 mt-0.5 font-medium">
                  {clause.reasoning}
                </p>
              </div>
            )}
            <div>
              <p className={`text-[9px] leading-relaxed ${risk.text} font-bold tracking-wider uppercase`}>
                System Rule:
              </p>
              <p className="text-[10px] leading-relaxed text-[#4A3B2C]/70 dark:text-white/60 mt-0.5 font-medium">
                {RISK_DESC[sev]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
