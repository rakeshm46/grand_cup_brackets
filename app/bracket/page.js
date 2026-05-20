'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  TRADERS,
  TRADERS_BY_ID,
  buildMatches,
  getBalanceSeries,
  getMatchTrades
} from '../api/data-engine';

// -------- Layout constants --------
const MATCH_W = 220;
const MATCH_W_LG = 246;
const MATCH_W_XL = 280;
const CELL_H = 36;
const CELL_H_LG = 42;
const CELL_H_XL = 54;
const COL_GAP = 54;
const V_PAD = 8;
const CENTER_GAP = 80;

const SIDE_ROUNDS = [
  { round: 'R256', label: 'Round of 128', sub: '128 → 64', count: 128, halfCount: 64, width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R128', label: 'Round of 64',  sub: '64 → 32',  count: 64,  halfCount: 32, width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R64',  label: 'Round of 32',  sub: '32 → 16',   count: 32,  halfCount: 16, width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R32',  label: 'Round of 16',  sub: '16 → 8',   count: 16,  halfCount: 8,  width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R16',  label: 'Round of 8',   sub: '8 → 4',    count: 8,   halfCount: 4,  width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'QF',   label: 'Quarterfinals', sub: '4 → 2',    count: 4,   halfCount: 2,  width: MATCH_W_LG, cellH: CELL_H_LG, size: 'size-lg' },
  { round: 'SF',   label: 'Semifinals',   sub: '2 → 1',    count: 2,   halfCount: 1,  width: MATCH_W_LG, cellH: CELL_H_LG, size: 'size-lg' },
];
const FINAL_SPEC = { round: 'F', label: 'Finals', sub: 'LIVE', count: 1, width: MATCH_W_XL, cellH: CELL_H_XL, size: 'size-xl' };

function useLayout() {
  return useMemo(() => {
    const matchH = (size) => {
      const c = size === 'size-xl' ? CELL_H_XL : size === 'size-lg' ? CELL_H_LG : CELL_H;
      return c * 2;
    };
    const firstSpec = SIDE_ROUNDS[0];
    const firstMatchH = matchH(firstSpec.size);
    const firstStep = firstMatchH + V_PAD * 2;
    const halfH = firstStep * firstSpec.halfCount; // Spaced beautifully based on the starting round (64 matches)

    const positions = {};
    const columns = [];

    // Build left side: R256 to SF
    let leftX = 0;
    SIDE_ROUNDS.forEach((spec) => {
      const mh = matchH(spec.size);
      const hc = spec.halfCount;
      const pitch = halfH / hc;
      const firstCenterY = pitch / 2;

      columns.push({ side: 'L', x: leftX, spec });

      for (let i = 0; i < hc; i++) {
        const centerY = firstCenterY + pitch * i;
        const y = centerY - mh / 2;
        positions[`${spec.round}-${i + 1}`] = {
          x: leftX, y, w: spec.width, h: mh, centerY, side: 'L',
        };
      }
      leftX += spec.width + COL_GAP;
    });

    // Center column: Final
    const centerX = leftX + CENTER_GAP - COL_GAP;
    const finalMH = matchH(FINAL_SPEC.size);
    const finalCenterY = halfH / 2;
    positions['F-1'] = {
      x: centerX, y: finalCenterY - finalMH / 2,
      w: FINAL_SPEC.width, h: finalMH, centerY: finalCenterY, side: 'C',
    };
    columns.push({ side: 'C', x: centerX, spec: FINAL_SPEC });

    // Right side: mirrored SF to R256
    let rightX = centerX + FINAL_SPEC.width + CENTER_GAP;
    const rightColumns = [];
    let rx = rightX;
    for (let ri = SIDE_ROUNDS.length - 1; ri >= 0; ri--) {
      const spec = SIDE_ROUNDS[ri];
      rightColumns.push({ x: rx, spec });
      rx += spec.width + COL_GAP;
    }
    
    rightColumns.forEach(({ x, spec }) => {
      const mh = matchH(spec.size);
      const hc = spec.halfCount;
      const pitch = halfH / hc;
      const firstCenterY = pitch / 2;
      for (let i = 0; i < hc; i++) {
        const centerY = firstCenterY + pitch * i;
        const y = centerY - mh / 2;
        const matchNumber = hc + i + 1;
        positions[`${spec.round}-${matchNumber}`] = {
          x, y, w: spec.width, h: mh, centerY, side: 'R',
        };
      }
      columns.push({ side: 'R', x, spec });
    });

    const totalW = rx - COL_GAP;
    const totalH = halfH;
    const champX = centerX + FINAL_SPEC.width / 2;
    const champY = finalCenterY - finalMH / 2 - 180;

    return { positions, columns, totalW, totalH, champX, champY, centerX, finalCenterY };
  }, []);
}

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

