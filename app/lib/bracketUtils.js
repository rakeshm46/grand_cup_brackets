import { useMemo } from 'react';

// -------- Layout constants --------
export const MATCH_W = 220;
export const MATCH_W_LG = 246;
export const MATCH_W_XL = 280;
export const CELL_H = 36;
export const CELL_H_LG = 42;
export const CELL_H_XL = 54;
export const COL_GAP = 54;
export const V_PAD = 8;
export const CENTER_GAP = 80;

export const SIDE_ROUNDS = [
  { round: 'R256', label: 'Round of 128', sub: '128 → 64', count: 128, halfCount: 64, width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R128', label: 'Round of 64',  sub: '64 → 32',  count: 64,  halfCount: 32, width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R64',  label: 'Round of 32',  sub: '32 → 16',   count: 32,  halfCount: 16, width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R32',  label: 'Round of 16',  sub: '16 → 8',   count: 16,  halfCount: 8,  width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'R16',  label: 'Round of 8',   sub: '8 → 4',    count: 8,   halfCount: 4,  width: MATCH_W,    cellH: CELL_H,    size: '' },
  { round: 'QF',   label: 'Quarterfinals', sub: '4 → 2',    count: 4,   halfCount: 2,  width: MATCH_W_LG, cellH: CELL_H_LG, size: 'size-lg' },
  { round: 'SF',   label: 'Semifinals',   sub: '2 → 1',    count: 2,   halfCount: 1,  width: MATCH_W_LG, cellH: CELL_H_LG, size: 'size-lg' },
];

export const FINAL_SPEC = { round: 'F', label: 'Finals', sub: 'LIVE', count: 1, width: MATCH_W_XL, cellH: CELL_H_XL, size: 'size-xl' };

export function useLayout() {
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
