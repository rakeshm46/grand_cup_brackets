import { useState, useEffect, useRef, useCallback } from 'react';
import { parseBracketData } from './apiAdapter';

const API_URL = 'https://api-u.tradeify.co/app/v1/journal/campaign/gc2-bracket/?pool=all';
const POLL_INTERVAL_MS = 30_000;

export function useBracketAPI(activePool) {
  const [data, setData] = useState({ matches: [], tradersById: {}, tradersList: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs to avoid stale closures in the polling interval
  const rawDataRef = useRef(null);
  const activePoolRef = useRef(activePool);

  // Keep the ref in sync with the latest activePool value
  activePoolRef.current = activePool;

  const parseAndSet = useCallback((json, pool) => {
    const parsed = parseBracketData(json, pool);
    setData(parsed);
  }, []);

  // One-time setup: fetch + poll every 30s
  useEffect(() => {
    let isMounted = true;
    let interval = null;

    async function fetchData() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
        const json = await res.json();

        if (isMounted) {
          rawDataRef.current = json;
          parseAndSet(json, activePoolRef.current);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('[useBracketAPI] Error:', err.message);
        if (isMounted && !rawDataRef.current) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    fetchData();
    interval = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseAndSet]); // Run once — activePool changes are handled below

  // Instantly re-parse cached data when the user switches pool tabs
  useEffect(() => {
    if (rawDataRef.current) {
      parseAndSet(rawDataRef.current, activePool);
    }
  }, [activePool, parseAndSet]);

  return { ...data, isLoading, error };
}