// -------- Helper formatter --------
function fmtMoney(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(n)).toLocaleString();
}
function fmtSigned(n) {
  return (n > 0 ? '+' : n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
}

function TraderCell({ traderId, score, isWinner, isLoser, isLive, isLeader, isTrailer, isChampion, cornerClass = '', isOutlawElim = false }) {
  if (!traderId) {
    return (
      <div className={`cell pending ${cornerClass}`}>
        <span className="avatar pending-avatar">·</span>
        <span className="name">Awaiting winner</span>
        <span className="score">—</span>
      </div>
    );
  }
  const t = TRADERS_BY_ID[traderId];
  if (!t) return null;

  let cls = '';
  if (isChampion) cls = 'champion';
  else if (isWinner) cls = 'winner';
  else if (isLoser) cls = 'loser';
  else if (isLeader) cls = 'leader';
  else if (isTrailer) cls = 'trailer';
  else if (isLive) cls = 'live';

  const scoreCls = isLeader ? 'up' : isTrailer ? 'down' : isWinner ? 'up' : '';
  const scoreStr = score != null ? `$${score.toLocaleString()}` : '—';
  const initials = (t.handle.match(/[A-Z0-9]/g) || t.handle.slice(0, 2).toUpperCase().split('')).slice(0, 2).join('');
  const palette = t.avatarPalette || ['#1e445c', '#050607'];
  const avatarStyle = { '--mono-a': palette[0], '--mono-b': palette[1] };

  return (
    <div className={`cell ${cls} ${cornerClass} ${t.isOutlaw ? 'is-outlaw' : ''}`}>
      {isChampion && <span className="crown" aria-hidden="true">👑</span>}
      <span
        className={`avatar mono-avatar ${t.isOutlaw ? 'outlaw' : ''}`}
        aria-label={t.handle}
        style={avatarStyle}
      >
        {initials}
        <span className="mono-flag" aria-hidden="true">{t.flag}</span>
      </span>
      <span className="name">
        {t.handle}
        {t.isOutlaw && (
          <span className="outlaw-mark" title="$5,000 bounty on this trader">
            <span className="skull" aria-hidden="true">☠</span>
            <span>OUTLAW</span>
          </span>
        )}
        {isOutlawElim && (
          <span className="bounty-tag collected" title="Bounty collected">+$5K</span>
        )}
      </span>
      <span className={`score ${scoreCls}`}>{scoreStr}</span>
    </div>
  );
}

function Match({ match, position, sizeClass, onOpen, highlighted, isChampionMatch, isHit, isDim, hitTraderId, isFocusTarget }) {
  const isLive = match.status === 'live';
  const aWin = match.winnerId && match.winnerId === match.aId;
  const bWin = match.winnerId && match.winnerId === match.bId;
  const isPending = match.status === 'pending' && !match.aId && !match.bId;

  const aLeads = isLive && match.aScore > match.bScore;
  const bLeads = isLive && match.bScore > match.aScore;

  const tA = match.aId ? TRADERS_BY_ID[match.aId] : null;
  const tB = match.bId ? TRADERS_BY_ID[match.bId] : null;
  const aIsOutlaw = tA && tA.isOutlaw;
  const bIsOutlaw = tB && tB.isOutlaw;
  const hasOutlaw = aIsOutlaw || bIsOutlaw;

  return (
    <div
      className={[
        'match', sizeClass,
        isLive ? 'live-match' : '',
        highlighted ? 'highlighted' : '',
        isChampionMatch ? 'champion-match' : '',
        isPending ? 'pending-match' : '',
        hasOutlaw ? 'has-outlaw' : '',
        isHit ? 'filter-hit' : '',
        isDim ? 'filter-dim' : '',
        isFocusTarget ? 'filter-focus-target' : '',
      ].filter(Boolean).join(' ')}
      data-hit-trader={hitTraderId || undefined}
      style={{ left: position.x, top: position.y, width: position.w }}
      onClick={() => isPending ? null : onOpen(match)}
    >
      {isChampionMatch && <div className="champion-ring" aria-hidden="true" />}
      <div className="match-id">{match.id}{isChampionMatch ? ' · CHAMPION' : ''}</div>
      {hasOutlaw && (
        <div className="bounty-stamp" title="Outlaw match — $5K bounty">
          <span className="skull">☠</span>
          <span className="amt">$5K BOUNTY</span>
        </div>
      )}
      <TraderCell
        traderId={match.aId}
        score={match.aScore}
        isWinner={aWin}
        isLoser={bWin}
        isLive={isLive && !aWin && !bWin}
        isLeader={aLeads}
        isTrailer={bLeads}
        isChampion={isChampionMatch && aWin}
        cornerClass="cell-top"
        isOutlawElim={bIsOutlaw && aWin}
      />
      <TraderCell
        traderId={match.bId}
        score={match.bScore}
        isWinner={bWin}
        isLoser={aWin}
        isLive={isLive && !aWin && !bWin}
        isLeader={bLeads}
        isTrailer={aLeads}
        isChampion={isChampionMatch && bWin}
        cornerClass="cell-bottom"
        isOutlawElim={aIsOutlaw && bWin}
      />
    </div>
  );
}

function Connectors({ layout, matchById, activePool }) {
  const lines = [];
  const { positions } = layout;

  function pushConnector(aId, bId, parentId, direction) {
    const a = positions[aId];
    const b = positions[bId];
    const parent = positions[parentId];
    if (!a || !b || !parent) return;

    const parentMatch = matchById[parentId];
    const aMatch = matchById[aId];
    const bMatch = matchById[bId];
    const aAdvances = parentMatch && aMatch && (parentMatch.aId === aMatch.winnerId || parentMatch.bId === aMatch.winnerId);
    const bAdvances = parentMatch && bMatch && (parentMatch.aId === bMatch.winnerId || parentMatch.bId === bMatch.winnerId);

    if (direction === 'right') {
      const aOut = a.x + a.w;
      const bOut = b.x + b.w;
      const parentIn = parent.x;
      const midX = (aOut + parentIn) / 2;
      lines.push({ x1: aOut, y1: a.centerY, x2: midX, y2: a.centerY, active: aAdvances });
      lines.push({ x1: bOut, y1: b.centerY, x2: midX, y2: b.centerY, active: bAdvances });
      lines.push({ x1: midX, y1: a.centerY, x2: midX, y2: b.centerY, active: aAdvances || bAdvances });
      lines.push({ x1: midX, y1: parent.centerY, x2: parentIn, y2: parent.centerY, active: aAdvances || bAdvances });
    } else {
      const aOut = a.x;
      const bOut = b.x;
      const parentIn = parent.x + parent.w;
      const midX = (aOut + parentIn) / 2;
      lines.push({ x1: aOut, y1: a.centerY, x2: midX, y2: a.centerY, active: aAdvances });
      lines.push({ x1: bOut, y1: b.centerY, x2: midX, y2: b.centerY, active: bAdvances });
      lines.push({ x1: midX, y1: a.centerY, x2: midX, y2: b.centerY, active: aAdvances || bAdvances });
      lines.push({ x1: midX, y1: parent.centerY, x2: parentIn, y2: parent.centerY, active: aAdvances || bAdvances });
    }
  }

  if (activePool !== 'Championship') {
    // Dynamically draw lines for all SIDE_ROUNDS
    for (let rIdx = 0; rIdx < SIDE_ROUNDS.length - 1; rIdx++) {
      const spec = SIDE_ROUNDS[rIdx];
      const nextSpec = SIDE_ROUNDS[rIdx + 1];
      const hc = spec.halfCount;
      const nextHc = nextSpec.halfCount;

      // Left side: match index i and i+1 connect to parent match floor(i/2) + 1
      for (let i = 0; i < hc; i += 2) {
        const child1 = `${spec.round}-${i + 1}`;
        const child2 = `${spec.round}-${i + 2}`;
        const parent = `${nextSpec.round}-${Math.floor(i / 2) + 1}`;
        pushConnector(child1, child2, parent, 'right');
      }

      // Right side: match index hc + i + 1 and hc + i + 2 connect to parent match nextHc + floor(i/2) + 1
      for (let i = 0; i < hc; i += 2) {
        const child1 = `${spec.round}-${hc + i + 1}`;
        const child2 = `${spec.round}-${hc + i + 2}`;
        const parent = `${nextSpec.round}-${nextHc + Math.floor(i / 2) + 1}`;
        pushConnector(child1, child2, parent, 'left');
      }
    }
  }

  // SF to Final
  const sf1 = positions['SF-1'];
  const sf2 = positions['SF-2'];
  const fin = positions['F-1'];
  const finalMatch = matchById['F-1'];
  const sf1Match = matchById['SF-1'];
  const sf2Match = matchById['SF-2'];
  const sf1Advances = finalMatch && sf1Match && (finalMatch.aId === sf1Match.winnerId || finalMatch.bId === sf1Match.winnerId);
  const sf2Advances = finalMatch && sf2Match && (finalMatch.aId === sf2Match.winnerId || finalMatch.bId === sf2Match.winnerId);
  
  if (sf1 && fin && sf1Match) {
    lines.push({ x1: sf1.x + sf1.w, y1: sf1.centerY, x2: fin.x, y2: fin.centerY, active: sf1Advances });
  }
  if (sf2 && fin && sf2Match) {
    lines.push({ x1: fin.x + fin.w, y1: fin.centerY, x2: sf2.x, y2: sf2.centerY, active: sf2Advances });
  }

  return (
    <svg
      className="connectors"
      width={layout.totalW}
      height={layout.totalH}
      style={{ width: layout.totalW, height: layout.totalH }}
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.active ? '#d5a132' : 'rgba(255,255,255,0.14)'}
          strokeWidth={l.active ? 1.4 : 1}
          strokeLinecap="round"
          opacity={l.active ? 0.85 : 1}
        />
      ))}
    </svg>
  );
}

