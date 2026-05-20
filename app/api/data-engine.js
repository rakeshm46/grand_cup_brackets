// Dynamic Data Engine for Grand Cup 2 - Expanded 1,024-Trader Pool Bracket
// Ports client-side seeding and dynamic generation algorithms from the prototypes to server-side Next.js logic.

const COUNTRY = {
  US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', AU: '🇦🇺', CA: '🇨🇦',
  BR: '🇧🇷', KR: '🇰🇷', IN: '🇮🇳', MX: '🇲🇽', ES: '🇪🇸', IT: '🇮🇹', NL: '🇳🇱',
  SE: '🇸🇪', SG: '🇸🇬', AE: '🇦🇪', ZA: '🇿🇦', AR: '🇦🇷', PL: '🇵🇱', TR: '🇹🇷',
  NG: '🇳🇬', CN: '🇨🇳', IL: '🇮🇱', CH: '🇨🇭', NO: '🇳🇴', FI: '🇫🇮', DK: '🇩🇰',
  IE: '🇮🇪', BE: '🇧🇪', PT: '🇵🇹', HK: '🇭🇰', GR: '🇬🇷',
};

const COUNTRY_KEYS = Object.keys(COUNTRY);

const TRADERS_RAW_32 = [
  { seed: 1,  handle: 'BrettSimba',     country: 'US', avatar: 'BS' },
  { seed: 2,  handle: 'QuantHawk',      country: 'GB', avatar: 'QH' },
  { seed: 3,  handle: 'OsakaEdge',      country: 'JP', avatar: 'OE' },
  { seed: 4,  handle: 'DeltaRanger',    country: 'DE', avatar: 'DR' },
  { seed: 5,  handle: 'VexBravo',       country: 'US', avatar: 'VB' },
  { seed: 6,  handle: 'NorthPip',       country: 'NO', avatar: 'NP' },
  { seed: 7,  handle: 'Solstice',       country: 'FR', avatar: 'SO' },
  { seed: 8,  handle: 'KernelKoan',     country: 'KR', avatar: 'KK' },
  { seed: 9,  handle: 'BlazeNinety',    country: 'AU', avatar: 'B9' },
  { seed: 10, handle: 'CobraTick',      country: 'BR', avatar: 'CT' },
  { seed: 11, handle: 'ZuluOne',        country: 'ZA', avatar: 'Z1' },
  { seed: 12, handle: 'MidasMesa',      country: 'MX', avatar: 'MM' },
  { seed: 13, handle: 'FjordFox',       country: 'SE', avatar: 'FF' },
  { seed: 14, handle: 'AlpineAce',      country: 'CH', avatar: 'AA' },
  { seed: 15, handle: 'Paramount_',     country: 'CA', avatar: 'P_' },
  { seed: 16, handle: 'Halcyon',        country: 'NL', avatar: 'HA' },
  { seed: 17, handle: 'SaharaSwing',    country: 'AE', avatar: 'SS' },
  { seed: 18, handle: 'OrionCapital',   country: 'US', avatar: 'OC' },
  { seed: 19, handle: 'PampaPro',       country: 'AR', avatar: 'PP' },
  { seed: 20, handle: 'IronGull',       country: 'IE', avatar: 'IG' },
  { seed: 21, handle: 'RedPandora',     country: 'CN', avatar: 'RP' },
  { seed: 22, handle: 'Mavrik',         country: 'US', avatar: 'MV' },
  { seed: 23, handle: 'TokyoPivot',     country: 'JP', avatar: 'TP' },
  { seed: 24, handle: 'Duchess',        country: 'GB', avatar: 'DU' },
  { seed: 25, handle: 'SilverSigma',    country: 'FI', avatar: 'SI' },
  { seed: 26, handle: 'BengalBreak',    country: 'IN', avatar: 'BB' },
  { seed: 27, handle: 'Nomad88',        country: 'SG', avatar: 'N8' },
  { seed: 28, handle: 'Colossus',       country: 'GR', avatar: 'CO' },
  { seed: 29, handle: 'DoubleBarrel',   country: 'US', avatar: 'DB' },
  { seed: 30, handle: 'Kestrel',        country: 'BE', avatar: 'KE' },
  { seed: 31, handle: 'ValkyrieX',      country: 'DK', avatar: 'VX' },
  { seed: 32, handle: 'RogueEight',     country: 'PL', avatar: 'R8' },
];

