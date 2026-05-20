'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  TRADERS,
  TRADERS_BY_ID,
  TRADERS_BY_HANDLE,
  scenarioState
} from '../../api/data-engine';

// -------- Dynamic scenario stats builders --------
function getAdjustedScenario(trader, scenarioId) {
  // Force a mid-pack feel for bubble climbing
  const scenarioTrader = scenarioId === 'qualifying_climbing'
    ? (TRADERS.find(t => t.seed === Math.max(12, trader.seed)) || trader)
    : trader;

  const baseScenario = scenarioState(scenarioTrader, scenarioId, 'current');
  let scenario = baseScenario;

  if (scenarioId === 'duel_advancing') {
    scenario = {
      ...baseScenario,
      path: baseScenario.path.map(p => p.status === 'live' ? { ...p, status: 'done', myWon: p.myScore > p.oppScore } : p),
      status: 'advancing',
      liveMatch: null,
      nextMatch: null,
    };
    scenario.wins = scenario.path.filter(p => p.status === 'done' && p.myWon).length;
    scenario.losses = scenario.path.filter(p => p.status === 'done' && !p.myWon).length;
  } else if (scenarioId === 'duel_eliminated') {
    const path = baseScenario.path.map(p => ({ ...p }));
    if (path.length > 0) {
      const last = path[path.length - 1];
      last.status = 'done';
      last.myWon = false;
      last.myScore = Math.min(last.myScore, last.oppScore - 800);
    }
    scenario = {
      ...baseScenario,
      path,
      status: 'eliminated',
      liveMatch: null,
      nextMatch: null,
    };
    scenario.wins = path.filter(p => p.status === 'done' && p.myWon).length;
    scenario.losses = path.filter(p => p.status === 'done' && !p.myWon).length;
  } else if (scenarioId === 'duel_live_now') {
    const path = baseScenario.path.map(p => ({ ...p }));
    let liveIdx = path.findIndex(p => p.status === 'live');
    if (liveIdx === -1) {
      const lastDoneIdx = [...path].reverse().findIndex(p => p.status === 'done');
      if (lastDoneIdx !== -1) {
        liveIdx = path.length - 1 - lastDoneIdx;
        path[liveIdx] = {
          ...path[liveIdx],
          status: 'live',
          myWon: false,
          myScore: 51640,
          oppScore: 49210,
        };
      }
    }
    const liveMatch = liveIdx >= 0 ? path[liveIdx] : null;
    scenario = {
      ...baseScenario,
      path: liveIdx >= 0 ? path.slice(0, liveIdx + 1) : path,
      status: 'live',
      liveMatch,
      nextMatch: liveMatch,
    };
    scenario.wins = scenario.path.filter(p => p.status === 'done' && p.myWon).length;
    scenario.losses = scenario.path.filter(p => p.status === 'done' && !p.myWon).length;
  }

  return { scenario, scenarioTrader };
}

