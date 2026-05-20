'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import '../globals.css';
import { buildMatches } from '../api/data-engine';
import { BracketToolbar } from '../components/bracket/BracketToolbar';
import { Bracket } from '../components/bracket/BracketCanvas';
import { MatchModal, ZoomControls, Legend } from '../components/bracket/FloatingPanels';
import { PoolsTabBar, LocalTweaksUI, TopChrome, Header } from '../components/bracket/PoolNavigation';

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
  const [selectedRoundId, setSelectedRoundId] = useState(null);
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
    <div className={`page ${isEmbed ? 'is-embed' : ''}`} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* {!isEmbed && <TopChrome />} */}
      {/* {!isEmbed && <Header viewState={viewState} matches={matches} activePool={activePool} />} */}
      
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
          selectedRoundId={selectedRoundId}
          setSelectedRoundId={setSelectedRoundId}
        />
        
        <Bracket
          viewState={viewState}
          matches={matches}
          matchById={matchById}
          onOpenMatch={setOpenMatch}
          viewport={viewport}
          setViewport={setViewport}
          selectedTraderId={selectedTraderId}
          selectedRoundId={selectedRoundId}
          setSelectedRoundId={setSelectedRoundId}
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
      
      {/* <LocalTweaksUI tweaks={tweaks} setTweak={setTweak} /> */}
    </div>
  );
}