const BRACKET_PREFIXES = [
  'Alpha', 'Omega', 'Vortex', 'Apex', 'Nova', 'Cyber', 'Crypto', 'Quant', 'Macro', 'Delta',
  'Sigma', 'Zenith', 'Hyper', 'Sonic', 'Matrix', 'Vector', 'Pixel', 'Pulse', 'Shadow', 'Solar',
  'Lunar', 'Echo', 'Prism', 'Orbit', 'Aero', 'Rogue', 'Ghost', 'Neon', 'Titan', 'Astra'
];

const BRACKET_SUFFIXES = [
  'Trader', 'Edge', 'Pip', 'Tick', 'Cap', 'Bull', 'Bear', 'Flow', 'Scalp', 'Rider',
  'Chaser', 'Hunter', 'Master', 'Wave', 'Force', 'Ranger', 'Runner', 'Knight', 'Sage', 'Cobra',
  'Hawk', 'Falcon', 'Fox', 'Wolf', 'Lion', 'Bear', 'Lynx', 'Raven', 'Eagle', 'Stalker'
];

// Seed-based procedural random
function seededRand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// 24 Outlaws, distributed evenly (6 per Pool Bracket)
const OUTLAW_SEEDS = new Set([
  // Pool Alpha (1 - 256)
  3, 11, 27, 64, 128, 201,
  // Pool Beta (257 - 512)
  259, 271, 287, 320, 390, 480,
  // Pool Gamma (513 - 768)
  515, 527, 543, 600, 699, 720,
  // Pool Delta (769 - 1024)
  771, 783, 799, 850, 930, 999
]);

const BOUNTY = 5000;
const BASE = 50000;

const AVATAR_PALETTES = [
  ['#1e445c', '#0a1f2a'], ['#3a2a0a', '#1a1004'], ['#0d3b2e', '#041a13'],
  ['#3d1d4a', '#1a0a23'], ['#4a1a1a', '#200808'], ['#1a3a1f', '#091a0c'],
  ['#3a3010', '#1a1505'], ['#1a2a4a', '#080f20'], ['#3d2030', '#190b14'],
  ['#103a3a', '#051818'], ['#3a1a30', '#180810'], ['#2a3a0a', '#101805'],
];

// Generate 1,024 traders
const TRADERS = [];
for (let s = 1; s <= 1024; s++) {
  let trader;
  if (s <= 32) {
    const raw = TRADERS_RAW_32[s - 1];
    trader = {
      seed: s,
      handle: raw.handle,
      country: raw.country,
      avatar: raw.avatar,
    };
  } else {
    // Generate procedurally
    const r1 = seededRand(s * 17);
    const r2 = seededRand(s * 31);
    const r3 = seededRand(s * 79);
    
    const pref = BRACKET_PREFIXES[Math.floor(r1 * BRACKET_PREFIXES.length)];
    const suff = BRACKET_SUFFIXES[Math.floor(r2 * BRACKET_SUFFIXES.length)];
    const handle = pref + suff + (r3 < 0.2 ? Math.floor(r3 * 100) : '');
    const country = COUNTRY_KEYS[Math.floor(r3 * COUNTRY_KEYS.length)];
    const avatar = handle.slice(0, 2).toUpperCase();

    trader = { seed: s, handle, country, avatar };
  }

  const isOutlaw = OUTLAW_SEEDS.has(s);
  
  // Assign Pool Bracket designation
  let bracket = 'A';
  if (s > 256 && s <= 512) bracket = 'B';
  else if (s > 512 && s <= 768) bracket = 'C';
  else if (s > 768) bracket = 'D';

  TRADERS.push({
    ...trader,
    id: 't' + s,
    flag: COUNTRY[trader.country] || '',
    isOutlaw,
    bounty: isOutlaw ? BOUNTY : 0,
    avatarPalette: AVATAR_PALETTES[(s - 1) % AVATAR_PALETTES.length],
    bracket
  });
}

const TRADERS_BY_ID = {};
const TRADERS_BY_HANDLE = {};
TRADERS.forEach(t => {
  TRADERS_BY_ID[t.id] = t;
  TRADERS_BY_HANDLE[t.handle.toLowerCase()] = t;
});