// -------- Profile components --------
function TraderCardLeaderboard({ trader, stats }) {
  return (
    <div className="tcard">
      <div className="tcard-head">
        <div className="badge">
          <span className="dot" />
          Qualifying · Day 12 of 14
        </div>
        <div className="gc-mark">
          <span className="badge-flag" style={{ fontSize: 10, marginRight: 4 }}>☠</span>
          <span>Grand Cup</span>
          <span className="sep">/</span>
          <span className="season">SEASON 2 · OUTLAWS</span>
        </div>
      </div>

      <div className="tcard-body">
        <div className="tcard-portrait">
          <span className="flag-big" aria-label={trader.country}>{trader.flag}</span>
          <div className="seed-coin">
            <span className="seed-label">Seed</span>
            <span className="seed-num">{trader.seed}</span>
          </div>
        </div>

        <div className="tcard-id">
          <div className="country">{trader.country} · Futures</div>
          <div className="handle">{trader.handle}</div>
          <div className="rank-display">
            <span className="hash">#</span>
            <span className="rank">{stats.rank}</span>
            <span className="of">of</span>
            <span className="total">{stats.total.toLocaleString()}</span>
          </div>
          <div className="tagline" style={{ marginTop: 12 }}>
            12 days into qualifying. Top {Math.round((stats.rank / stats.total) * 100 * 10) / 10}% of all entrants.
            {stats.rank <= 32 ? <strong style={{ color: 'var(--gold)' }}> · In the bracket</strong> : ' · Bubble watch'}
          </div>
        </div>
      </div>

      <div className="tcard-stats">
        <div className="tcard-stat">
          <div className="lbl">Account P&L</div>
          <div className={`val ${stats.pl >= 0 ? 'green' : 'red'}`}>
            {stats.pl >= 0 ? '+' : ''}${Math.abs(stats.pl).toLocaleString()}
          </div>
          <div className={`delta ${stats.dailyDelta >= 0 ? 'up' : 'down'}`}>
            {stats.dailyDelta >= 0 ? '+' : ''}${stats.dailyDelta.toLocaleString()} today
          </div>
        </div>
        <div className="tcard-stat">
          <div className="lbl">Equity</div>
          <div className="val">${stats.equity.toLocaleString()}</div>
          <div className="delta">From $50,000 start</div>
        </div>
        <div className="tcard-stat">
          <div className="lbl">Win rate</div>
          <div className="val gold">{stats.winRate}%</div>
          <div className="delta">{stats.trades} trades</div>
        </div>
        <div className="tcard-stat">
          <div className="lbl">Sharpe</div>
          <div className="val">{stats.sharpe}</div>
          <div className="delta">14-day rolling</div>
        </div>
      </div>

      <div className="tcard-foot">
        <div className="url">
          <span className="scheme">grandcup.co/</span>
          <span className="handle">{trader.handle.toLowerCase()}</span>
          <span className="tail">· refreshed 12s ago</span>
        </div>
      </div>
    </div>
  );
}

function TraderCardDuels({ trader, scenario }) {
  const { wins, losses, status, nextMatch } = scenario;
  const opp = nextMatch ? TRADERS_BY_ID[nextMatch.oppId] : null;

  let statusBadge;
  if (status === 'live') {
    statusBadge = (
      <div className="badge live">
        <span className="dot" />
        Live now · {nextMatch.label}
      </div>
    );
  } else if (status === 'eliminated') {
    statusBadge = (
      <div className="badge eliminated">
        <span className="dot" />
        Eliminated · {scenario.path[scenario.path.length - 1].label}
      </div>
    );
  } else {
    const lastDone = [...scenario.path].reverse().find(p => p.status === 'done');
    statusBadge = (
      <div className="badge">
        <span className="dot" />
        Advancing · Through {lastDone ? lastDone.label : 'Round of 1024'}
      </div>
    );
  }

  return (
    <div className="tcard">
      <div className="tcard-head">
        {statusBadge}
        <div className="gc-mark">
          <span className="badge-flag" style={{ fontSize: 10, marginRight: 4 }}>☠</span>
          <span>Grand Cup</span>
          <span className="sep">/</span>
          <span className="season">SEASON 2 · OUTLAWS · DUELS</span>
        </div>
      </div>

      <div className="tcard-body">
        <div className="tcard-portrait">
          <span className="flag-big" aria-label={trader.country}>{trader.flag}</span>
          <div className="seed-coin">
            <span className="seed-label">Seed</span>
            <span className="seed-num">{trader.seed}</span>
          </div>
        </div>

        <div className="tcard-id">
          <div className="country">{trader.country} · Futures</div>
          <div className="handle">{trader.handle}</div>
          <div className="record-display">
            <span className="wins">{wins}</span>
            <span className="dash">–</span>
            <span className="losses">{losses}</span>
            <span className="label">Record</span>
          </div>
          <div className="tagline" style={{ marginTop: 10 }}>
            {status === 'live' && nextMatch && opp && (
              <>Live duel in progress against <strong style={{ color: '#fff' }}>{opp.handle}</strong>. Watch the books trade.</>
            )}
            {status === 'advancing' && (
              <>Survived {wins} elimination rounds. <strong style={{ color: 'var(--gold)' }}>{32 / Math.pow(2, wins - 5 < 0 ? 0 : Math.min(4, wins - 5))} traders left</strong> in the seeded field.</>
            )}
            {status === 'eliminated' && (
              <>Run ended. Made it through {wins} rounds — top {Math.round((1024 / Math.pow(2, wins)) / 1024 * 100 * 10) / 10}% of the field.</>
            )}
          </div>
        </div>
      </div>

      {status === 'live' && nextMatch && opp && (
        <div className="next-up">
          <div className="label">Live</div>
          <div className="vs">VS</div>
          <div className="opp">
            <span className="flag">{opp.flag}</span>
            <span>{opp.handle}</span>
            <span className="seed-pill">SEED {opp.seed}</span>
          </div>
          <div className="when">${nextMatch.myScore.toLocaleString()} · ${nextMatch.oppScore.toLocaleString()}</div>
          <div className="countdown">
            <span className="live-pulse" />
            {nextMatch.myScore > nextMatch.oppScore ? `+$${(nextMatch.myScore - nextMatch.oppScore).toLocaleString()}` : `−$${(nextMatch.oppScore - nextMatch.myScore).toLocaleString()}`}
          </div>
        </div>
      )}

      <div className="tcard-foot">
        <div className="url">
          <span className="scheme">grandcup.co/</span>
          <span className="handle">{trader.handle.toLowerCase()}</span>
          <span className="tail">· {wins}-{losses} · share with one tap</span>
        </div>
      </div>
    </div>
  );
}

