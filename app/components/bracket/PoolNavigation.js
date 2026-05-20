import React, { useState } from 'react';
import { TRADERS, TRADERS_BY_ID } from '../../api/data-engine';

export function TopChrome() {
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

export function Header({ viewState, matches, activePool }) {
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

export function LocalTweaksUI({ tweaks, setTweak }) {
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

export function PoolsTabBar({ activePool, setActivePool }) {
  const pools = [
    { key: 'A', label: 'Alpha Pool', desc: 'Seeds #1 - #256' },
    { key: 'B', label: 'Beta Pool', desc: 'Seeds #257 - #512' },
    { key: 'C', label: 'Gamma Pool', desc: 'Seeds #513 - #768' },
    { key: 'D', label: 'Delta Pool', desc: 'Seeds #769 - #1024' },
    { key: 'Championship', label: 'Championship', desc: 'Final Four' }
  ];

  return (
    <div className="pools-tab-bar">
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
