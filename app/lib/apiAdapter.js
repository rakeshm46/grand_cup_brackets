// Maps the UI pool keys to the API pool keys
const POOL_MAP = {
  'A': 'alpha',
  'B': 'beta',
  'C': 'gamma',
  'D': 'delta',
  'Championship': 'championship'
};

const ROUND_LABEL_MAP = {
  'r256': 'R256',
  'r128': 'R128',
  'r64': 'R64',
  'r32': 'R32',
  'r16': 'R16',
  'qf': 'QF',
  'sf': 'SF',
  'pool_final': 'F',
  'championship_sf': 'SF',
  'championship_final': 'F'
};

const ROUND_COUNTS = { 'R256': 128, 'R128': 64, 'R64': 32, 'R32': 16, 'R16': 8, 'QF': 4, 'SF': 2, 'F': 1 };

// Country code → flag emoji lookup (extend as needed)
const FLAGS = {
  US: '🇺🇸', IN: '🇮🇳', GB: '🇬🇧', UK: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺',
  CH: '🇨🇭', DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', BR: '🇧🇷', MX: '🇲🇽',
  NG: '🇳🇬', ZA: '🇿🇦', KR: '🇰🇷', SG: '🇸🇬', AE: '🇦🇪', ES: '🇪🇸',
  IT: '🇮🇹', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴', PL: '🇵🇱', TR: '🇹🇷',
  PH: '🇵🇭', MY: '🇲🇾', TH: '🇹🇭', ID: '🇮🇩', CO: '🇨🇴', AR: '🇦🇷',
  CL: '🇨🇱', PE: '🇵🇪', EG: '🇪🇬', KE: '🇰🇪', PK: '🇵🇰', BD: '🇧🇩',
  VN: '🇻🇳', RO: '🇷🇴', HU: '🇭🇺', CZ: '🇨🇿', PT: '🇵🇹', GR: '🇬🇷',
  IE: '🇮🇪', FI: '🇫🇮', DK: '🇩🇰', AT: '🇦🇹', BE: '🇧🇪', NZ: '🇳🇿',
  IL: '🇮🇱', TW: '🇹🇼', HK: '🇭🇰', RU: '🇷🇺', UA: '🇺🇦', SA: '🇸🇦',
};

// Generates the initial 255 empty/pending matches required to draw the canvas
function generateEmptyBracket() {
  const matches = [];
  const rounds = [
    { key: 'R256', count: 128 },
    { key: 'R128', count: 64 },
    { key: 'R64', count: 32 },
    { key: 'R32', count: 16 },
    { key: 'R16', count: 8 },
    { key: 'QF', count: 4 },
    { key: 'SF', count: 2 },
    { key: 'F', count: 1 }
  ];

  let overallIndex = 0;
  rounds.forEach((r) => {
    for (let i = 1; i <= r.count; i++) {
      matches.push({
        id: `${r.key}-${i}`,
        round: r.key,
        status: 'pending',
        aId: null,
        bId: null,
        aScore: null,
        bScore: null,
        winnerId: null,
        index: overallIndex++
      });
    }
  });

  return matches;
}

/**
 * Builds a global dictionary of ALL traders across all pools.
 * This ensures search and outlaw filters work regardless of which pool tab is active.
 */