// Deterministic scores generator
function genScore(meSeed, oppSeed, won, roundIdx = 0) {
  const MAX_DRIFT = 5000;
  const rand = seededRand(meSeed * 7 + oppSeed * 13 + roundIdx * 97) * 2 - 1;
  const roundBoost = 0.5 + roundIdx * 0.1;
  const sign = won ? 1 : -1;
  const baseDrift = 700 + seededRand(meSeed * 31 + oppSeed + roundIdx * 11) * 1800;
  const drift = sign * baseDrift * roundBoost + rand * 400;
  const clamped = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, drift));
  return Math.round(BASE + clamped);
}

// Generate deterministic bracket tournaments
function buildMatches(viewState = 'current', bracket = 'A') {
  const matches = [];

  if (bracket === 'Championship') {
    // Finals Four championship
    // Winners of brackets A, B, C, D
    const winnerA = TRADERS[0];   // BrettSimba wins Pool Alpha in default mock
    const winnerB = TRADERS[256]; // Seed 257 wins Pool Beta
    const winnerC = TRADERS[514]; // Seed 515 wins Pool Gamma
    const winnerD = TRADERS[768]; // Seed 769 wins Pool Delta

    // SF 1: Winner A vs Winner B
    const sf1WinnerId = viewState === 'champion' ? winnerA.id : null;
    const sf1Status = viewState === 'r32_live' ? 'pending' : 'done';
    matches.push({
      id: 'SF-1', round: 'SF', index: 0,
      aId: winnerA.id, bId: winnerB.id,
      aScore: sf1Status === 'pending' ? 0 : 52400,
      bScore: sf1Status === 'pending' ? 0 : 49100,
      winnerId: sf1WinnerId,
      status: sf1Status
    });

    // SF 2: Winner C vs Winner D
    const sf2WinnerId = viewState === 'champion' ? winnerC.id : null;
    const sf2Status = viewState === 'r32_live' ? 'pending' : 'done';
    matches.push({
      id: 'SF-2', round: 'SF', index: 1,
      aId: winnerC.id, bId: winnerD.id,
      aScore: sf2Status === 'pending' ? 0 : 51800,
      bScore: sf2Status === 'pending' ? 0 : 50400,
      winnerId: sf2WinnerId,
      status: sf2Status
    });

    // Championship Finals
    const fStatus = viewState === 'champion' ? 'done' : (viewState === 'current' ? 'live' : 'pending');
    matches.push({
      id: 'F-1', round: 'F', index: 0,
      aId: sf1WinnerId, bId: sf2WinnerId,
      aScore: fStatus === 'pending' ? 0 : 53420,
      bScore: fStatus === 'pending' ? 0 : 48180,
      winnerId: fStatus === 'done' ? winnerA.id : null,
      status: fStatus
    });

    return matches;
  }

  // Otherwise, generate regular brackets A, B, C, D
  // Slice correct 256 traders for pool bracket
  const offset = bracket === 'B' ? 256 : bracket === 'C' ? 512 : bracket === 'D' ? 768 : 0;
  const poolTraders = TRADERS.slice(offset, offset + 256);

  // 1. R256 (128 matches)
  const r256Matches = [];
  for (let i = 0; i < 128; i++) {
    const a = poolTraders[i];
    const b = poolTraders[256 - i - 1];
    
    // Seed-based deterministic winner
    const aWins = seededRand(a.seed * 3 + b.seed * 7) > 0.45;
    const winner = aWins ? a : b;

    r256Matches.push({
      id: `R256-${i + 1}`, round: 'R256', index: i,
      aId: a.id, bId: b.id,
      aScore: genScore(a.seed, b.seed, aWins, 0),
      bScore: genScore(b.seed, a.seed, !aWins, 0),
      winnerId: winner.id,
      status: 'done'
    });
    matches.push(r256Matches[i]);
  }

  // 2. R128 (64 matches)
  const r128Matches = [];
  for (let i = 0; i < 64; i++) {
    const m1 = r256Matches[i * 2];
    const m2 = r256Matches[i * 2 + 1];
    const a = TRADERS_BY_ID[m1.winnerId];
    const b = TRADERS_BY_ID[m2.winnerId];
    
    const aWins = seededRand(a.seed * 11 + b.seed * 19) > 0.48;
    const winner = aWins ? a : b;

    r128Matches.push({
      id: `R128-${i + 1}`, round: 'R128', index: i,
      aId: a.id, bId: b.id,
      aScore: genScore(a.seed, b.seed, aWins, 1),
      bScore: genScore(b.seed, a.seed, !aWins, 1),
      winnerId: winner.id,
      status: 'done'
    });
    matches.push(r128Matches[i]);
  }

  // 3. R64 (32 matches)
  const r64Matches = [];
  for (let i = 0; i < 32; i++) {
    const m1 = r128Matches[i * 2];
    const m2 = r128Matches[i * 2 + 1];
    const a = TRADERS_BY_ID[m1.winnerId];
    const b = TRADERS_BY_ID[m2.winnerId];
    
    const aWins = seededRand(a.seed * 23 + b.seed * 29) > 0.5;
    const winner = aWins ? a : b;

    r64Matches.push({
      id: `R64-${i + 1}`, round: 'R64', index: i,
      aId: a.id, bId: b.id,
      aScore: genScore(a.seed, b.seed, aWins, 2),
      bScore: genScore(b.seed, a.seed, !aWins, 2),
      winnerId: winner.id,
      status: 'done'
    });
    matches.push(r64Matches[i]);
  }

  // 4. R32 (16 matches) - Visual start of tree
  const r32Matches = [];
  for (let i = 0; i < 16; i++) {
    const m1 = r64Matches[i * 2];
    const m2 = r64Matches[i * 2 + 1];
    const a = TRADERS_BY_ID[m1.winnerId];
    const b = TRADERS_BY_ID[m2.winnerId];

    const isLive = viewState === 'r32_live';
    const aWins = seededRand(a.seed * 41 + b.seed * 47) > 0.48;
    const winner = isLive ? null : (aWins ? a : b);

    r32Matches.push({
      id: `R32-${i + 1}`, round: 'R32', index: i,
      aId: a.id, bId: b.id,
      aScore: isLive ? 50200 + i * 80 : genScore(a.seed, b.seed, aWins, 3),
      bScore: isLive ? 49800 - i * 60 : genScore(b.seed, a.seed, !aWins, 3),
      winnerId: winner ? winner.id : null,
      status: isLive ? 'live' : 'done'
    });
    matches.push(r32Matches[i]);
  }

  // 5. R16 (8 matches)
  const r16Matches = [];
  for (let i = 0; i < 8; i++) {
    const m1 = r32Matches[i * 2];
    const m2 = r32Matches[i * 2 + 1];
    const aId = m1.winnerId;
    const bId = m2.winnerId;

    const isPending = viewState === 'r32_live';
    const isLive = viewState === 'current' && false; // Reserve live for final
    
    let aWins = false;
    let winnerId = null;
    let aScore = 0, bScore = 0;

    if (!isPending && aId && bId) {
      const a = TRADERS_BY_ID[aId];
      const b = TRADERS_BY_ID[bId];
      aWins = seededRand(a.seed * 71 + b.seed * 79) > 0.52;
      winnerId = aWins ? aId : bId;
      aScore = genScore(a.seed, b.seed, aWins, 4);
      bScore = genScore(b.seed, a.seed, !aWins, 4);
    }

    r16Matches.push({
      id: `R16-${i + 1}`, round: 'R16', index: i,
      aId, bId, aScore, bScore,
      winnerId,
      status: isPending ? 'pending' : 'done'
    });
    matches.push(r16Matches[i]);
  }

  // 6. QF (4 matches)
  const qfMatches = [];
  for (let i = 0; i < 4; i++) {
    const m1 = r16Matches[i * 2];
    const m2 = r16Matches[i * 2 + 1];
    const aId = m1.winnerId;
    const bId = m2.winnerId;

    const isPending = viewState === 'r32_live' || !aId || !bId;
    let aWins = false;
    let winnerId = null;
    let aScore = 0, bScore = 0;

    if (!isPending) {
      const a = TRADERS_BY_ID[aId];
      const b = TRADERS_BY_ID[bId];
      aWins = seededRand(a.seed * 97 + b.seed * 101) > 0.5;
      winnerId = aWins ? aId : bId;
      aScore = genScore(a.seed, b.seed, aWins, 5);
      bScore = genScore(b.seed, a.seed, !aWins, 5);
    }

    qfMatches.push({
      id: `QF-${i + 1}`, round: 'QF', index: i,
      aId, bId, aScore, bScore,
      winnerId,
      status: isPending ? 'pending' : 'done'
    });
    matches.push(qfMatches[i]);
  }

  // 7. SF (2 matches)
  const sfMatches = [];
  for (let i = 0; i < 2; i++) {
    const m1 = qfMatches[i * 2];
    const m2 = qfMatches[i * 2 + 1];
    const aId = m1.winnerId;
    const bId = m2.winnerId;

    const isPending = viewState === 'r32_live' || !aId || !bId;
    let aWins = false;
    let winnerId = null;
    let aScore = 0, bScore = 0;

    if (!isPending) {
      const a = TRADERS_BY_ID[aId];
      const b = TRADERS_BY_ID[bId];
      aWins = seededRand(a.seed * 131 + b.seed * 139) > 0.46;
      winnerId = aWins ? aId : bId;
      aScore = genScore(a.seed, b.seed, aWins, 6);
      bScore = genScore(b.seed, a.seed, !aWins, 6);
    }

    sfMatches.push({
      id: `SF-${i + 1}`, round: 'SF', index: i,
      aId, bId, aScore, bScore,
      winnerId,
      status: isPending ? 'pending' : 'done'
    });
    matches.push(sfMatches[i]);
  }

  // 8. Finals (1 match)
  const sf1 = sfMatches[0];
  const sf2 = sfMatches[1];
  const aId = sf1.winnerId;
  const bId = sf2.winnerId;
  
  const isPending = viewState === 'r32_live' || !aId || !bId;
  const isLive = viewState === 'current' && !isPending;
  const isDone = viewState === 'champion' && !isPending;
  
  let winnerId = null;
  let aScore = 0, bScore = 0;

  if (isLive && aId && bId) {
    aScore = 52420;
    bScore = 51100;
  } else if (isDone && aId && bId) {
    const a = TRADERS_BY_ID[aId];
    const b = TRADERS_BY_ID[bId];
    const aWins = seededRand(a.seed * 191 + b.seed * 199) > 0.5;
    winnerId = aWins ? aId : bId;
    aScore = genScore(a.seed, b.seed, aWins, 7);
    bScore = genScore(b.seed, a.seed, !aWins, 7);
  }

  matches.push({
    id: 'F-1', round: 'F', index: 0,
    aId, bId, aScore, bScore,
    winnerId,
    status: isLive ? 'live' : (isDone ? 'done' : 'pending')
  });

  return matches;
}

