'use client';

import { useEffect, useRef } from 'react';

type LoadFn = () => void | Promise<void>;

/**
 * Runs `load()` once immediately on mount, deduping React StrictMode's double
 * effect invocation (which otherwise fires every page's data fetch twice in dev).
 *
 * If a NEW `load()` arrives while a load is in flight (e.g. an association
 * filter changed mid-load), the latest `load()` runs as soon as the current one
 * resolves so the UI never shows stale data.
 */
export function useLoadOnce(load: LoadFn) {
  const loadRef = useRef<LoadFn>(load);
  const activeRef = useRef<LoadFn | null>(null);
  const pendingRef = useRef<LoadFn | null>(null);
  loadRef.current = load;

  useEffect(() => {
    const run = (fn: LoadFn) => {
      Promise.resolve(fn()).finally(() => {
        if (activeRef.current !== fn) return;
        activeRef.current = null;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) {
          activeRef.current = next;
          run(next);
        }
      });
    };

    if (activeRef.current) {
      // StrictMode re-runs this effect with the exact same load — skip it.
      if (activeRef.current !== load) pendingRef.current = loadRef.current;
      return;
    }
    activeRef.current = loadRef.current;
    run(loadRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
}