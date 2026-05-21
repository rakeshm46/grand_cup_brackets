import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { getBalanceSeries, getMatchTrades } from '../../api/data-engine';
import { useLayout } from '../../lib/bracketUtils';
import { BracketContext } from './BracketContext';

function fmtMoney(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(n)).toLocaleString();
}
function fmtSigned(n) {
  return (n > 0 ? '+' : n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
}
function fmtHM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
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

const COLOR_A = '#E8C36B';
const COLOR_B = '#C84F46';
const COLOR_BASE = 'rgba(255,255,255,0.18)';

export function FighterPortrait({ trader }) {
  if (!trader) return null;
  const initials = (trader.handle.match(/[A-Z0-9]/g) || trader.handle.slice(0, 2).toUpperCase().split('')).slice(0, 2).join('');
  const palette = trader.avatarPalette || ['#1e445c', '#050607'];
  return (
    <div
      className={`big-avatar mono-big ${trader.avatarImage ? 'has-image' : ''}`}
      style={{ '--mono-a': palette[0], '--mono-b': palette[1] }}
      aria-label={trader.handle}
    >
      {trader.avatarImage ? (
        <img src={trader.avatarImage} alt={trader.handle} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        initials
      )}
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

export function BalanceChart({ match, traderA, traderB, activePool }) {
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

export function TradesTable({ match, traderA, traderB, activePool }) {
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

export function MatchModal({ match, onClose, activePool }) {
  const { tradersById } = useContext(BracketContext);
  if (!match) return null;
  const a = tradersById[match.aId];
  const b = match.bId ? tradersById[match.bId] : null;
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
              <div className="fscore">{match.aScore != null ? `$${match.aScore.toLocaleString()}` : '—'}</div>
            </div>
            <div className="versus">VS</div>
            {b ? (
              <div className={`fighter ${bWin ? 'win' : ''} ${(match.status === 'live' && !aLead) ? 'win' : ''} ${bOutlaw ? 'is-outlaw' : ''}`}>
                {bOutlaw && <div className="outlaw-banner"><span aria-hidden="true">☠</span> OUTLAW · $5K BOUNTY</div>}
                <FighterPortrait trader={b} />
                <div className="fname">{b.handle}</div>
                <div className="fmeta">SEED #{b.seed} · {b.country}</div>
                <div className="fscore">{match.bScore != null ? `$${match.bScore.toLocaleString()}` : '—'}</div>
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
              <div className="mv">${Math.abs((match.aScore || 0) - (match.bScore || 0)).toLocaleString()}</div>
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

export function ZoomControls({ viewport, setViewport }) {
  const layout = useLayout();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

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
      <button onClick={toggleFullscreen} title="Toggle Fullscreen" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: -1 }}>
          {isFullscreen ? (
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
          ) : (
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          )}
        </svg>
        <span>{isFullscreen ? 'Exit' : 'Full'}</span>
      </button>
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-item"><div className="legend-swatch winner" /> Advanced</div>
      <div className="legend-item"><div className="legend-swatch live" /> Live</div>
      <div className="legend-item"><div className="legend-swatch pending" /> Pending</div>
      <div className="legend-item" style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Ctrl + scroll to zoom · drag to pan</div>
    </div>
  );
}
