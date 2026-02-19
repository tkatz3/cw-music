import { useState, useCallback, useRef } from 'react';
import type { RadioBrowserStation } from './useStations';

const API_BASE = 'https://de1.api.radio-browser.info/json';

export function useRadioBrowser() {
  const [results, setResults] = useState<RadioBrowserStation[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const resp = await fetch(
          `${API_BASE}/stations/search?name=${encodeURIComponent(query)}&limit=20&hidebroken=true&order=votes&reverse=true`,
          { headers: { 'User-Agent': 'CultureWorksMusic/1.0' } }
        );
        const data: RadioBrowserStation[] = await resp.json();
        setResults(data.filter((s) => !!s.url_resolved));
      } catch (e) {
        console.error('Radio Browser search error:', e);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  function clearResults() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResults([]);
  }

  return { results, searching, search, clearResults };
}