// ---- Details generators (for modal view) ----
const SESSION_START_MIN = 9 * 60 + 30;   // 09:30
const SESSION_END_MIN   = 16 * 60;       // 16:00
const STEP_MIN          = 5;
const STEPS = Math.floor((SESSION_END_MIN - SESSION_START_MIN) / STEP_MIN) + 1; // 79

function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fmtTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function buildSeries(matchId, traderId, finalScore) {
  const r = rng(strSeed(matchId + ':' + traderId));
  const totalDelta = finalScore - BASE;
  const raw = new Array(STEPS);
  raw[0] = BASE;
  const vol = 220 + r() * 280;
  for (let i = 1; i < STEPS; i++) {
    const noise = (r() - 0.5) * vol * 2;
    const shock = r() < 0.04 ? (r() - 0.5) * vol * 6 : 0;
    raw[i] = raw[i - 1] + noise + shock;
  }
  const drift = (finalScore - raw[STEPS - 1]) / (STEPS - 1);
  for (let i = 0; i < STEPS; i++) {
    raw[i] = raw[i] + drift * i;
  }
  const smooth = raw.slice();
  for (let i = 1; i < STEPS - 1; i++) {
    smooth[i] = raw[i - 1] * 0.25 + raw[i] * 0.5 + raw[i + 1] * 0.25;
  }
  smooth[0] = BASE;
  smooth[STEPS - 1] = finalScore;
  
  const pts = [];
  let peak = BASE;
  for (let i = 0; i < STEPS; i++) {
    const min = SESSION_START_MIN + i * STEP_MIN;
    const balance = Math.round(smooth[i]);
    if (balance > peak) peak = balance;
    pts.push({
      i, min, time: fmtTime(min),
      balance,
      drawdown: Math.round(balance - peak),
      peak,
    });
  }
  return pts;
}

