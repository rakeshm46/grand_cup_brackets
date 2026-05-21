import React, { useState, useEffect, useContext } from 'react';
import { BracketContext } from './BracketContext';

export function SearchTraders({ value, onChange, onSelectRound }) {
  const [open, setOpen] = useState(false);
  const { tradersList } = useContext(BracketContext);

  const q = (value || '').toLowerCase();
  const hits = q ? tradersList.filter(t => t.handle.toLowerCase().includes(q) || String(t.seed) === q).slice(0, 8) : [];

  const rounds = [
    { id: 'F', label: 'Finals' },
    { id: 'SF', label: 'Semifinals' },
    { id: 'QF', label: 'Quarterfinals' },
    { id: 'R16', label: 'Round of 16' },
    { id: 'R32', label: 'Round of 32' },
    { id: 'R64', label: 'Round of 64' },
    { id: 'R128', label: 'Round of 128' },
    { id: 'R256', label: 'Round of 256' },
  ];
  const roundHits = q ? rounds.filter(r => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) : [];

  return (
    <div className="tb-search">
      <div className="tb-search-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <input
        type="text"
        className="tb-search-input"
        placeholder="Search traders, seeds, or rounds..."
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {value && (
        <button className="tb-search-clear" onClick={() => { onChange(''); onSelectRound(null); }}>×</button>
      )}
      
      {open && q && (
        <div className="tb-dropdown tb-search-dropdown">
          {roundHits.length > 0 && (
            <div className="search-group">
              <div className="tb-search-hint" style={{ borderTop: 'none', padding: '0 0 4px', textAlign: 'left', margin: '4px 8px' }}>ROUNDS</div>
              {roundHits.map(r => (
                <button key={r.id} className="tb-search-row is-hover" onClick={() => onSelectRound(r.id)}>
                  <span className="tb-search-flag">🗓️</span>
                  <span className="tb-search-handle">{r.label}</span>
                  <span className="tb-search-seed">{r.id}</span>
                </button>
              ))}
            </div>
          )}
          {hits.length > 0 && (
            <div className="search-group">
              <div className="tb-search-hint" style={{ borderTop: roundHits.length > 0 ? '1px solid var(--line-hair)' : 'none', padding: '6px 0 4px', textAlign: 'left', margin: '4px 8px' }}>TRADERS</div>
              {hits.map(t => {
                const isOutlaw = t.isOutlaw;
                return (
                  <button key={t.id} className={`tb-search-row is-hover ${isOutlaw ? 'is-outlaw' : ''}`} onClick={() => onChange(t.id)}>
                    <span className="tb-search-flag">{t.flag}</span>
                    <span className="tb-search-handle">{t.handle}</span>
                    {isOutlaw ? (
                      <span className="tb-search-outlaw"><span className="skull">☠</span> $5K</span>
                    ) : (
                      <span className="tb-search-seed">#{t.seed}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {hits.length === 0 && roundHits.length === 0 && <div className="tb-empty">No matches found.</div>}
        </div>
      )}
    </div>
  );
}

export function OutlawFilter({ outlawFilterIds, setOutlawFilterIds, activePool, setActivePool }) {
  const [open, setOpen] = useState(false);
  const { tradersList } = useContext(BracketContext);
  
  const outlaws = tradersList.filter(t => t.isOutlaw);
  
  const switchPoolForTrader = (t) => {
    if (!t || !t.bracket) return;
    const b = String(t.bracket).toLowerCase();
    let pKey = activePool;
    if (b.includes('alpha') || b === 'a') pKey = 'A';
    else if (b.includes('beta') || b === 'b') pKey = 'B';
    else if (b.includes('gamma') || b === 'c') pKey = 'C';
    else if (b.includes('delta') || b === 'd') pKey = 'D';
    
    if (pKey !== activePool) {
      setActivePool(pKey);
    }
  };

  return (
    <div className="tb-outlaw">
      <button 
        className={`tb-outlaw-trigger ${outlawFilterIds.size > 0 ? 'is-active' : ''}`} 
        onClick={() => setOpen(!open)}
      >
        <span className="skull">☠</span>
        <span className="tb-outlaw-label">Outlaws</span>
        <span className={`tb-outlaw-count ${outlawFilterIds.size === 0 ? 'tb-outlaw-count-mute' : ''}`}>
          {outlawFilterIds.size > 0 ? outlawFilterIds.size : '24'}
        </span>
      </button>
      {open && (
        <div className="tb-dropdown tb-outlaw-dropdown">
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line-hair)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>Bounty Targets</span>
            <button
              onClick={() => { setOutlawFilterIds(new Set()); setOpen(false); }}
              style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', padding: '6px 0' }}>
            {outlaws.map(o => {
              const checked = outlawFilterIds.has(o.id);
              return (
                <button
                  key={o.id}
                  className={`tb-search-row is-outlaw ${checked ? 'is-hover' : ''}`}
                  onClick={() => {
                    const next = new Set(outlawFilterIds);
                    if (checked) next.delete(o.id);
                    else {
                      next.add(o.id);
                      switchPoolForTrader(o);
                    }
                    setOutlawFilterIds(next);
                  }}
                >
                  <input type="checkbox" checked={checked} readOnly style={{ accentColor: 'var(--gold)', pointerEvents: 'none' }} />
                  <span className="tb-search-handle">{o.handle}</span>
                  <span className="tb-search-outlaw"><span className="skull">☠</span> $5K</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function BracketToolbar({
  search, setSearch,
  selectedTraderId, setSelectedTraderId,
  outlawFilterIds, setOutlawFilterIds,
  totalMatches, visibleMatches,
  activePool, setActivePool,
  selectedRoundId, setSelectedRoundId
}) {
  const { tradersById } = useContext(BracketContext);

  useEffect(() => {
    if (search && tradersById[search]) {
      const t = tradersById[search];
      // Auto-switch pool tab to wherever this trader lives
      if (t && t.bracket) {
        const b = String(t.bracket).toLowerCase();
        let pKey = null;
        if (b.includes('alpha') || b === 'a') pKey = 'A';
        else if (b.includes('beta') || b === 'b') pKey = 'B';
        else if (b.includes('gamma') || b === 'c') pKey = 'C';
        else if (b.includes('delta') || b === 'd') pKey = 'D';
        if (pKey) setActivePool(pKey);
      }
      setSelectedTraderId(search);
      setSelectedRoundId(null);
    } else {
      setSelectedTraderId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tradersById]);

  return (
    <div className="bracket-toolbar">
      <SearchTraders 
        value={search} 
        onChange={setSearch} 
        onSelectRound={(roundId) => {
          setSelectedRoundId(roundId || null);
          setSearch(roundId || '');
          setSelectedTraderId(null);
        }}
      />
      
      <OutlawFilter 
        outlawFilterIds={outlawFilterIds} 
        setOutlawFilterIds={setOutlawFilterIds} 
        activePool={activePool}
        setActivePool={setActivePool}
      />
      
      <div className="tb-divider" />
      
      <div className="tb-result-pill">
        <span className="tb-result-num">{visibleMatches}</span>
        <span className="tb-result-of">/ {totalMatches}</span>
        <span className="tb-result-label">MATCHES</span>
      </div>
      
      {selectedRoundId && (
        <div className="tb-result-pill" style={{ marginLeft: 'auto' }}>
          <span className="tb-result-label">FOCUS:</span>
          <span className="tb-result-num" style={{ marginLeft: 4 }}>{selectedRoundId}</span>
        </div>
      )}
    </div>
  );
}
