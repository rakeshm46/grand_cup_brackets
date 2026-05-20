import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TRADERS_BY_ID } from '../../api/data-engine';
import { useLayout } from '../../lib/bracketUtils';
import { Match, Connectors } from './MatchNode';

export function RoundHeaders({ layout, activePool, setSelectedRoundId }) {
  return (
    <div className="round-heads" style={{ width: layout.totalW, top: -44 }}>
      {layout.columns.map((col, i) => {
        if (activePool === 'Championship' && ['R256', 'R128', 'R64', 'R32', 'R16', 'QF'].includes(col.spec.round)) {
          return null;
        }
        return (
          <div
            key={`${col.side}-${col.spec.round}-${i}`}
            className={`round-head ${col.spec.round === 'F' ? 'final' : ''} is-clickable`}
            style={{ position: 'absolute', left: col.x, width: col.spec.width, cursor: 'pointer' }}
            onClick={() => { if (setSelectedRoundId) setSelectedRoundId(col.spec.round); }}
          >
            <div className="label">{col.spec.label}</div>
            <div className="sub">{col.spec.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ChampionBanner({ match, layout }) {
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

export function Bracket({ viewState, matches, matchById, onOpenMatch, viewport, setViewport, selectedTraderId, selectedRoundId, setSelectedRoundId, outlawFilterIds, onMatchCount, highlightRound, activePool }) {
  const layout = useLayout();
  const viewRef = useRef(null);
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0, ox: 0, oy: 0, pinchDist: 0, pinchZ: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimer = useRef(null);
  const lastFocusKey = useRef('');

  useEffect(() => {
    if (!viewRef.current) return;
    const vw = viewRef.current.clientWidth;
    const vh = viewRef.current.clientHeight;
    
    // Auto-fit fallback
    const isMobile = vw < 768;
    const fitZ = Math.max(0.06, Math.min(1.0, Math.min((vw - 40) / layout.totalW, (vh - 40) / layout.totalH)));
    
    let targetZ = fitZ;
    let targetX = (vw - layout.totalW * fitZ) / 2;
    let targetY = (vh - layout.totalH * fitZ) / 2;

    if (isMobile) {
      targetZ = 0.55; 
      targetX = 40;   
      targetY = (vh - layout.totalH * targetZ) / 2;
    } else {
      targetZ = 0.5;
      targetX = (vw - layout.totalW * targetZ) / 2;
      targetY = (vh - layout.totalH * targetZ) / 2;
    }

    setViewport({ zoom: targetZ, x: targetX, y: targetY });
  }, [layout.totalW, layout.totalH, setViewport]);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;

    const onMouseDown = (e) => {
      if (e.button !== 0 || isAnimating) return;
      e.preventDefault();
      dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY, ox: viewport.x, oy: viewport.y, pinchDist: 0, pinchZ: 0 };
    };

    const onTouchStart = (e) => {
      if (isAnimating) return;
      if (e.touches.length === 1) {
        dragRef.current = { dragging: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: viewport.x, oy: viewport.y, pinchDist: 0, pinchZ: 0 };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        dragRef.current = { dragging: true, sx: 0, sy: 0, ox: viewport.x, oy: viewport.y, pinchDist: dist, pinchZ: viewport.zoom };
      }
    };

    const onMove = (e) => {
      if (!dragRef.current.dragging || dragRef.current.pinchDist > 0 || isAnimating) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      setViewport(v => ({ ...v, x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
    };

    const onTouchMove = (e) => {
      if (!dragRef.current.dragging || isAnimating) return;
      
      e.preventDefault();

      if (e.touches.length === 1 && dragRef.current.pinchDist === 0) {
        const dx = e.touches[0].clientX - dragRef.current.sx;
        const dy = e.touches[0].clientY - dragRef.current.sy;
        setViewport(v => ({ ...v, x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dragRef.current.pinchDist > 0) {
          const ratio = dist / dragRef.current.pinchDist;
          setViewport(v => {
            const nz = Math.max(0.06, Math.min(1.6, dragRef.current.pinchZ * ratio));
            const el = viewRef.current;
            if (!el) return { ...v, zoom: nz };
            
            const rect = el.getBoundingClientRect();
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            
            const k = nz / v.zoom;
            return { zoom: nz, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
          });
        }
      }
    };
    
    const onUp = () => { dragRef.current.dragging = false; dragRef.current.pinchDist = 0; };
    
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => { 
      window.removeEventListener('mousemove', onMove); 
      window.removeEventListener('mouseup', onUp); 
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
    };
  }, [setViewport, viewport.x, viewport.y, viewport.zoom, isAnimating]);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const d = -e.deltaY * 0.002;
        setViewport(v => {
          const nz = Math.max(0.06, Math.min(1.6, v.zoom * (1 + d)));
          const rect = el.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const k = nz / v.zoom;
          return { zoom: nz, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
        });
      } else {
        setViewport(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [setViewport]);

  const filtersActive = !!selectedTraderId || (outlawFilterIds && outlawFilterIds.size > 0) || !!selectedRoundId;
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
    return (selectedTraderId || '') + '|' + out + '|' + activePool + '|' + (selectedRoundId || '');
  }, [selectedTraderId, outlawFilterIds, activePool, selectedRoundId]);

  const [focusTargetId, setFocusTargetId] = useState(null);
  const animFrame = useRef(null);

  useEffect(() => {
    if (focusKey === lastFocusKey.current) return;
    lastFocusKey.current = focusKey;
    if (!filtersActive) { setFocusTargetId(null); return; }
    if (!viewRef.current) return;

    let target = null;
    let targetZoom = 1.0;
    
    if (selectedRoundId) {
      target = matches.find(m => m.round === selectedRoundId);
      targetZoom = 0.8;
      setFocusTargetId(null);
    } else {
      const hitMatches = matches.filter(m => hits[m.id] && hits[m.id].hit);
      if (hitMatches.length === 0) { setFocusTargetId(null); return; }
      
      const ROUND_ORDER = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 };
      hitMatches.sort((a, b) => {
        const ra = ROUND_ORDER[a.round] ?? 99;
        const rb = ROUND_ORDER[b.round] ?? 99;
        if (ra !== rb) return ra - rb;
        return a.index - b.index;
      });

      target = hitMatches[0];
      setFocusTargetId(target.id);
    }

    if (!target) return;
    const pos = layout.positions[target.id];
    if (!pos) return;

    const vw = viewRef.current.clientWidth;
    const vh = viewRef.current.clientHeight;
    const cx = pos.x + pos.w / 2;
    const cy = pos.y + pos.h / 2;
    
    const nx = vw / 2 - cx * targetZoom;
    const ny = selectedRoundId 
      ? (vh - layout.totalH * targetZoom) / 2 
      : vh / 2 - cy * targetZoom;

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
  }, [focusKey, filtersActive, matches, hits, layout.positions, setViewport, selectedRoundId, layout.totalH]);

  useEffect(() => () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (animTimer.current) clearTimeout(animTimer.current);
  }, []);

  return (
    <div
      className="bracket-viewport"
      ref={viewRef}
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
        <RoundHeaders layout={layout} activePool={activePool} setSelectedRoundId={setSelectedRoundId} />
        <Connectors layout={layout} matchById={matchById} activePool={activePool} />
        {matches.map((m) => {
          const pos = layout.positions[m.id];
          if (!pos) return null;
          
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
