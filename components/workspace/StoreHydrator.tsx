'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

export function StoreHydrator() {
  useEffect(() => {
    const hydrateStore = async () => {
      try {
        // Trigger manual store rehydration from localStorage
        await useAppStore.persist.rehydrate();
        
        const state = useAppStore.getState();
        
        // Sanitize hydrated state to ensure UI integrity:
        // 1. If contractClauses are empty, uploadStatus MUST be 'idle'
        // 2. If uploadStatus is still stuck on 'processing' (e.g. page was refreshed mid-process), reset to 'idle'
        if (!state.contractClauses || state.contractClauses.length === 0) {
          useAppStore.setState({ uploadStatus: 'idle', fileName: null, fullText: '' });
        } else if (state.uploadStatus === 'processing') {
          useAppStore.setState({ uploadStatus: 'idle' });
        }
      } catch (error) {
        console.error('Failed to rehydrate app store:', error);
      } finally {
        // Mark hydration as finished to let the UI render the correct state
        useAppStore.setState({ hasHydrated: true });
      }
    };

    hydrateStore();
  }, []);

  return null;
}
