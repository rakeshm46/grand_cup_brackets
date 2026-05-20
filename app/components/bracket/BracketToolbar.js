import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TRADERS, TRADERS_BY_ID } from '../../api/data-engine';

// -------- Inline icons --------
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
    <path d="M9.2 9.2 L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconClose = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
       style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
    <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ROUND_SEARCH_ITEMS = [
  { isRound: true, id: 'R256', handle: 'Round of 256', keywords: ['r256', '256'] },
  { isRound: true, id: 'R128', handle: 'Round of 128', keywords: ['r128', '128'] },
  { isRound: true, id: 'R64', handle: 'Round of 64', keywords: ['r64', '64'] },
  { isRound: true, id: 'R32', handle: 'Round of 32', keywords: ['r32', '32'] },
  { isRound: true, id: 'R16', handle: 'Sweet 16', keywords: ['r16', '16', 'sweet'] },
  { isRound: true, id: 'QF', handle: 'Quarterfinals', keywords: ['qf', 'quarter', 'quarterfinals'] },
  { isRound: true, id: 'SF', handle: 'Semifinals', keywords: ['sf', 'semi', 'semifinals'] },
  { isRound: true, id: 'F', handle: 'Championship Finals', keywords: ['f', 'final', 'finals', 'champion'] },
];

export function SearchTraders({ query, setQuery, selectedId, setSelectedId, activePool, setActivePool, selectedRoundId, setSelectedRoundId }) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TRADERS.slice(0, 8);
    
    const roundMatches = ROUND_SEARCH_ITEMS.filter(r => 
      r.handle.toLowerCase().includes(q) || r.keywords.some(k => k.includes(q))
    );
    
    const traderMatches = TRADERS.filter(t => {
      return t.handle.toLowerCase().includes(q)
        || t.country.toLowerCase().includes(q)
        || ('seed' + t.seed).includes(q.replace(/[^a-z0-9]/g, ''))
        || (t.isOutlaw && 'outlaw'.includes(q));
    }).slice(0, 14);
    
    return [...roundMatches, ...traderMatches].slice(0, 14);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { setHoverIdx(0); }, [query, open]);

  const pickItem = (t) => {
    setQuery(t.handle);
    setOpen(false);
    
    if (t.isRound) {
      setSelectedId(null);
      if (setSelectedRoundId) setSelectedRoundId(t.id);
    } else {
      if (setSelectedRoundId) setSelectedRoundId(null);
      setSelectedId(t.id);
      if (t.bracket && t.bracket !== activePool) {
        setActivePool(t.bracket);
      }
    }
  };

  const clear = () => {
    setQuery('');
    setSelectedId(null);
    if (setSelectedRoundId) setSelectedRoundId(null);
    setOpen(false);
    inputRef.current && inputRef.current.focus();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHoverIdx(i => Math.min(matches.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHoverIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[hoverIdx]) pickItem(matches[hoverIdx]); }
    else if (e.key === 'Escape') {
      if (query || selectedId || selectedRoundId) clear();
      else setOpen(false);
      inputRef.current && inputRef.current.blur();
    }
  };

  const activeSelected = !!selectedId || !!selectedRoundId;

  return (
    <div className={'tb-search' + (activeSelected ? ' is-active' : '')} ref={wrapRef}>
      <span className="tb-search-icon"><IconSearch /></span>
      <input
        ref={inputRef}
        className="tb-search-input"
        type="text"
        placeholder="Search traders or rounds…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedId(null); if (setSelectedRoundId) setSelectedRoundId(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        spellCheck={false}
        autoComplete="off"
      />
      {(query || activeSelected) && (
        <button className="tb-search-clear" onClick={clear} title="Clear search" aria-label="Clear search">
          <IconClose />
        </button>
      )}
      {open && (
        <div className="tb-dropdown tb-search-dropdown" role="listbox">
          {matches.length === 0 && (
            <div className="tb-empty">No results match “{query}”</div>
          )}
          {matches.map((t, i) => (
            <button
              key={t.id}
              role="option"
              aria-selected={i === hoverIdx}
              className={'tb-search-row' + (i === hoverIdx ? ' is-hover' : '') + (t.isOutlaw ? ' is-outlaw' : '') + (t.isRound ? ' is-round' : '')}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); pickItem(t); }}
              style={t.isRound ? { justifyContent: 'center', background: 'rgba(213, 161, 50, 0.05)' } : {}}
            >
              {t.isRound ? (
                <span style={{ color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em' }}>{t.handle}</span>
              ) : (
                <>
                  <span className="tb-search-flag">{t.flag}</span>
                  <span className="tb-search-handle">{t.handle}</span>
                  <span className="tb-search-seed">#{t.seed}</span>
                  <span className="tb-search-bracket" style={{ color: 'var(--gold)', marginLeft: 8, fontSize: 9 }}>POOL {t.bracket}</span>
                  {t.isOutlaw && (
                    <span className="tb-search-outlaw"><span className="skull">☠</span>OUTLAW</span>
                  )}
                </>
              )}
            </button>
          ))}
          <div className="tb-search-hint">↑↓ navigate · ↵ select · esc clear</div>
        </div>
      )}
    </div>
  );
}

