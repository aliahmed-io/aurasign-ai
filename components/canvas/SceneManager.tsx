'use client';

import { LiquidBackground } from './LiquidBackground';

export function SceneManager({ isDemo }: { isDemo?: boolean }) {
  return <LiquidBackground isDemo={isDemo} />;
}