function buildGlobalTraders(data) {
  const tradersById = {};
  const tradersList = [];

  // Index outlaws for image/bounty lookup
  const outlawsMap = {};
  if (data.outlaws) {
    data.outlaws.forEach(outlaw => {
      if (!outlaw || outlaw.stage_participant_id == null) return;
      outlawsMap[outlaw.stage_participant_id] = outlaw;
    });
  }

  // Iterate ALL brackets, not just the active one
  if (data.bracket) {
    data.bracket.forEach(bracketData => {
      if (!bracketData.rounds) return;
      bracketData.rounds.forEach(round => {
        if (!round.matchups) return;
        round.matchups.forEach(matchup => {
          if (!matchup || !matchup.participants) return;
          matchup.participants.forEach(p => {
            if (!p || p.stage_participant_id == null) return; // skip null entries and TBA slots
            const idStr = String(p.stage_participant_id);
            if (tradersById[idStr]) return; // already registered

            const isOutlaw = p.is_outlaw || !!outlawsMap[p.stage_participant_id];
            const outlawData = outlawsMap[p.stage_participant_id];

            // Palette fallback for initials-based avatars
            const initials = (p.username.match(/[A-Z0-9]/g) || p.username.slice(0, 2).toUpperCase().split('')).slice(0, 2).join('');
            const charCode = initials.charCodeAt(0) || 65;
            const palette = charCode % 2 === 0 ? ['#1e445c', '#050607'] : ['#5c2e1e', '#070505'];

            // Image priority: outlaws array unmask > outlaws array mask > participant unmask > participant mask > null
            const avatarImage =
              outlawData?.unmask_image ||
              outlawData?.mask_image ||
              (p.unmask_image_enable && p.unmask_image) ||
              p.mask_image ||
              null;

            const trader = {
              id: idStr,
              handle: p.username,
              country: p.country_code,
              flag: FLAGS[p.country_code] || '🏳️',
              seed: p.seed,
              bracket: p.pool_name || p.pool,
              isOutlaw,
              avatarImage,
              avatarPalette: palette,
            };

            tradersById[idStr] = trader;
            tradersList.push(trader);
          });
        });
      });
    });
  }

  return { tradersById, tradersList };
}

/**
 * Builds the 255-match array for a specific pool, overlaying API data onto the skeleton.
 */
function buildPoolMatches(data, activePool) {
  const targetPool = POOL_MAP[activePool] || 'alpha';
  const bracketData = data.bracket?.find(b => b.key === targetPool);

  const matchesMap = {};
  const emptyMatches = generateEmptyBracket();
  emptyMatches.forEach(m => { matchesMap[m.id] = m; });

  if (bracketData && bracketData.rounds) {
    bracketData.rounds.forEach(round => {
      const roundKey = ROUND_LABEL_MAP[round.round_key] || round.round_key.toUpperCase();
      const roundSize = ROUND_COUNTS[roundKey] || 128;

      if (!round.matchups) return;
      round.matchups.forEach(matchup => {
        if (!matchup) return;
        // API returns identical slot_label for all matchups, so use match_index instead.
        // Apply modulo so each pool's indices (e.g. Beta 128-255) map to local positions (0-127).
        const normalizedIndex = matchup.match_index != null ? matchup.match_index % roundSize : null;
        const slotLabel = normalizedIndex != null ? `${roundKey}-${normalizedIndex + 1}` : matchup.slot_label;

        let aId = null, bId = null, aScore = null, bScore = null;
        if (matchup.participants && matchup.participants.length > 0) {
          const pA = matchup.participants[0];
          if (pA && pA.stage_participant_id != null) {
            aId = String(pA.stage_participant_id);
            aScore = pA.profit != null ? parseFloat(pA.profit) : null;
          }

          if (matchup.participants.length > 1) {
            const pB = matchup.participants[1];
            if (pB && pB.stage_participant_id != null) {
              bId = String(pB.stage_participant_id);
              bScore = pB.profit != null ? parseFloat(pB.profit) : null;
            }
          }
        }

        const matchId = slotLabel;
        if (matchesMap[matchId]) {
          matchesMap[matchId] = {
            ...matchesMap[matchId],
            status: matchup.status === 'completed' ? 'done' : matchup.status,
            aId,
            bId,
            aScore,
            bScore,
            winnerId: matchup.winner_stage_participant_id != null ? String(matchup.winner_stage_participant_id) : null
          };
        }
      });
    });
  }

  return Object.values(matchesMap).sort((a, b) => a.index - b.index);
}

/**
 * Main entry point. Returns { matches, tradersById, tradersList }.
 * - tradersById/tradersList are GLOBAL (all pools) so search/outlaws work everywhere.
 * - matches are POOL-SPECIFIC (only the active pool's matchups).
 */
export function parseBracketData(apiResponse, activePool) {
  const data = apiResponse?.data;
  if (!data) return { matches: [], tradersById: {}, tradersList: [] };

  const { tradersById, tradersList } = buildGlobalTraders(data);
  const matches = buildPoolMatches(data, activePool);

  return { matches, tradersById, tradersList };
}
