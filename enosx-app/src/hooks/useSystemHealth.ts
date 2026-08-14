import { useState, useEffect, useCallback, useRef } from 'react';

export interface BandwidthSample {
  timestamp: number;
  speedMbps: number;
}

export interface SystemHealth {
  speedMbps: number | null;
  history: BandwidthSample[];
  status: 'online' | 'offline' | 'degraded';
  lastUpdated: number;
}

const SPEED_TEST_SIZE_BYTES = 256 * 1024; // 256KB for ENOSX high-speed inference
const MAX_HISTORY = 30;

export function useSystemHealth(intervalMs = 10000) {
  const [health, setHealth] = useState<SystemHealth>({
    speedMbps: null,
    history: [],
    status: 'online',
    lastUpdated: Date.now(),
  });

  const isMeasuringRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const measureSpeed = useCallback(async () => {
    if (isMeasuringRef.current) return;
    isMeasuringRef.current = true;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const startTime = performance.now();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/speed-test?size=${SPEED_TEST_SIZE_BYTES}&t=${Date.now()}`, {
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Speed test failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let receivedBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.length;
      }

      const endTime = performance.now();
      const durationSec = (endTime - startTime) / 1000;
      const speedMbps = (receivedBytes * 8) / (1000000 * durationSec);

      setHealth(prev => {
        const newHistory = [...prev.history, { timestamp: Date.now(), speedMbps }].slice(-MAX_HISTORY);
        return {
          speedMbps,
          history: newHistory,
          status: speedMbps < 1 ? 'degraded' : 'online',
          lastUpdated: Date.now(),
        };
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('System health check failed:', error);
      setHealth(prev => ({ ...prev, status: 'offline', lastUpdated: Date.now() }));
    } finally {
      isMeasuringRef.current = false;
    }
  }, []);

  useEffect(() => {
    measureSpeed();
    const interval = setInterval(measureSpeed, intervalMs);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [measureSpeed, intervalMs]);

  return health;
}