function getBalanceSeries(matchId, viewState = 'current', bracket = 'A') {
  const matches = buildMatches(viewState, bracket);
  const m = matches.find(mm => mm.id === matchId);
  if (!m || !m.aId || !m.bId) return null;
  const a = buildSeries(matchId, m.aId, m.aScore);
  const b = buildSeries(matchId, m.bId, m.bScore);
  return { a, b, base: BASE, steps: STEPS, startMin: SESSION_START_MIN, endMin: SESSION_END_MIN };
}

const INSTRUMENTS = ['ES', 'NQ', 'CL', 'GC', 'YM', '6E', 'RTY', 'NG', 'ZB'];
const SIDES = ['LONG', 'SHORT'];
const INSTR_PRICES = {
  ES: 5240, NQ: 18650, CL: 78.4, GC: 2360, YM: 39450, '6E': 1.083, RTY: 2080, NG: 2.65, ZB: 117.8,
};
const TICK_VAL = {
  ES: 12.5, NQ: 5, CL: 10, GC: 10, YM: 5, '6E': 6.25, RTY: 5, NG: 10, ZB: 31.25,
};

function buildTrades(matchId, traderId, finalScore) {
  const r = rng(strSeed(matchId + ':T:' + traderId));
  const totalPnl = finalScore - BASE;
  const tradeCount = 14 + Math.floor(r() * 9);
  const raws = [];
  let rawSum = 0;
  for (let i = 0; i < tradeCount; i++) {
    const dir = totalPnl >= 0 ? (r() < 0.62 ? 1 : -1) : (r() < 0.6 ? -1 : 1);
    const mag = Math.pow(r(), 1.6) * 800 + 60;
    const v = dir * mag;
    raws.push(v);
    rawSum += v;
  }
  const scale = rawSum === 0 ? 0 : totalPnl / rawSum;
  const trades = [];
  const times = [];
  for (let i = 0; i < tradeCount; i++) {
    const tFrac = (i + r() * 0.8) / tradeCount;
    const min = Math.round(SESSION_START_MIN + tFrac * (SESSION_END_MIN - SESSION_START_MIN));
    times.push(min);
  }
  times.sort((a, b) => a - b);

  for (let i = 0; i < tradeCount; i++) {
    const pnl = Math.round(raws[i] * scale);
    const instr = INSTRUMENTS[Math.floor(r() * INSTRUMENTS.length)];
    const side = SIDES[Math.floor(r() * SIDES.length)];
    const qty = 1 + Math.floor(r() * 4);
    const basePrice = INSTR_PRICES[instr];
    const entryNoise = (r() - 0.5) * basePrice * 0.004;
    const entry = +(basePrice + entryNoise).toFixed(instr === '6E' ? 4 : 2);
    const tickV = TICK_VAL[instr] * qty;
    const ticks = pnl / tickV;
    const tickSize = instr === '6E' ? 0.0001 : (instr === 'CL' || instr === 'NG' ? 0.01 : 0.25);
    const exit = +((side === 'LONG' ? entry + ticks * tickSize : entry - ticks * tickSize)).toFixed(instr === '6E' ? 4 : 2);
    const min = times[i];
    trades.push({
      i, time: fmtTime(min), min,
      instr, side, qty,
      entry, exit,
      pnl,
    });
  }
  return trades;
}