function RoundHeaders({ layout, activePool }) {
  return (
    <div className="round-heads" style={{ width: layout.totalW, top: -44 }}>
      {layout.columns.map((col, i) => {
        // Under Championship Final Four, skip showing pool-specific headers
        if (activePool === 'Championship' && ['R256', 'R128', 'R64', 'R32', 'R16', 'QF'].includes(col.spec.round)) {
          return null;
        }
        return (
          <div
            key={`${col.side}-${col.spec.round}-${i}`}
            className={`round-head ${col.spec.round === 'F' ? 'final' : ''}`}
            style={{ position: 'absolute', left: col.x, width: col.spec.width }}
          >
            <div className="label">{col.spec.label}</div>
            <div className="sub">{col.spec.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

function ChampionBanner({ match, layout }) {
  if (!match || match.status !== 'done' || !match.winnerId || !layout) return null;
  const champ = TRADERS_BY_ID[match.winnerId];
  if (!champ) return null;
  const fin = layout.positions['F-1'];
  const cx = fin.x + fin.w / 2;
  const cy = fin.y - 58;
  return (
    <div className="champion-banner" style={{ left: cx, top: cy }}>
      <span className="champion-crown">👑</span>
      <span className="champion-label">Grand Cup Champion</span>
      <span className="champion-name">{champ.handle}</span>
      <span className="flag">{champ.flag}</span>
      <span className="champion-prize">$240,000</span>
    </div>
  );
}

function SearchTraders({ query, setQuery, selectedId, setSelectedId, activePool, setActivePool }) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TRADERS.slice(0, 8);
    return TRADERS.filter(t => {
      return t.handle.toLowerCase().includes(q)
        || t.country.toLowerCase().includes(q)
        || ('seed' + t.seed).includes(q.replace(/[^a-z0-9]/g, ''))
        || (t.isOutlaw && 'outlaw'.includes(q));
    }).slice(0, 14);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { setHoverIdx(0); }, [query, open]);

  const pickTrader = (t) => {
    setQuery(t.handle);
    setSelectedId(t.id);
    setOpen(false);
    
    // Automatically switch active pool tab to this trader's pool bracket!
    if (t.bracket && t.bracket !== activePool) {
      setActivePool(t.bracket);
    }
  };

  const clear = () => {
    setQuery('');
    setSelectedId(null);
    setOpen(false);
    inputRef.current && inputRef.current.focus();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHoverIdx(i => Math.min(matches.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHoverIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[hoverIdx]) pickTrader(matches[hoverIdx]); }
    else if (e.key === 'Escape') {
      if (query || selectedId) clear();
      else setOpen(false);
      inputRef.current && inputRef.current.blur();
    }
  };

  const activeSelected = !!selectedId;

  return (
    <div className={'tb-search' + (activeSelected ? ' is-active' : '')} ref={wrapRef}>
      <span className="tb-search-icon"><IconSearch /></span>
      <input
        ref={inputRef}
        className="tb-search-input"
        type="text"
        placeholder="Search 1,024 traders…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedId(null); setOpen(true); }}
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
            <div className="tb-empty">No traders match “{query}”</div>
          )}
          {matches.map((t, i) => (
            <button
              key={t.id}
              role="option"
              aria-selected={i === hoverIdx}
              className={'tb-search-row' + (i === hoverIdx ? ' is-hover' : '') + (t.isOutlaw ? ' is-outlaw' : '')}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); pickTrader(t); }}
            >
              <span className="tb-search-flag">{t.flag}</span>
              <span className="tb-search-handle">{t.handle}</span>
              <span className="tb-search-seed">#{t.seed}</span>
              <span className="tb-search-bracket" style={{ color: 'var(--gold)', marginLeft: 8, fontSize: 9 }}>POOL {t.bracket}</span>
              {t.isOutlaw && (
                <span className="tb-search-outlaw"><span className="skull">☠</span>OUTLAW</span>
              )}
            </button>
          ))}
          <div className="tb-search-hint">↑↓ navigate · ↵ select · esc clear</div>
        </div>
      )}
    </div>
  );
}

