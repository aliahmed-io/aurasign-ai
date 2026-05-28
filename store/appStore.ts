import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ViewMode = 'risk' | 'timeline';

export interface Clause {
  id: string;
  text: string;
  riskSeverity: 'low' | 'medium' | 'high';
  date?: string;
  entities?: string[];
  reasoning?: string;
}

interface AppState {
  uploadStatus: 'idle' | 'processing' | 'complete';
  setUploadStatus: (status: 'idle' | 'processing' | 'complete') => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightedClauseId: string | null;
  setHighlightedClauseId: (id: string | null) => void;
  contractClauses: Clause[];
  setContractClauses: (clauses: Clause[]) => void;
  fileName: string | null;
  setFileName: (fileName: string | null) => void;
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  fullText: string;
  setFullText: (text: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      uploadStatus: 'idle',
      setUploadStatus: (status) => set({ uploadStatus: status }),
      viewMode: 'risk',
      setViewMode: (mode) => set({ viewMode: mode }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      highlightedClauseId: null,
      setHighlightedClauseId: (id) => set({ highlightedClauseId: id }),
      contractClauses: [],
      setContractClauses: (clauses) => set({ contractClauses: clauses }),
      fileName: null,
      setFileName: (fileName) => set({ fileName }),
      hasHydrated: false,
      setHasHydrated: (val) => set({ hasHydrated: val }),
      fullText: '',
      setFullText: (text) => set({ fullText: text }),
    }),
    {
      name: 'aurasign-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        uploadStatus: state.uploadStatus === 'processing' ? 'idle' : state.uploadStatus,
        viewMode: state.viewMode,
        contractClauses: state.contractClauses,
        fileName: state.fileName,
        fullText: state.fullText,
      }),
      skipHydration: true,
    }
  )
);