function getMatchTrades(matchId, viewState = 'current', bracket = 'A') {
  const matches = buildMatches(viewState, bracket);
  const m = matches.find(mm => mm.id === matchId);
  if (!m || !m.aId || !m.bId) return null;
  const aTrades = buildTrades(matchId, m.aId, m.aScore);
  const bTrades = buildTrades(matchId, m.bId, m.bScore);
  return { a: aTrades, b: bTrades };
}

// ---- Share view stats generators ----
function deriveStats(trader, scenario) {
  const seed = trader.seed;
  const noise = (n) => ((Math.sin((seed + 1) * (n + 1) * 7.31) + 1) / 2);
  const rankFromSeed = Math.max(1, Math.round((seed % 256) * 1.6 + noise(1) * 30 + (seed % 256 > 6 ? noise(2) * 200 : 0)));
  const rank = scenario.stage === 'leaderboard' ? rankFromSeed : null;
  const total = 43230;

  const pl = scenario.stage === 'leaderboard'
    ? Math.round(180000 - rankFromSeed * (700 + noise(3) * 600))
    : null;
  const dailyDelta = Math.round((noise(4) - 0.45) * 12000);
  const startBalance = 50000;
  const equity = scenario.stage === 'leaderboard'
    ? Math.round(startBalance + (pl - 0) * 0.6 + noise(5) * 4000)
    : null;
  const sharpe = (1.4 + noise(6) * 1.4 - rankFromSeed * 0.0008).toFixed(2);
  const trades = 80 + Math.round(noise(7) * 240);
  const winRate = Math.round(48 + noise(8) * 22);

  return { rank, total, pl, dailyDelta, equity, sharpe, trades, winRate, rankFromSeed };
}