function ShareRail({ trader, scenario, onCopy, copied }) {
  const [backed, setBacked] = useState(false);
  const [backCount, setBackCount] = useState(248 + trader.seed * 9);
  
  const handleBack = () => {
    if (backed) {
      setBacked(false);
      setBackCount(prev => prev - 1);
    } else {
      setBacked(true);
      setBackCount(prev => prev + 1);
    }
  };

  const supporters = [
    { handle: 'k.ren', flag: '🇰🇷' },
    { handle: 'pip.dad', flag: '🇺🇸' },
    { handle: 'noor', flag: '🇦🇪' },
  ];

  return (
    <div className="share-rail">
      <div className="rail-card gold">
        <div className="rail-title">
          <span>Your shareable link</span>
          <span className="num">unique to you</span>
        </div>
        <div className="url-row">
          <div className="url-chip">
            <span className="scheme">grandcup.co/</span>
            <span className="handle">{trader.handle.toLowerCase()}</span>
          </div>
          <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={onCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="share-targets">
          <div className="share-target" onClick={onCopy} style={{ cursor: 'pointer' }}>
            <div className="icon">𝕏</div>
            <div className="label">Post</div>
          </div>
          <div className="share-target" onClick={onCopy} style={{ cursor: 'pointer' }}>
            <div className="icon">d</div>
            <div className="label">Discord</div>
          </div>
          <div className="share-target" onClick={onCopy} style={{ cursor: 'pointer' }}>
            <div className="icon">↗</div>
            <div className="label">Telegram</div>
          </div>
          <div className="share-target" onClick={onCopy} style={{ cursor: 'pointer' }}>
            <div className="icon">in</div>
            <div className="label">LinkedIn</div>
          </div>
          <div className="share-target" onClick={onCopy} style={{ cursor: 'pointer' }}>
            <div className="icon">▶</div>
            <div className="label">Reels</div>
          </div>
          <div className="share-target" onClick={onCopy} style={{ cursor: 'pointer' }}>
            <div className="icon">···</div>
            <div className="label">More</div>
          </div>
        </div>
      </div>

      <div className="rail-card">
        <div className="rail-title">
          <span>Backers</span>
          <span className="num">{backCount} watching</span>
        </div>
        <div className="supporter-row">
          <div className="supporter-stack">
            {supporters.map((s, i) => (
              <div key={i} className="avatar flag" title={s.handle}>{s.flag}</div>
            ))}
            <div className="avatar more">+{(scenario.stage === 'duels' ? 412 : 86) + trader.seed * 7}</div>
          </div>
          <div className="supporter-text">
            <strong>k.ren, pip.dad</strong> and {(scenario.stage === 'duels' ? 412 : 86) + trader.seed * 7} others are following {trader.handle}'s run.
          </div>
        </div>
        <button className={`cheer-btn ${backed ? 'on' : ''}`} onClick={handleBack}>
          <span>{backed ? '♥' : '♡'}</span> {backed ? 'Backed' : `Back ${trader.handle}`}
        </button>
      </div>

      <div className="viral-cta">
        <div className="vc-arrow">↗</div>
        <div className="vc-eyebrow">Think you can do better?</div>
        <div className="vc-title">Enter Grand Cup 3</div>
        <div className="vc-sub">$50,000 entry · $1M prize pool · qualifying opens 18 Jun</div>
      </div>

      <div className="rail-card">
        <div className="rail-title">
          <span>Quick stats</span>
        </div>
        <div className="rail-stats">
          {scenario.stage === 'leaderboard' ? (
            <>
              <div className="rail-stat"><div className="lbl">Rank</div><div className="val gold">#{scenario.stats.rank}</div></div>
              <div className="rail-stat"><div className="lbl">P&L</div><div className="val green">+${scenario.stats.pl.toLocaleString()}</div></div>
              <div className="rail-stat"><div className="lbl">Win rate</div><div className="val">{scenario.stats.winRate}%</div></div>
              <div className="rail-stat"><div className="lbl">Sharpe</div><div className="val">{scenario.stats.sharpe}</div></div>
            </>
          ) : (
            <>
              <div className="rail-stat"><div className="lbl">Record</div><div className="val green">{scenario.wins}–{scenario.losses}</div></div>
              <div className="rail-stat"><div className="lbl">Best margin</div><div className="val gold">+$4,820</div></div>
              <div className="rail-stat"><div className="lbl">Avg edge</div><div className="val">+$1,940</div></div>
              <div className="rail-stat"><div className="lbl">Survival</div><div className="val">Top {Math.round(100 / Math.pow(2, scenario.wins) * 10) / 10}%</div></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KillRow({ entry }) {
  const opp = TRADERS_BY_ID[entry.oppId];
  if (!opp) return null;

  const margin = entry.myScore - entry.oppScore;
  const marginPct = Math.abs(margin) / entry.oppScore * 100;
  const isLive = entry.status === 'live';
  const isPending = entry.status === 'pending';
  const won = entry.status === 'done' && entry.myWon;
  const lost = entry.status === 'done' && !entry.myWon;

  const rowCls = ['kill-row'];
  if (isLive) rowCls.push('live');
  else if (isPending) rowCls.push('upcoming');
  else if (lost) rowCls.push('lost');

  return (
    <div className={rowCls.join(' ')}>
      <div className="kill-round">
        {entry.label.replace('Round of ', 'R')}
        <span className="when">{entry.when}</span>
      </div>

      <div className="kill-opp">
        <div className="flag-disc" style={{ fontSize: 18 }}>{opp.flag}</div>
        <div className="kill-opp-id">
          <div className="name">{opp.handle}</div>
          <div className="meta">
            <span className="seed">SEED #{opp.seed}</span>
            <span>{opp.country}</span>
          </div>
        </div>
      </div>

      <div>
        {won && <div className="kill-result win">✓ Win</div>}
        {lost && <div className="kill-result loss">✗ Loss</div>}
        {isLive && <div className="kill-result live"><span className="pulse" />Live</div>}
        {isPending && <div className="kill-result upcoming">Upcoming</div>}
      </div>

      <div className="kill-cell">
        <div className="lbl">Score · me / opp</div>
        <div className="kill-score">
          <span className={lost ? 'me lost' : 'me'}>${entry.myScore.toLocaleString()}</span>
          <span className="vs">·</span>
          <span className="opp">${entry.oppScore.toLocaleString()}</span>
        </div>
      </div>

      <div className={`kill-margin ${lost ? 'lost' : ''}`}>
        <span className="delta">
          {margin >= 0 ? '+' : '−'}${Math.abs(margin).toLocaleString()}
        </span>
        <span className="pct">{marginPct.toFixed(1)}% edge</span>
      </div>

      <button className="kill-share">↗ Share</button>
    </div>
  );
}

function KillList({ trader, scenario }) {
  const { path } = scenario;
  if (scenario.stage !== 'duels') return null;

  const earlyRounds = path.filter(p => p.isImagined);
  const bracketRounds = path.filter(p => !p.isImagined);

  return (
    <div className="kill-section">
      <div className="kill-head">
        <div>
          <h2 className="kill-title">Kill list <em>{scenario.wins}–{scenario.losses} all-time</em></h2>
          <p className="kill-sub">
            Every duel {trader.handle} has fought, in order. Let the data do the talking.
          </p>
        </div>
        <div className="kill-head-right">
          <span className="pill active">All</span>
          <span className="pill">Wins</span>
          <span className="pill">Bracket</span>
        </div>
      </div>

      <div className="kill-list">
        {earlyRounds.length > 0 && (
          <div className="kill-divider">
            <span className="gold">Stage 2 · Open duels</span>
            <span>1,024 → 32 traders</span>
            <span className="when">17 — 28 May</span>
          </div>
        )}
        {earlyRounds.map(p => <KillRow key={p.id} entry={p} />)}

        {bracketRounds.length > 0 && (
          <div className="kill-divider">
            <span className="gold">Stage 2 · The Bracket</span>
            <span>Top 32 single elimination</span>
            <span className="when">31 May — 12 Jun</span>
          </div>
        )}
        {bracketRounds.map(p => <KillRow key={p.id} entry={p} />)}
      </div>
    </div>
  );
}

function OGImageLeaderboard({ trader, stats }) {
  return (
    <div className="og-frame">
      <div className="og-grid-bg" />
      <div className="og-inner">
        <div className="og-top">
          <div className="og-brand">
            <span className="gc" style={{ color: 'var(--gold)', fontWeight: 'bold' }}>☠ GRAND CUP</span>
            <span className="sep" style={{ margin: '0 8px', opacity: 0.3 }}>/</span>
            <span className="season">S2 · OUTLAWS · QUALIFYING</span>
          </div>
          <div className="og-status">
            <span className="dot" />
            DAY 12 OF 14
          </div>
        </div>

        <div className="og-main">
          <div className="og-portrait">
            <span className="flag" aria-label={trader.country}>{trader.flag}</span>
            <div className="seed-coin">
              <span className="lbl" style={{ fontSize: 9 }}>Seed</span>
              <span className="num" style={{ fontSize: 16 }}>{trader.seed}</span>
            </div>
          </div>

          <div className="og-id">
            <div className="country">{trader.country} · Futures</div>
            <div className="handle">{trader.handle}</div>
            <div className="rank-line">
              <span className="hash">#</span>
              <span className="rank">{stats.rank}</span>
              <span className="of">/ {stats.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="og-stats">
          <div className="og-stat">
            <div className="lbl">P&L</div>
            <div className="val green">+${stats.pl.toLocaleString()}</div>
            <div className={`delta ${stats.dailyDelta >= 0 ? 'up' : 'down'}`}>
              {stats.dailyDelta >= 0 ? '+' : '−'}${Math.abs(stats.dailyDelta).toLocaleString()} today
            </div>
          </div>
          <div className="og-stat">
            <div className="lbl">Win rate</div>
            <div className="val">{stats.winRate}%</div>
            <div className="delta">{stats.trades} trades</div>
          </div>
          <div className="og-stat">
            <div className="lbl">Sharpe</div>
            <div className="val">{stats.sharpe}</div>
            <div className="delta">14-day</div>
          </div>
          <div className="og-stat">
            <div className="lbl">Top</div>
            <div className="val gold">{(stats.rank / stats.total * 100).toFixed(2)}%</div>
            <div className="delta">of 43,230</div>
          </div>
        </div>

        <div className="og-ribbon">
          <span>Watch the run live →</span>
          <span className="url">grandcup.co/{trader.handle.toLowerCase()}</span>
          <span className="prize">$1,000,000 PRIZE POOL</span>
        </div>
      </div>
    </div>
  );
}

function OGImageDuels({ trader, scenario }) {
  const { wins, losses, nextMatch, status } = scenario;
  const opp = nextMatch ? TRADERS_BY_ID[nextMatch.oppId] : null;
  return (
    <div className="og-frame">
      <div className="og-grid-bg" />
      <div className="og-inner">
        <div className="og-top">
          <div className="og-brand">
            <span className="gc" style={{ color: 'var(--gold)', fontWeight: 'bold' }}>☠ GRAND CUP</span>
            <span className="sep" style={{ margin: '0 8px', opacity: 0.3 }}>/</span>
            <span className="season">S2 · OUTLAWS · DUELS</span>
          </div>
          {status === 'live' && (
            <div className="og-status live">
              <span className="dot" />
              LIVE NOW · {nextMatch.label}
            </div>
          )}
          {status === 'advancing' && (
            <div className="og-status">
              <span className="dot" />
              ADVANCING · {wins}-{losses}
            </div>
          )}
          {status === 'eliminated' && (
            <div className="og-status">
              <span className="dot" />
              KNOCKED OUT · TOP 1024
            </div>
          )}
        </div>

        <div className="og-main">
          <div className="og-portrait">
            <span className="flag" aria-label={trader.country}>{trader.flag}</span>
            <div className="seed-coin">
              <span className="lbl" style={{ fontSize: 9 }}>Seed</span>
              <span className="num" style={{ fontSize: 16 }}>{trader.seed}</span>
            </div>
          </div>

          <div className="og-id">
            <div className="country">{trader.country} · Futures</div>
            <div className="handle">{trader.handle}</div>
            <div className="record-line">
              <span className="w">{wins}</span>
              <span className="dash">–</span>
              <span className="l">{losses}</span>
              <span className="lbl">Record</span>
            </div>
          </div>
        </div>

        <div className="og-stats">
          <div className="og-stat">
            <div className="lbl">Survived</div>
            <div className="val gold">{wins} rounds</div>
            <div className="delta">since R1024</div>
          </div>
          <div className="og-stat">
            <div className="lbl">{status === 'live' ? 'Current duel' : 'Next duel'}</div>
            <div className="val">{opp ? opp.handle : 'TBD'}</div>
            <div className="delta">{nextMatch ? `${nextMatch.label} · ${nextMatch.when}` : '—'}</div>
          </div>
          <div className="og-stat">
            <div className="lbl">Best edge</div>
            <div className="val green">+$4,820</div>
            <div className="delta">QF margin</div>
          </div>
          <div className="og-stat">
            <div className="lbl">Top</div>
            <div className="val gold">{(100 / Math.pow(2, wins)).toFixed(2)}%</div>
            <div className="delta">of 1,024</div>
          </div>
        </div>

        <div className="og-ribbon">
          <span>{status === 'live' ? 'Watch the duel →' : 'Back the run →'}</span>
          <span className="url">grandcup.co/{trader.handle.toLowerCase()}</span>
          <span className="prize">$1,000,000 PRIZE POOL</span>
        </div>
      </div>
    </div>
  );
}

function OGSection({ trader, scenario }) {
  const isDuels = scenario.stage === 'duels';
  return (
    <div className="og-section">
      <div className="og-section-head">
        <div>
          <h2>OpenGraph image · 1200 × 630</h2>
          <p>This is what unfurls when {trader.handle} pastes the link in X / Discord / Telegram / iMessage. Built for screenshot-worthiness.</p>
        </div>
      </div>

      <div className="og-grid">
        <div className="og-card">
          <div className="og-card-head">
            <span className="pill">grandcup.co/{trader.handle.toLowerCase()}</span>
            <span>{isDuels ? 'duels-era variant' : 'leaderboard-era variant'}</span>
            <span className="dim-r">og:image · twitter:card=summary_large_image</span>
          </div>
          <div className="og-frame-wrap">
            {isDuels
              ? <OGImageDuels trader={trader} scenario={scenario} />
              : <OGImageLeaderboard trader={trader} stats={scenario.stats} />}
          </div>
        </div>

        <div className="og-notes">
          <div className="tweet-shell">
            <div className="tweet-avatar" style={{ background: 'var(--mono-a, #111)', border: '1px solid #333' }}>
              {trader.handle.slice(0, 2).toUpperCase()}
            </div>
            <div className="tweet-body">
              <div className="tweet-head">
                <span className="name">{trader.handle}</span>
                <span className="handle">@{trader.handle.toLowerCase()}</span>
                <span className="dot">·</span>
                <span className="time">2h</span>
              </div>
              <div className="tweet-text">
                {isDuels && scenario.status === 'live' && `live now in the ${scenario.nextMatch.label}. one trade away from the round of ${Math.pow(2, 5 - scenario.wins) || 16}. come watch.`}
                {isDuels && scenario.status === 'advancing' && `${scenario.wins}-${scenario.losses}. just punched my ticket through to the next round. ${1024 / Math.pow(2, scenario.wins)} traders left.`}
                {isDuels && scenario.status === 'eliminated' && `cup run ended in the ${scenario.path[scenario.path.length - 1].label.toLowerCase()}. top ${(100 / Math.pow(2, scenario.wins)).toFixed(1)}% of 1024. proud of it.`}
                {!isDuels && `currently #${scenario.stats.rank} of 43,230 in grand cup qualifying. ${scenario.stats.rank <= 32 ? 'in the bracket if it ended today.' : 'gunning for the bracket.'}`}
                <br /><span className="tweet-link">grandcup.co/{trader.handle.toLowerCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: 24, color: '#8899a6', fontSize: 13 }}>
                <span>↺ {12 + trader.seed * 3}</span>
                <span>♡ {84 + trader.seed * 11}</span>
                <span>👁 {(2.4 + trader.seed * 0.3).toFixed(1)}k</span>
              </div>
            </div>
          </div>

          <div className="embed-card">
            <div className="embed-img">
              {isDuels
                ? <OGImageDuels trader={trader} scenario={scenario} />
                : <OGImageLeaderboard trader={trader} stats={scenario.stats} />}
            </div>
            <div className="embed-meta">
              <div className="embed-host">grandcup.co</div>
              <div className="embed-title">
                {isDuels
                  ? `${trader.handle} · ${scenario.wins}-${scenario.losses} in Grand Cup 2 Duels`
                  : `${trader.handle} · #${scenario.stats.rank} in Grand Cup 2 Qualifying`}
              </div>
              <div className="embed-desc">
                {isDuels
                  ? `Live trader card. Kill list, next duel, time remaining. $1M prize pool.`
                  : `Live trader card. P&L, sharpe, win rate. ${scenario.stats.rank <= 32 ? 'In the bracket.' : `${Math.abs(32 - scenario.stats.rank)} ranks from the bracket.`} $1M prize pool.`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalShareTweaks({ tweaks, setTweak }) {
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
        title="Open Share Tweaks panel"
      >
        ⚙
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 10000,
        width: 280, background: 'rgba(24, 23, 20, 0.98)', color: '#eee',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        padding: 14, fontFamily: 'var(--font-mono), monospace', fontSize: 11,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
        <b style={{ letterSpacing: '0.05em', color: 'var(--gold)' }}>SHARE MOMENTS TWEAKS</b>
        <button 
          onClick={() => setPanelOpen(false)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12 }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#aaa', marginBottom: 6, fontWeight: 'bold' }}>SHARE SCENARIO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { value: 'qualifying_top', label: 'Qualifying · Top 32' },
            { value: 'qualifying_climbing', label: 'Qualifying · climbing' },
            { value: 'duel_advancing', label: 'Duels · advancing' },
            { value: 'duel_live_now', label: 'Duels · live now' },
            { value: 'duel_eliminated', label: 'Duels · knocked out' }
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
              <input 
                type="radio" 
                name="scenario" 
                checked={tweaks.scenario === opt.value}
                onChange={() => setTweak('scenario', opt.value)}
                style={{ cursor: 'pointer', accentColor: 'var(--gold)' }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div style={{ color: '#aaa', marginBottom: 6, fontWeight: 'bold' }}>SELECT ACTIVE TRADER</div>
        <select 
          value={String(tweaks.trader_seed)}
          onChange={(e) => setTweak('trader_seed', parseInt(e.target.value, 10))}
          style={{
            width: '100%', padding: '6px 8px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)', color: '#eee',
            border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
            fontSize: 10
          }}
        >
          {TRADERS.map(t => (
            <option key={t.id} value={String(t.seed)} style={{ background: '#222', color: '#eee' }}>
              #{t.seed} {t.handle} {t.flag}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function TraderPage() {
  const params = useParams();
  const handleLower = (params.handle || '').toLowerCase();
  
  // Resolve base trader based on route handle query parameters
  const initialTrader = useMemo(() => {
    return TRADERS.find(t => t.handle.toLowerCase() === handleLower) || TRADERS[0];
  }, [handleLower]);

  const [tweaks, setTweaks] = useState({
    scenario: 'duel_live_now',
    trader_seed: initialTrader.seed
  });

  const setTweak = useCallback((key, value) => {
    setTweaks(prev => ({ ...prev, [key]: value }));
  }, []);

  const [copied, setCopied] = useState(false);

  // Sync route trader with tweak trader
  const trader = TRADERS.find(t => t.seed === tweaks.trader_seed) || initialTrader;

  const { scenario, scenarioTrader } = useMemo(() => {
    return getAdjustedScenario(trader, tweaks.scenario);
  }, [trader, tweaks.scenario]);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/trader/${trader.handle.toLowerCase()}`;
      // Robust copy mechanism with text-area fallback if navigator is sandboxed
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => {
            fallbackCopy(shareUrl);
          });
      } else {
        fallbackCopy(shareUrl);
      }
    }
  };

  const fallbackCopy = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const isDuels = scenario.stage === 'duels';

  return (
    <div className="page share-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
            <span className="nav-link">Bracket</span>
            <span className="nav-link active">Traders</span>
            <span className="nav-link">Payouts</span>
            <span className="nav-link">Schedule</span>
          </div>
        </div>
        <div className="nav-right">
          <button className="btn">Log in</button>
          <button className="btn primary">Join the Cup</button>
        </div>
      </div>

      <div className="share-shell" style={{ flex: 1 }}>
        <div className="share-eyebrow">
          <span className="crumb">Traders</span>
          <span className="arrow">→</span>
          <span className="you">{trader.handle}</span>
          <span className="arrow">·</span>
          <span>shareable profile</span>
        </div>

        <h1 className="share-h1">
          {isDuels && scenario.status === 'live' && <>{trader.handle} is <em>fighting live</em> right now.</>}
          {isDuels && scenario.status === 'advancing' && <>{trader.handle} just <em>survived</em> another round.</>}
          {isDuels && scenario.status === 'eliminated' && <>{trader.handle}'s <em>final stand</em>.</>}
          {!isDuels && scenario.stats.rank <= 32 && <>{trader.handle} is <em>in the bracket</em>.</>}
          {!isDuels && scenario.stats.rank > 32 && <>{trader.handle} is <em>climbing</em> the leaderboard.</>}
        </h1>
        <p className="share-sub">
          A unique link, an unfurlable card, and a kill list. Pin it in your bio. The data is the brag — every refresh updates it live.
        </p>

        <div className="jtbd-strip">
          <div className="jtbd-card">
            <div className="who">For {trader.handle} — the sharer</div>
            <div className="what">"Help me show I'm legit, without sounding like I'm bragging."</div>
            <div className="why">The link launders the brag — the rank/record speaks. Sharing builds an audience that *witnesses* the run, which raises the stakes and the dopamine on the next round.</div>
          </div>
          <div className="jtbd-card">
            <div className="who">For someone who clicks the link</div>
            <div className="what">{isDuels ? '"Is this person actually good? When\'s the next duel? Can I watch?"' : '"Is this person actually good — and could I do this?"'}</div>
            <div className="why">First three seconds: handle + headline number + prize pool. Then the kill list — receipts. Then the next-duel countdown — appointment viewing.</div>
          </div>
        </div>

        <div className="share-hero">
          {isDuels
            ? <TraderCardDuels trader={scenarioTrader} scenario={scenario} />
            : <TraderCardLeaderboard trader={scenarioTrader} stats={scenario.stats} />}
          <ShareRail trader={scenarioTrader} scenario={scenario} onCopy={handleCopy} copied={copied} />
        </div>

        {isDuels && <KillList trader={scenarioTrader} scenario={scenario} />}

        <OGSection trader={scenarioTrader} scenario={scenario} />
      </div>

      <LocalShareTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}