function OutlawFilter({ selectedIds, setSelectedIds, activePool, setActivePool }) {
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
      // Automatically toggle active pool to match this outlaw's pool!
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

function BracketToolbar({ search, setSearch, selectedTraderId, setSelectedTraderId, outlawFilterIds, setOutlawFilterIds, totalMatches, visibleMatches, activePool, setActivePool }) {
  const filtersActive = !!selectedTraderId || outlawFilterIds.size > 0;
  return (
    <div className="bracket-toolbar">
      <SearchTraders
        query={search}
        setQuery={setSearch}
        selectedId={selectedTraderId}
        setSelectedId={setSelectedTraderId}
        activePool={activePool}
        setActivePool={setActivePool}
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

function FighterPortrait({ trader }) {
  if (!trader) return null;
  const initials = (trader.handle.match(/[A-Z0-9]/g) || trader.handle.slice(0, 2).toUpperCase().split('')).slice(0, 2).join('');
  const palette = trader.avatarPalette || ['#1e445c', '#050607'];
  return (
    <div
      className="big-avatar mono-big"
      style={{ '--mono-a': palette[0], '--mono-b': palette[1] }}
      aria-label={trader.handle}
    >
      {initials}
      <span className="mono-flag-big" aria-hidden="true">{trader.flag}</span>
    </div>
  );
}

function matchWindow(round) {
  return ({
    R256: '17 — 20 May',
    R128: '21 — 24 May',
    R64:  '25 — 28 May',
    R32:  '31 May — 2 Jun',
    R16:  '3 — 5 Jun',
    QF:   '6 — 8 Jun',
    SF:   '9 — 10 Jun',
    F:    '11 — 12 Jun',
  })[round] || '—';
}
function stakeFor(round) {
  return ({
    R256: '$100',
    R128: '$250',
    R64:  '$500',
    R32:  '$1,000',
    R16:  '$5,000',
    QF:   '$20,000',
    SF:   '$60,000',
    F:    '$240,000',
  })[round] || '—';
}

function niceStep(rough) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  let nice;
  if (n < 1.5) nice = 1;
  else if (n < 3) nice = 2;
  else if (n < 7) nice = 5;
  else nice = 10;
  return nice * pow;
}
function fmtHM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

const COLOR_A = '#E8C36B';
const COLOR_B = '#C84F46';
const COLOR_BASE = 'rgba(255,255,255,0.18)';

function BalanceChart({ match, traderA, traderB, activePool }) {
  const series = useMemo(() => getBalanceSeries(match.id, 'current', activePool), [match.id, activePool]);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  if (!series) return null;

  const W = 760;
  const H = 240;
  const PAD_L = 64;
  const PAD_R = 16;
  const PAD_T = 18;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const allVals = [...series.a, ...series.b].map(p => p.balance);
  const minVal = Math.min(...allVals, series.base);
  const maxVal = Math.max(...allVals, series.base);
  const yPad = (maxVal - minVal) * 0.12 || 500;
  const yMin = minVal - yPad;
  const yMax = maxVal + yPad;

  const xFor = (i) => PAD_L + (i / (series.steps - 1)) * innerW;
  const yFor = (v) => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const pathFor = (pts) => pts.map((p, i) => (i === 0 ? 'M' : 'L') + xFor(i).toFixed(1) + ',' + yFor(p.balance).toFixed(1)).join(' ');
  const areaFor = (pts) => {
    const top = pts.map((p, i) => (i === 0 ? 'M' : 'L') + xFor(i).toFixed(1) + ',' + yFor(p.balance).toFixed(1)).join(' ');
    return top + ' L' + xFor(series.steps - 1).toFixed(1) + ',' + yFor(yMin).toFixed(1) + ' L' + xFor(0).toFixed(1) + ',' + yFor(yMin).toFixed(1) + ' Z';
  };

  const yTicks = niceStep ? (() => {
    const range = yMax - yMin;
    const step = niceStep(range / 4);
    const ticks = [];
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax; v += step) ticks.push(v);
    return ticks;
  })() : [];

  const xTicks = (() => {
    const ticks = [];
    for (let i = 0; i < series.steps; i++) {
      const min = series.startMin + i * 5;
      if (min % 60 === 0) ticks.push({ i, label: fmtHM(min) });
    }
    return ticks;
  })();

  const handleMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * W;
    if (xPx < PAD_L || xPx > W - PAD_R) {
      setHover(null);
      return;
    }
    const frac = (xPx - PAD_L) / innerW;
    const idx = Math.round(frac * (series.steps - 1));
    setHover({ idx: Math.max(0, Math.min(series.steps - 1, idx)) });
  };

  const handleLeave = () => setHover(null);

  const hoverIdx = hover ? hover.idx : null;
  const hoverA = hoverIdx != null ? series.a[hoverIdx] : null;
  const hoverB = hoverIdx != null ? series.b[hoverIdx] : null;

  const lastA = series.a[series.steps - 1];
  const lastB = series.b[series.steps - 1];

  return (
    <div className="bal-chart-wrap">
      <div className="bal-chart-head">
        <div className="bal-legend">
          <span className="bal-leg-item">
            <span className="bal-leg-dot" style={{ background: COLOR_A }} />
            <span className="bal-leg-name">{traderA.handle}</span>
            <span className="bal-leg-val">{fmtMoney(lastA.balance)}</span>
          </span>
          <span className="bal-leg-item">
            <span className="bal-leg-dot" style={{ background: COLOR_B }} />
            <span className="bal-leg-name">{traderB.handle}</span>
            <span className="bal-leg-val">{fmtMoney(lastB.balance)}</span>
          </span>
        </div>
        <div className="bal-chart-label">Account balance · session</div>
      </div>
      <div className="bal-chart-svgwrap">
        <svg
          ref={svgRef}
          className="bal-chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <defs>
            <linearGradient id="bal-grad-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_A} stopOpacity="0.32" />
              <stop offset="100%" stopColor={COLOR_A} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bal-grad-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_B} stopOpacity="0.28" />
              <stop offset="100%" stopColor={COLOR_B} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map(v => (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yFor(v)} y2={yFor(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD_L - 8} y={yFor(v) + 3} textAnchor="end" className="bal-axis-text">{fmtMoney(v)}</text>
            </g>
          ))}
          <line x1={PAD_L} x2={W - PAD_R} y1={yFor(series.base)} y2={yFor(series.base)} stroke={COLOR_BASE} strokeWidth="1" strokeDasharray="3,3" />
          <text x={W - PAD_R - 4} y={yFor(series.base) - 4} textAnchor="end" className="bal-base-text">$50K start</text>

          {xTicks.map(t => (
            <text key={t.i} x={xFor(t.i)} y={H - 8} textAnchor="middle" className="bal-axis-text">{t.label}</text>
          ))}

          <path d={areaFor(series.a)} fill="url(#bal-grad-a)" />
          <path d={areaFor(series.b)} fill="url(#bal-grad-b)" />

          <path d={pathFor(series.a)} fill="none" stroke={COLOR_A} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathFor(series.b)} fill="none" stroke={COLOR_B} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />

          <circle cx={xFor(series.steps - 1)} cy={yFor(lastA.balance)} r="3.5" fill={COLOR_A} stroke="#0e0c08" strokeWidth="1.5" />
          <circle cx={xFor(series.steps - 1)} cy={yFor(lastB.balance)} r="3.5" fill={COLOR_B} stroke="#0e0c08" strokeWidth="1.5" />

          {hoverIdx != null && (
            <g>
              <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={PAD_T} y2={H - PAD_B} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="2,3" />
              <circle cx={xFor(hoverIdx)} cy={yFor(hoverA.balance)} r="3.5" fill={COLOR_A} stroke="#0e0c08" strokeWidth="1.5" />
              <circle cx={xFor(hoverIdx)} cy={yFor(hoverB.balance)} r="3.5" fill={COLOR_B} stroke="#0e0c08" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {hoverIdx != null && (() => {
          const aLead = hoverA.balance >= hoverB.balance;
          const lead = Math.abs(hoverA.balance - hoverB.balance);
          return (
            <div
              className="bal-tooltip"
              style={{ left: `${(xFor(hoverIdx) / W) * 100}%` }}
            >
              <div className="bal-tt-time">{hoverA.time}</div>
              <div className="bal-tt-row">
                <span className="bal-tt-dot" style={{ background: COLOR_A }} />
                <span className="bal-tt-name">{traderA.handle}</span>
                <span className="bal-tt-val">{fmtMoney(hoverA.balance)}</span>
                <span className={'bal-tt-lead ' + (aLead ? 'on' : 'off')}>{aLead ? '+' + fmtMoney(lead) : ''}</span>
              </div>
              <div className="bal-tt-row">
                <span className="bal-tt-dot" style={{ background: COLOR_B }} />
                <span className="bal-tt-name">{traderB.handle}</span>
                <span className="bal-tt-val">{fmtMoney(hoverB.balance)}</span>
                <span className={'bal-tt-lead ' + (!aLead ? 'on' : 'off')}>{!aLead ? '+' + fmtMoney(lead) : ''}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function TradesTable({ match, traderA, traderB, activePool }) {
  const trades = useMemo(() => getMatchTrades(match.id, 'current', activePool), [match.id, activePool]);
  const [filter, setFilter] = useState('all');

  if (!trades) return null;

  const merged = useMemo(() => {
    const all = [];
    trades.a.forEach(t => all.push({ ...t, traderId: match.aId, traderHandle: traderA.handle, color: COLOR_A }));
    trades.b.forEach(t => all.push({ ...t, traderId: match.bId, traderHandle: traderB.handle, color: COLOR_B }));
    all.sort((x, y) => x.min - y.min);
    return all;
  }, [trades, match, traderA, traderB]);

  const visible = filter === 'a'
    ? merged.filter(t => t.traderId === match.aId)
    : filter === 'b'
      ? merged.filter(t => t.traderId === match.bId)
      : merged;

  const aPnl = trades.a.reduce((s, t) => s + t.pnl, 0);
  const bPnl = trades.b.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="trades-wrap">
      <div className="trades-head">
        <div className="trades-title">Trade log <span className="trades-count">· {merged.length} fills</span></div>
        <div className="trades-filter">
          <button className={'tf-btn ' + (filter === 'all' ? 'on' : '')} onClick={() => setFilter('all')}>Both</button>
          <button className={'tf-btn ' + (filter === 'a' ? 'on' : '')} onClick={() => setFilter('a')}>
            <span className="tf-dot" style={{ background: COLOR_A }} />{traderA.handle}
            <span className={'tf-pnl ' + (aPnl >= 0 ? 'pos' : 'neg')}>{fmtSigned(aPnl)}</span>
          </button>
          <button className={'tf-btn ' + (filter === 'b' ? 'on' : '')} onClick={() => setFilter('b')}>
            <span className="tf-dot" style={{ background: COLOR_B }} />{traderB.handle}
            <span className={'tf-pnl ' + (bPnl >= 0 ? 'pos' : 'neg')}>{fmtSigned(bPnl)}</span>
          </button>
        </div>
      </div>
      <div className="trades-table-scroll">
        <table className="trades-table">
          <thead>
            <tr>
              <th className="th-time">Time</th>
              <th className="th-trader">Trader</th>
              <th className="th-side">Side</th>
              <th className="th-instr">Instr</th>
              <th className="th-qty">Qty</th>
              <th className="th-px">Entry</th>
              <th className="th-px">Exit</th>
              <th className="th-pnl">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => (
              <tr key={t.traderId + ':' + t.i} className={t.pnl >= 0 ? 'win' : 'loss'}>
                <td className="td-time">{t.time}</td>
                <td className="td-trader">
                  <span className="td-trader-dot" style={{ background: t.color }} />
                  <span className="td-trader-name">{t.traderHandle}</span>
                </td>
                <td className="td-side">
                  <span className={'side-pill ' + t.side.toLowerCase()}>{t.side}</span>
                </td>
                <td className="td-instr"><span className="instr-tag">{t.instr}</span></td>
                <td className="td-qty">{t.qty}</td>
                <td className="td-px">{t.entry}</td>
                <td className="td-px">{t.exit}</td>
                <td className="td-pnl">
                  <span className={'pnl-pill ' + (t.pnl >= 0 ? 'pos' : 'neg')}>{fmtSigned(t.pnl)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchModal({ match, onClose, activePool }) {
  if (!match) return null;
  const a = TRADERS_BY_ID[match.aId];
  const b = match.bId ? TRADERS_BY_ID[match.bId] : null;
  const aWin = match.winnerId && match.winnerId === match.aId;
  const bWin = match.winnerId && match.winnerId === match.bId;
  
  const roundLabel = ({ R256: 'Round of 128', R128: 'Round of 64', R64: 'Round of 32', R32: 'Round of 16', R16: 'Round of 8', QF: 'Quarterfinals', SF: 'Semifinals', F: 'Finals' })[match.round] || match.round;
  const aLead = match.aScore > (match.bScore || 0);
  const aOutlaw = a && a.isOutlaw;
  const bOutlaw = b && b.isOutlaw;
  const hasOutlaw = aOutlaw || bOutlaw;
  const outlawTrader = aOutlaw ? a : (bOutlaw ? b : null);
  const hunterTrader = aOutlaw ? b : (bOutlaw ? a : null);
  const bountyCollected = (aOutlaw && bWin) || (bOutlaw && aWin);
  const bountyAlive = hasOutlaw && match.status === 'live';
  const bountyDormant = hasOutlaw && match.status === 'done' && !bountyCollected;
  const standardPrize = stakeFor(match.round);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{roundLabel} · {match.id}{hasOutlaw ? ' · BOUNTY MATCH' : ''}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {hasOutlaw && bountyAlive && outlawTrader && (
            <div className="modal-bounty-banner">
              <span className="skull-big" aria-hidden="true">☠</span>
              <div className="text">
                <strong>{outlawTrader.handle}</strong> is an Outlaw. {hunterTrader ? hunterTrader.handle : 'The winner'} collects an extra <strong>$5,000 bounty</strong> if they take them out.
              </div>
              <div className="amt-big">+$5,000</div>
            </div>
          )}
          {hasOutlaw && bountyCollected && hunterTrader && outlawTrader && (
            <div className="modal-bounty-banner collected">
              <span className="skull-big" aria-hidden="true">✓</span>
              <div className="text">
                Bounty collected. <strong>{hunterTrader.handle}</strong> eliminated outlaw <strong>{outlawTrader.handle}</strong> and pockets <strong>$5,000</strong> on top of the standard prize.
              </div>
              <div className="amt-big">+$5,000</div>
            </div>
          )}
          {hasOutlaw && bountyDormant && outlawTrader && (
            <div className="modal-bounty-banner">
              <span className="skull-big" aria-hidden="true">☠</span>
              <div className="text">
                Outlaw <strong>{outlawTrader.handle}</strong> survived. The $5,000 bounty rides on into the next round.
              </div>
              <div className="amt-big">$5,000</div>
            </div>
          )}
          <div className="matchup">
            <div className={`fighter ${aWin ? 'win' : ''} ${(match.status === 'live' && aLead) ? 'win' : ''} ${aOutlaw ? 'is-outlaw' : ''}`}>
              {aOutlaw && <div className="outlaw-banner"><span aria-hidden="true">☠</span> OUTLAW · $5K BOUNTY</div>}
              {a && <FighterPortrait trader={a} />}
              <div className="fname">{a ? a.handle : 'TBD'}</div>
              <div className="fmeta">SEED #{a ? a.seed : '—'} · {a ? a.country : '—'}</div>
              <div className="fscore">${match.aScore.toLocaleString()}</div>
            </div>
            <div className="versus">VS</div>
            {b ? (
              <div className={`fighter ${bWin ? 'win' : ''} ${(match.status === 'live' && !aLead) ? 'win' : ''} ${bOutlaw ? 'is-outlaw' : ''}`}>
                {bOutlaw && <div className="outlaw-banner"><span aria-hidden="true">☠</span> OUTLAW · $5K BOUNTY</div>}
                <FighterPortrait trader={b} />
                <div className="fname">{b.handle}</div>
                <div className="fmeta">SEED #{b.seed} · {b.country}</div>
                <div className="fscore">${match.bScore.toLocaleString()}</div>
              </div>
            ) : (
              <div className="fighter"><div className="fmeta">TBD</div></div>
            )}
          </div>
          <div className="match-meta-grid">
            <div className="meta-cell">
              <div className="ml">Window</div>
              <div className="mv">{matchWindow(match.round)}</div>
            </div>
            <div className="meta-cell">
              <div className="ml">Margin</div>
              <div className="mv">${Math.abs(match.aScore - (match.bScore || 0)).toLocaleString()}</div>
            </div>
            {hasOutlaw ? (
              <div className="meta-cell bounty-cell">
                <div className="ml">Prize at stake</div>
                <div className="mv">
                  <span>{standardPrize}</span>
                  <span className="amt">+ <span className="skull" aria-hidden="true">☠</span> $5K</span>
                </div>
              </div>
            ) : (
              <div className="meta-cell">
                <div className="ml">Prize at stake</div>
                <div className="mv">{standardPrize}</div>
              </div>
            )}
          </div>
          {b && match.aScore != null && match.bScore != null && (
            <React.Fragment>
              <BalanceChart match={match} traderA={a} traderB={b} activePool={activePool} />
              <TradesTable match={match} traderA={a} traderB={b} activePool={activePool} />
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

function Bracket({ viewState, matches, matchById, onOpenMatch, viewport, setViewport, selectedTraderId, outlawFilterIds, onMatchCount, highlightRound, activePool }) {
  const layout = useLayout();
  const viewRef = useRef(null);
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimer = useRef(null);
  const lastFocusKey = useRef('');

  useEffect(() => {
    if (!viewRef.current) return;
    const vw = viewRef.current.clientWidth;
    const vh = viewRef.current.clientHeight;
    const initialZ = 0.5;
    setViewport(v => ({
      ...v,
      zoom: initialZ,
      x: (vw - layout.totalW * initialZ) / 2,
      y: (vh - layout.totalH * initialZ) / 2,
    }));
  }, [layout.totalW, layout.totalH, setViewport]);

  const onMouseDown = (e) => {
    if (e.target.closest('.match') || e.target.closest('button')) return;
    dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY, ox: viewport.x, oy: viewport.y };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      setViewport(v => ({ ...v, x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [setViewport]);

  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const d = -e.deltaY * 0.002;
      setViewport(v => {
        const nz = Math.max(0.06, Math.min(1.6, v.zoom * (1 + d)));
        const rect = viewRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const k = nz / v.zoom;
        return { zoom: nz, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
      });
    } else {
      setViewport(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  const filtersActive = !!selectedTraderId || (outlawFilterIds && outlawFilterIds.size > 0);
  const hits = useMemo(() => {
    const map = {};
    matches.forEach(m => {
      const ids = [m.aId, m.bId].filter(Boolean);
      let hit = false;
      let hitTrader = null;
      if (selectedTraderId && ids.includes(selectedTraderId)) {
        hit = true;
        hitTrader = selectedTraderId;
      }
      if (outlawFilterIds && outlawFilterIds.size > 0) {
        for (const id of ids) {
          if (outlawFilterIds.has(id)) { hit = true; hitTrader = hitTrader || id; break; }
        }
      }
      map[m.id] = { hit, hitTrader };
    });
    return map;
  }, [matches, selectedTraderId, outlawFilterIds]);

  useEffect(() => {
    if (!onMatchCount) return;
    const total = matches.length;
    const visible = filtersActive ? matches.filter(m => hits[m.id]?.hit).length : total;
    onMatchCount(total, visible);
  }, [matches, hits, filtersActive, onMatchCount]);

  const focusKey = useMemo(() => {
    const out = Array.from(outlawFilterIds || []).sort().join(',');
    return (selectedTraderId || '') + '|' + out + '|' + activePool;
  }, [selectedTraderId, outlawFilterIds, activePool]);

  const [focusTargetId, setFocusTargetId] = useState(null);
  const animFrame = useRef(null);

  useEffect(() => {
    if (focusKey === lastFocusKey.current) return;
    lastFocusKey.current = focusKey;
    if (!filtersActive) { setFocusTargetId(null); return; }
    if (!viewRef.current) return;

    const hitMatches = matches.filter(m => hits[m.id] && hits[m.id].hit);
    if (hitMatches.length === 0) { setFocusTargetId(null); return; }
    
    const ROUND_ORDER = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 };
    hitMatches.sort((a, b) => {
      const ra = ROUND_ORDER[a.round] ?? 99;
      const rb = ROUND_ORDER[b.round] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.index - b.index;
    });

    const target = hitMatches[0];
    const pos = layout.positions[target.id];
    if (!pos) return;

    const vw = viewRef.current.clientWidth;
    const vh = viewRef.current.clientHeight;
    const targetZoom = 1.0;
    const cx = pos.x + pos.w / 2;
    const cy = pos.y + pos.h / 2;
    const nx = vw / 2 - cx * targetZoom;
    const ny = vh / 2 - cy * targetZoom;

    setFocusTargetId(target.id);
    setIsAnimating(true);

    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (animTimer.current) clearTimeout(animTimer.current);

    let startView = null;
    setViewport(v => { startView = v; return v; });

    Promise.resolve().then(() => {
      const start = startView || { zoom: 0.5, x: 0, y: 0 };
      const end = { zoom: targetZoom, x: nx, y: ny };
      const duration = 900;
      const t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 5);

      const step = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const k = ease(t);
        setViewport({
          zoom: start.zoom + (end.zoom - start.zoom) * k,
          x:    start.x    + (end.x    - start.x)    * k,
          y:    start.y    + (end.y    - start.y)    * k,
        });
        if (t < 1) {
          animFrame.current = requestAnimationFrame(step);
        } else {
          setIsAnimating(false);
        }
      };
      animFrame.current = requestAnimationFrame(step);
    });
  }, [focusKey, filtersActive, matches, hits, layout.positions, setViewport]);

  useEffect(() => () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (animTimer.current) clearTimeout(animTimer.current);
  }, []);

  return (
    <div
      className="bracket-viewport"
      ref={viewRef}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      style={{ cursor: dragRef.current.dragging ? 'grabbing' : 'grab' }}
    >
      <div
        className={'bracket-scene' + (isAnimating ? ' is-animating' : '')}
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          width: layout.totalW,
          height: layout.totalH,
        }}
      >
        <RoundHeaders layout={layout} activePool={activePool} />
        <Connectors layout={layout} matchById={matchById} activePool={activePool} />
        {matches.map((m) => {
          const pos = layout.positions[m.id];
          if (!pos) return null;
          
          // Championship has only SF and F
          if (activePool === 'Championship' && !['SF', 'F'].includes(m.round)) {
            return null;
          }

          const highlighted = highlightRound === 'all' ? false : highlightRound === m.round;
          const isChampion = viewState === 'champion' && m.id === 'F-1' && m.winnerId;
          const h = hits[m.id] || {};
          return (
            <Match
              key={m.id}
              match={m}
              position={pos}
              sizeClass={m.round === 'F' ? 'size-xl' : (m.round === 'QF' || m.round === 'SF' ? 'size-lg' : '')}
              onOpen={onOpenMatch}
              highlighted={highlighted}
              isChampionMatch={isChampion}
              isHit={filtersActive && h.hit}
              isDim={filtersActive && !h.hit}
              hitTraderId={filtersActive ? h.hitTrader : null}
              isFocusTarget={focusTargetId === m.id}
            />
          );
        })}
        <ChampionBanner match={viewState === 'champion' ? matchById['F-1'] : null} layout={layout} />
      </div>
    </div>
  );
}

function ZoomControls({ viewport, setViewport }) {
  const layout = useLayout();

  const zoomBy = (f) => setViewport(v => {
    const nz = Math.max(0.06, Math.min(1.6, v.zoom * f));
    return { ...v, zoom: nz };
  });

  const fitToScreen = () => {
    const el = document.querySelector('.bracket-viewport');
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const z = Math.min((vw - 80) / layout.totalW, (vh - 40) / (layout.totalH + 80), 1);
    const fitZ = Math.max(0.06, z);
    setViewport({
      zoom: fitZ,
      x: (vw - layout.totalW * fitZ) / 2,
      y: (vh - layout.totalH * fitZ) / 2
    });
  };

  const resetToDefault = () => {
    const el = document.querySelector('.bracket-viewport');
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const defaultZ = 0.5;
    setViewport({
      zoom: defaultZ,
      x: (vw - layout.totalW * defaultZ) / 2,
      y: (vh - layout.totalH * defaultZ) / 2
    });
  };

  return (
    <div className="zoom">
      <button className="zoom-square-btn" onClick={() => zoomBy(0.83)} title="Zoom out">−</button>
      <div className="zval">{Math.round(viewport.zoom * 100)}%</div>
      <button className="zoom-square-btn" onClick={() => zoomBy(1.2)} title="Zoom in">+</button>
      <div className="zoom-divider" />
      <button onClick={resetToDefault} title="Default Zoom (50%)" style={{ fontSize: 11 }}>50%</button>
      <button onClick={fitToScreen} title="Fit to Screen" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: -1 }}>
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        <span>Fit</span>
      </button>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <div className="legend-item"><div className="legend-swatch winner" /> Advanced</div>
      <div className="legend-item"><div className="legend-swatch live" /> Live</div>
      <div className="legend-item"><div className="legend-swatch pending" /> Pending</div>
      <div className="legend-item" style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Ctrl + scroll to zoom · drag to pan</div>
    </div>
  );
}

function TopChrome() {
  return (
    <React.Fragment>
      <div className="ticker">
        <span className="num">43,230</span>
        <span>traders qualifying today</span>
        <span className="sep" />
        <span>Season 2</span>
        <span className="sep" />
        <span className="num">12d 4h</span>
        <span>until Finals</span>
      </div>
      <div className="nav">
        <div className="nav-left">
          <div className="brand">
            <span className="avatar mono-avatar outlaw" style={{ '--mono-a': '#d5a132', '--mono-b': '#111', width: 22, height: 22, fontSize: 10 }}>GC</span>
            <span className="brand-mark" style={{ marginLeft: 6 }}>Grand Cup</span>
          </div>
          <div className="nav-links">
            <span className="nav-link">Leaderboard</span>
            <span className="nav-link active">Bracket</span>
            <span className="nav-link">Payouts</span>
            <span className="nav-link">Schedule</span>
            <span className="nav-link">Rewards</span>
            <span className="nav-link">FAQs</span>
          </div>
        </div>
        <div className="nav-right">
          <button className="btn">Log in</button>
          <button className="btn primary">Join the Cup</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function outlawsAlive(matches) {
  const eliminated = new Set();
  matches.forEach(m => {
    if (m.status !== 'done' || !m.winnerId) return;
    if (m.aId && m.aId !== m.winnerId && TRADERS_BY_ID[m.aId]?.isOutlaw) eliminated.add(m.aId);
    if (m.bId && m.bId !== m.winnerId && TRADERS_BY_ID[m.bId]?.isOutlaw) eliminated.add(m.bId);
  });
  const total = TRADERS.filter(t => t.isOutlaw).length;
  return { alive: total - eliminated.size, total, eliminated: eliminated.size };
}

function Header({ viewState, matches, activePool }) {
  const outlaws = outlawsAlive(matches);
  const liveLabel = viewState === 'r32_live'
    ? 'R32 · 16'
    : viewState === 'current'
    ? 'Finals · 1'
    : '—';
  
  const poolLabel = {
    A: 'Pool Alpha (Seeds #1 - #256)',
    B: 'Pool Beta (Seeds #257 - #512)',
    C: 'Pool Gamma (Seeds #513 - #768)',
    D: 'Pool Delta (Seeds #769 - #1024)',
    Championship: 'Final Four Championship'
  }[activePool] || activePool;

  return (
    <div className="header" style={{ paddingBottom: 10 }}>
      <div className="header-glow" />
      <div className="header-inner">
        <div className="eyebrow">
          <span className="dot" />
          The Duels · {poolLabel}
          <span className="sep" />
          <span className="when">11 — 12 June</span>
        </div>
        <h1 className="title">Grand Cup 2 — Outlaws Bracket</h1>
        <p className="subtitle">
          1,024 qualifiers fight through regional brackets on the futures market. Eliminate an <span className="spark" style={{color:'var(--outlaw-hi)'}}>Outlaw</span> for a +$5K bounty. <span className="spark">Winner takes $240,000.</span>
        </p>
        <div className="summary">
          <div className="summary-cell">
            <div className="summary-label">Total Traders</div>
            <div className="summary-value">1,024</div>
          </div>
          <div className="summary-cell">
            <div className="summary-label">Pools</div>
            <div className="summary-value">4 Pools</div>
          </div>
          <div className="summary-cell">
            <div className="summary-label">Live now</div>
            <div className="summary-value green">{liveLabel}</div>
          </div>
          <div className="summary-cell">
            <div className="summary-label">Outlaws left</div>
            <div className="summary-value outlaw-val">
              <span className="skull" aria-hidden="true">☠</span>
              {outlaws.alive} <span style={{color:'var(--ink-3)', fontSize:11, marginLeft:2}}>/ {outlaws.total}</span>
            </div>
          </div>
          <div className="summary-cell">
            <div className="summary-label">Prize pool</div>
            <div className="summary-value gold">$1,000,000</div>
          </div>
          <div className="summary-cell">
            <div className="summary-label">Ends</div>
            <div className="summary-value">12 Jun · 17:00 ET</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalTweaksUI({ tweaks, setTweak }) {
  const [panelOpen, setPanelOpen] = useState(true);

  if (!panelOpen) {
    return (
      <button 
        onClick={() => setPanelOpen(true)}
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 10000,
          background: 'rgba(250, 249, 247, 0.95)', color: '#111',
          border: '1px solid #ddd', borderRadius: '50%', width: 36, height: 36,
          cursor: 'pointer', fontSize: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        title="Open Tweaks panel"
      >
        ⚙
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 10000,
        width: 260, background: 'rgba(24, 23, 20, 0.98)', color: '#eee',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        padding: 14, fontFamily: 'var(--font-mono), monospace', fontSize: 11,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
        <b style={{ letterSpacing: '0.05em', color: 'var(--gold)' }}>SCENARIO TWEAKS</b>
        <button 
          onClick={() => setPanelOpen(false)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12 }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#aaa', marginBottom: 6, fontWeight: 'bold' }}>BRACKET SCENARIO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { value: 'r32_live', label: 'Round of 32 Live' },
            { value: 'current', label: 'Finals Live' },
            { value: 'champion', label: 'Champion Declared' }
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
              <input 
                type="radio" 
                name="view_state" 
                checked={tweaks.view_state === opt.value}
                onChange={() => setTweak('view_state', opt.value)}
                style={{ cursor: 'pointer', accentColor: 'var(--gold)' }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div style={{ color: '#aaa', marginBottom: 6, fontWeight: 'bold' }}>HIGHLIGHT ROUND</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'R32', label: 'R32' },
            { value: 'R16', label: 'R16' },
            { value: 'QF', label: 'QF' },
            { value: 'SF', label: 'SF' },
            { value: 'F', label: 'Final' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTweak('highlight_round', opt.value)}
              style={{
                background: tweaks.highlight_round === opt.value ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                color: tweaks.highlight_round === opt.value ? '#111' : '#ccc',
                border: 'none', borderRadius: 4, padding: '4px 0',
                cursor: 'pointer', fontSize: 9, fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PoolsTabBar({ activePool, setActivePool }) {
  const pools = [
    { key: 'A', label: 'Alpha Pool', desc: 'Seeds #1 - #256' },
    { key: 'B', label: 'Beta Pool', desc: 'Seeds #257 - #512' },
    { key: 'C', label: 'Gamma Pool', desc: 'Seeds #513 - #768' },
    { key: 'D', label: 'Delta Pool', desc: 'Seeds #769 - #1024' },
    { key: 'Championship', label: 'Championship', desc: 'Final Four' }
  ];

  return (
    <div className="pools-tab-bar" style={{ display: 'flex', justifyContent: 'center', background: '#080c10', borderBottom: '1px solid var(--line-hair)', padding: '10px 0', gap: 8, zIndex: 15, position: 'relative' }}>
      {pools.map(p => (
        <button
          key={p.key}
          onClick={() => setActivePool(p.key)}
          style={{
            background: activePool === p.key ? 'linear-gradient(180deg, #ffd57d 0%, #d5a132 100%)' : 'rgba(12, 16, 20, 0.75)',
            color: activePool === p.key ? '#1a1000' : 'var(--ink-3)',
            border: activePool === p.key ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--line-hair)',
            borderRadius: 8,
            padding: '6px 16px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontWeight: activePool === p.key ? 'bold' : '500',
            fontSize: 12,
            transition: 'all 0.15s ease',
            boxShadow: activePool === p.key ? '0 0 12px rgba(213, 161, 50, 0.25)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 120
          }}
        >
          <span>{p.label}</span>
          <span style={{ fontSize: 8, opacity: 0.7, marginTop: 1, fontWeight: 'normal' }}>{p.desc}</span>
        </button>
      ))}
    </div>
  );
}

export default function BracketPage() {
  const [tweaks, setTweaks] = useState({
    view_state: 'current',
    highlight_round: 'all'
  });
  
  const setTweak = useCallback((key, value) => {
    setTweaks(prev => ({ ...prev, [key]: value }));
  }, []);

  const [openMatch, setOpenMatch] = useState(null);
  const [viewport, setViewport] = useState({ zoom: 0.8, x: 80, y: 120 });
  const [search, setSearch] = useState('');
  const [selectedTraderId, setSelectedTraderId] = useState(null);
  const [outlawFilterIds, setOutlawFilterIds] = useState(() => new Set());
  const [counts, setCounts] = useState({ total: 0, visible: 0 });
  const [isEmbed, setIsEmbed] = useState(false);
  
  // Set up selected bracket pool state
  const [activePool, setActivePool] = useState('A');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('embed') === 'true') {
        setIsEmbed(true);
      }
    }
  }, []);

  const onMatchCount = useCallback((total, visible) => {
    setCounts(prev => (prev.total === total && prev.visible === visible) ? prev : { total, visible });
  }, []);

  const viewState = tweaks.view_state || 'current';
  
  // Deterministic dataset changes on activePool tab changes
  const matches = useMemo(() => buildMatches(viewState, activePool), [viewState, activePool]);
  const matchById = useMemo(() => {
    const by = {};
    matches.forEach(m => { by[m.id] = m; });
    return by;
  }, [matches]);

  return (
    <div className={`page ${isEmbed ? 'is-embed' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isEmbed && <TopChrome />}
      {!isEmbed && <Header viewState={viewState} matches={matches} activePool={activePool} />}
      
      {/* 4 Pools & Championship Navigation selector */}
      <PoolsTabBar activePool={activePool} setActivePool={setActivePool} />

      <div className="canvas-wrap" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <BracketToolbar
          search={search}
          setSearch={setSearch}
          selectedTraderId={selectedTraderId}
          setSelectedTraderId={setSelectedTraderId}
          outlawFilterIds={outlawFilterIds}
          setOutlawFilterIds={setOutlawFilterIds}
          totalMatches={counts.total}
          visibleMatches={counts.visible}
          activePool={activePool}
          setActivePool={setActivePool}
        />
        
        <Bracket
          viewState={viewState}
          matches={matches}
          matchById={matchById}
          onOpenMatch={setOpenMatch}
          viewport={viewport}
          setViewport={setViewport}
          selectedTraderId={selectedTraderId}
          outlawFilterIds={outlawFilterIds}
          onMatchCount={onMatchCount}
          highlightRound={tweaks.highlight_round}
          activePool={activePool}
        />
        
        <ZoomControls viewport={viewport} setViewport={setViewport} />
        <Legend />
      </div>

      {openMatch && (
        <MatchModal 
          match={matchById[openMatch.id] || openMatch} 
          onClose={() => setOpenMatch(null)}
          activePool={activePool}
        />
      )}
      
      <LocalTweaksUI tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}