function traderPath(trader, viewState = 'current') {
  const path = [];
  const myId = trader.id;
  const allRounds = ['R256', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];
  const labelMap = {
    R256: 'Round of 256',
    R128: 'Round of 128',
    R64:  'Round of 64',
    R32:  'Round of 32',
    R16:  'Round of 16',
    QF:   'Quarterfinals',
    SF:   'Semifinals',
    F:    'Finals',
  };

  const earlierRounds = [
    { round: 'R1024', label: 'Round of 1024', when: '17 May' },
    { round: 'R512',  label: 'Round of 512',  when: '19 May' },
  ];
  earlierRounds.forEach((er, i) => {
    const oppSeed = ((trader.seed * 13 + i * 71 + 41) % 32) + 1;
    const opp = TRADERS[oppSeed - 1] || TRADERS[0];
    if (opp.id === myId) return;
    const myScore = 50000 + 1200 + i * 300 + ((trader.seed + i) % 7) * 80;
    const oppScore = 50000 - 800 - i * 200 - ((trader.seed + i) % 5) * 60;
    path.push({
      id: `${er.round}-x${i}`,
      round: er.round,
      label: er.label,
      when: er.when,
      oppId: opp.id,
      myScore, oppScore,
      myWon: true,
      status: 'done',
      isImagined: true,
    });
  });

  const matches = buildMatches(viewState, trader.bracket);
  for (const r of allRounds) {
    const m = matches.filter(mm => mm.round === r).find(mm => mm.aId === myId || mm.bId === myId);
    if (!m) break;
    const isA = m.aId === myId;
    const oppId = isA ? m.bId : m.aId;
    const myScore = isA ? m.aScore : m.bScore;
    const oppScore = isA ? m.bScore : m.aScore;
    const myWon = m.winnerId === myId;
    path.push({
      id: m.id,
      round: m.round,
      label: labelMap[m.round],
      when: ({R256: '20 May', R128: '23 May', R64: '26 May', R32: '31 May', R16: '3 Jun', QF: '6 Jun', SF: '9 Jun', F: '11 Jun'})[m.round],
      oppId,
      myScore, oppScore,
      myWon,
      status: m.status,
      isImagined: false,
    });
    if (m.status === 'done' && !myWon) break;
    if (m.status === 'live') break;
  }

  return path;
}

function scenarioState(trader, scenarioId = 'duel_advancing', viewState = 'current') {
  const path = traderPath(trader, viewState);
  const stage = scenarioId.startsWith('qualifying') ? 'leaderboard' : 'duels';
  const stats = deriveStats(trader, { stage });
  let nextMatch = null;
  let liveMatch = null;
  let status = 'advancing';
  let wins = 0, losses = 0;

  for (const p of path) {
    if (p.status === 'done' && p.myWon) wins++;
    if (p.status === 'done' && !p.myWon) losses++;
  }

  if (stage === 'duels') {
    const live = path.find(p => p.status === 'live');
    const lastDone = [...path].reverse().find(p => p.status === 'done');
    if (live) {
      liveMatch = live;
      nextMatch = live;
      status = 'live';
    } else if (lastDone && !lastDone.myWon) {
      status = 'eliminated';
    } else {
      status = 'advancing';
    }
  }

  return { stage, stats, path, wins, losses, liveMatch, nextMatch, status };
}

module.exports = {
  TRADERS,
  TRADERS_BY_ID,
  TRADERS_BY_HANDLE,
  buildMatches,
  getBalanceSeries,
  getMatchTrades,
  scenarioState,
};