export function OutlawFilter({ selectedIds, setSelectedIds, activePool, setActivePool }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const outlaws = useMemo(() => TRADERS.filter(t => t.isOutlaw), []);
  const total = outlaws.length;
  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === total;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggleOne = (t) => {
    const next = new Set(selectedIds);
    if (next.has(t.id)) {
      next.delete(t.id);
    } else {
      next.add(t.id);
      if (t.bracket && t.bracket !== activePool) {
        setActivePool(t.bracket);
      }
    }
    setSelectedIds(next);
  };
  const toggleAll = () => {
    if (allSelected || selectedCount > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(outlaws.map(t => t.id)));
  };
  const clearAll = () => setSelectedIds(new Set());

  const isActive = selectedCount > 0;
  let label = 'Outlaws';
  if (isActive) {
    if (allSelected) label = 'All Outlaws';
    else if (selectedCount === 1) label = TRADERS_BY_ID[Array.from(selectedIds)[0]]?.handle || '';
    else label = selectedCount + ' selected';
  }

  return (
    <div className={'tb-outlaw' + (isActive ? ' is-active' : '') + (open ? ' is-open' : '')} ref={wrapRef}>
      <button
        className={'tb-outlaw-trigger' + (isActive ? ' is-active' : '')}
        onClick={() => setOpen(o => !o)}
        title="Filter to outlaw matchups"
      >
        <span className="skull" aria-hidden="true" style={{ fontSize: 13 }}>☠</span>
        <span className="tb-outlaw-label">{label}</span>
        {isActive ? (
          <span className="tb-outlaw-count">{selectedCount}/{total}</span>
        ) : (
          <span className="tb-outlaw-count tb-outlaw-count-mute">{total}</span>
        )}
        <IconChevron open={open} />
      </button>
      {open && (
        <div className="tb-dropdown tb-outlaw-dropdown" role="menu">
          <button
            className={'tb-outlaw-row tb-outlaw-all' + (allSelected ? ' is-checked' : '') + (isActive && !allSelected ? ' is-indet' : '')}
            onClick={toggleAll}
          >
            <span className={'tb-check' + (allSelected ? ' is-checked' : '') + (isActive && !allSelected ? ' is-indet' : '')} aria-hidden="true">
              {allSelected && <span className="tb-check-mark">✓</span>}
              {isActive && !allSelected && <span className="tb-check-dash">–</span>}
            </span>
            <span className="tb-outlaw-all-label">All Outlaws</span>
            <span className="tb-outlaw-row-meta">{total}</span>
          </button>
          <div className="tb-outlaw-divider" />
          <div className="tb-outlaw-list">
            {outlaws.map(t => {
              const checked = selectedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  className={'tb-outlaw-row' + (checked ? ' is-checked' : '')}
                  onClick={() => toggleOne(t)}
                >
                  <span className={'tb-check' + (checked ? ' is-checked' : '')} aria-hidden="true">
                    {checked && <span className="tb-check-mark">✓</span>}
                  </span>
                  <span className="tb-outlaw-flag">{t.flag}</span>
                  <span className="tb-outlaw-handle">{t.handle}</span>
                  <span className="tb-outlaw-row-meta" style={{ fontSize: 8 }}>POOL {t.bracket}</span>
                  <span className="tb-outlaw-row-meta">#{t.seed}</span>
                </button>
              );
            })}
          </div>
          <div className="tb-outlaw-foot">
            {!isActive && <span className="tb-foot-mute">Pick outlaws to focus the bracket on their paths.</span>}
            {isActive && (
              <>
                <span className="skull" aria-hidden="true">☠</span>
                <span style={{ flex: 1 }}>
                  {allSelected
                    ? <>Highlighting <strong>all 24 outlaw matchups</strong>.</>
                    : selectedCount === 1
                      ? <>Highlighting <strong>{TRADERS_BY_ID[Array.from(selectedIds)[0]]?.handle}</strong>'s matches.</>
                      : <>Highlighting matches with <strong>{selectedCount} outlaws</strong>.</>}
                </span>
                <button className="tb-outlaw-reset" onClick={clearAll}>Clear</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BracketToolbar({ search, setSearch, selectedTraderId, setSelectedTraderId, outlawFilterIds, setOutlawFilterIds, totalMatches, visibleMatches, activePool, setActivePool, selectedRoundId, setSelectedRoundId }) {
  const filtersActive = !!selectedTraderId || outlawFilterIds.size > 0 || !!selectedRoundId;
  return (
    <div className="bracket-toolbar">
      <SearchTraders
        query={search}
        setQuery={setSearch}
        selectedId={selectedTraderId}
        setSelectedId={setSelectedTraderId}
        activePool={activePool}
        setActivePool={setActivePool}
        selectedRoundId={selectedRoundId}
        setSelectedRoundId={setSelectedRoundId}
      />
      <div className="tb-divider" aria-hidden="true" />
      <OutlawFilter
        selectedIds={outlawFilterIds}
        setSelectedIds={setOutlawFilterIds}
        activePool={activePool}
        setActivePool={setActivePool}
      />
      {filtersActive && (
        <div className="tb-result-pill" title="Matches in focus / total">
          <span className="tb-result-num">{visibleMatches}</span>
          <span className="tb-result-of">/ {totalMatches}</span>
          <span className="tb-result-label">matches</span>
        </div>
      )}
    </div>
  );
}
