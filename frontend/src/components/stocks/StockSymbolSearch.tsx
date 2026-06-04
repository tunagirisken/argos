import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StockLogo } from "./StockLogo";
import { api, type SymbolSearchResult } from "../../services/api";

const ROW_H = 52;
const LIST_H = 320;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface StockPick {
  symbol: string;
  name: string;
  exchange: string;
}

interface Props {
  value: string;
  onChange: (symbol: string) => void;
  onSelect?: (pick: StockPick) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StockSymbolSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Sembol veya şirket ara…",
  disabled,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const debounced = useDebounced(value, 120);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchSymbols(q, 50);
      setResults(res.results);
      setHighlight(0);
      setScrollTop(0);
      if (listRef.current) listRef.current.scrollTop = 0;
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !debounced.trim()) {
      if (!debounced.trim()) setResults([]);
      return;
    }
    fetchResults(debounced);
  }, [debounced, open, fetchResults]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: SymbolSearchResult) => {
    onChange(item.symbol);
    onSelect?.({ symbol: item.symbol, name: item.name, exchange: item.exchange });
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!listRef.current || !open) return;
    const rowTop = highlight * ROW_H;
    const rowBottom = rowTop + ROW_H;
    const viewTop = scrollTop;
    const viewBottom = scrollTop + LIST_H;
    if (rowTop < viewTop) listRef.current.scrollTop = rowTop;
    else if (rowBottom > viewBottom) listRef.current.scrollTop = rowBottom - LIST_H;
  }, [highlight, open, scrollTop]);

  const totalH = results.length * ROW_H;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 2);
  const visible = Math.ceil(LIST_H / ROW_H) + 4;
  const windowed = results.slice(start, start + visible);

  return (
    <div className="symbol-search" ref={wrapRef}>
      <div className="symbol-search__input-wrap field__wrap">
        <input
          type="text"
          className="symbol-search__input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {loading && <span className="symbol-search__spinner" aria-hidden />}
      </div>

      {open && value.trim() && (
        <div className="symbol-search__dropdown" role="listbox" id={listId}>
          {results.length === 0 && !loading ? (
            <div className="symbol-search__empty">Sonuç yok</div>
          ) : (
            <div
              ref={listRef}
              className="symbol-search__list"
              style={{ height: LIST_H }}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
              <div style={{ height: totalH, position: "relative" }}>
                {windowed.map((item, i) => {
                  const idx = start + i;
                  const active = idx === highlight;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`symbol-search__row${active ? " symbol-search__row--active" : ""}`}
                      style={{ top: idx * ROW_H, height: ROW_H }}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(item)}
                    >
                      <StockLogo symbol={item.symbol} size={32} />
                      <div className="symbol-search__meta">
                        <span className="symbol-search__ticker">{item.symbol}</span>
                        <span className="symbol-search__name">{item.name}</span>
                      </div>
                      <span className="symbol-search__exchange">{item.exchange}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
