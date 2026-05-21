import React, { useContext } from 'react';
import { BracketContext } from './BracketContext';
import { SIDE_ROUNDS } from '../../lib/bracketUtils';

function fmtSigned(n) {
  return (n > 0 ? '+' : n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
}

export function TraderCell({ traderId, score, isWinner, isLoser, isLive, isLeader, isTrailer, isChampion, cornerClass = '', isOutlawElim = false, wasOutlawEliminated = false }) {
  const { tradersById } = useContext(BracketContext);
  
  if (!traderId) {
    return (
      <div className={`cell pending ${cornerClass}`}>
        <span className="avatar pending-avatar">·</span>
        <span className="name">Awaiting winner</span>
        <span className="score">—</span>
      </div>
    );
  }
  
  const t = tradersById[traderId];
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
  
  // Use the API-provided palette fallback if we don't have an image
  const initials = (t.handle.match(/[A-Z0-9]/g) || t.handle.slice(0, 2).toUpperCase().split('')).slice(0, 2).join('');
  const avatarStyle = t.avatarPalette ? { '--mono-a': t.avatarPalette[0], '--mono-b': t.avatarPalette[1] } : {};

  return (
    <div className={`cell ${cls} ${cornerClass} ${t.isOutlaw ? 'is-outlaw' : ''}`}>
      {wasOutlawEliminated && <div className="outlaw-stamp">CAPTURED</div>}
      {isChampion && <span className="crown" aria-hidden="true">👑</span>}
      <span
        className={`avatar mono-avatar ${t.isOutlaw ? 'outlaw' : ''} ${t.avatarImage ? 'has-image' : ''}`}
        aria-label={t.handle}
        style={avatarStyle}
      >
        {t.avatarImage ? (
          <img src={t.avatarImage} alt={t.handle} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          initials
        )}
        <span className="mono-flag" aria-hidden="true">{t.flag}</span>
      </span>
      <span className="name">
        <span className="player-name-text">{t.handle}</span>
        {t.isOutlaw && !wasOutlawEliminated && (
          <span className="outlaw-mark" title="$5,000 bounty on this trader">
            <span className="skull" aria-hidden="true">☠</span>
            <span>OUTLAW</span>
          </span>
        )}
        {t.isOutlaw && wasOutlawEliminated && (
          <span className="outlaw-mark eliminated" title="Outlaw was eliminated">
            <span className="skull" aria-hidden="true">☠</span>
            <span style={{ textDecoration: 'line-through' }}>OUTLAW</span>
          </span>
        )}
        {isOutlawElim && (
          <span className="bounty-tag collected" title="Bounty Hunter: Took down an Outlaw!">
            <span className="star" aria-hidden="true" style={{ fontSize: 10, marginRight: 2 }}>⭐</span>+$5K
          </span>
        )}
      </span>
      <span className={`score ${scoreCls}`}>{scoreStr}</span>
    </div>
  );
}

export function Match({ match, position, sizeClass, onOpen, highlighted, isChampionMatch, isHit, isDim, hitTraderId, isFocusTarget }) {
  const { tradersById } = useContext(BracketContext);

  const isLive = match.status === 'live';
  const aWin = match.winnerId && match.winnerId === match.aId;
  const bWin = match.winnerId && match.winnerId === match.bId;
  const isPending = match.status === 'pending' && !match.aId && !match.bId;

  const aLeads = isLive && match.aScore > match.bScore;
  const bLeads = isLive && match.bScore > match.aScore;

  const tA = match.aId ? tradersById[match.aId] : null;
  const tB = match.bId ? tradersById[match.bId] : null;
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
        wasOutlawEliminated={aIsOutlaw && bWin}
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
        wasOutlawEliminated={bIsOutlaw && aWin}
      />
    </div>
  );
}

export function Connectors({ layout, matchById, activePool }) {
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
    for (let rIdx = 0; rIdx < SIDE_ROUNDS.length - 1; rIdx++) {
      const spec = SIDE_ROUNDS[rIdx];
      const nextSpec = SIDE_ROUNDS[rIdx + 1];
      const hc = spec.halfCount;
      const nextHc = nextSpec.halfCount;

      for (let i = 0; i < hc; i += 2) {
        const child1 = `${spec.round}-${i + 1}`;
        const child2 = `${spec.round}-${i + 2}`;
        const parent = `${nextSpec.round}-${Math.floor(i / 2) + 1}`;
        pushConnector(child1, child2, parent, 'right');
      }

      for (let i = 0; i < hc; i += 2) {
        const child1 = `${spec.round}-${hc + i + 1}`;
        const child2 = `${spec.round}-${hc + i + 2}`;
        const parent = `${nextSpec.round}-${nextHc + Math.floor(i / 2) + 1}`;
        pushConnector(child1, child2, parent, 'left');
      }
    }
  }

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
