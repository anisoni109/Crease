import roster from "./players.json" with { type: "json" };
import { delivery, shotFor } from "./bowling.mjs";
export const PLAYERS = roster;
export { delivery, shotFor };
export const TEAMS = [
  { name: "Chennai Super Kings", short: "CSK", city: "CHENNAI", color: "#f9cf52", symbol: "♛" },
  { name: "Mumbai Indians", short: "MI", city: "MUMBAI", color: "#579bff", symbol: "✺" },
  { name: "Royal Challengers Bengaluru", short: "RCB", city: "BENGALURU", color: "#f06b67", symbol: "♜" },
  { name: "Kolkata Knight Riders", short: "KKR", city: "KOLKATA", color: "#b393ef", symbol: "♞" },
  { name: "Rajasthan Royals", short: "RR", city: "RAJASTHAN", color: "#f48cbd", symbol: "♔" },
  { name: "Sunrisers Hyderabad", short: "SRH", city: "HYDERABAD", color: "#ff9a52", symbol: "☀" },
  { name: "Delhi Capitals", short: "DC", city: "DELHI", color: "#74b6ff", symbol: "◆" },
  { name: "Punjab Kings", short: "PBKS", city: "PUNJAB", color: "#fc8181", symbol: "♚" },
  { name: "Gujarat Titans", short: "GT", city: "GUJARAT", color: "#81c9cb", symbol: "▲" },
  { name: "Lucknow Super Giants", short: "LSG", city: "LUCKNOW", color: "#94c2e9", symbol: "⚡" },
];
export const TIERS = {
  gold: { name: "Gold", tag: "MARQUEE", icon: "★", set: "Marquee set", color: "#e8be62", bat: 3, bowl: 1 },
  red: { name: "Red", tag: "ELITE", icon: "◆", set: "Elite set", color: "#ee7b76", bat: 2, bowl: 0 },
  blue: { name: "Blue", tag: "CORE", icon: "●", set: "Core set", color: "#78aafa", bat: 1, bowl: -1 },
  gray: { name: "Gray", tag: "ROOKIE", icon: "▲", set: "Rookie set", color: "#a3aba5", bat: 0, bowl: -2 },
};
/** Tier ladder, best first. The auction itself runs in random order. */
export const TIER_ORDER = ["gold", "red", "blue", "gray"];
export const AVATARS = ["🦁", "🐯", "🦅", "🐺", "🦊", "🐼", "🐲", "🦈"];
export const player = (id) => PLAYERS.find((p) => p.id === id);
export const money = (n) => `₹${Number(n).toFixed(1)} Cr`;
export function normalizeSettings(input = {}) {
  const mode = ["auction", "draft", "monopoly"].includes(input.mode) ? input.mode : "auction";
  const settings = {
    mode,
    overs: [1, 2, 5, 10, 20].includes(+input.overs) ? +input.overs : 5,
    squadSize: [3, 5, 7, 11].includes(+input.squadSize) ? +input.squadSize : 11,
    capacity: mode === "monopoly" ? ([2, 3, 4].includes(+input.capacity) ? +input.capacity : 2) : 2,
    difficulty: ["casual", "competitive"].includes(input.difficulty) ? input.difficulty : "casual",
    budget:
      Number.isFinite(+input.budget) && +input.budget > 0 ? Math.min(500, Math.round(+input.budget * 10) / 10) : 0,
  };
  if (settings.budget) settings.budget = Math.max(minimumBudget(settings), settings.budget);
  return settings;
}
const marketScale = (s) => (1 + (s.capacity - 2) * 0.12) * (0.8 + Math.sqrt(s.squadSize / 5) * 0.2);
export const price = (p, s) => Math.round(p.base * marketScale(s) * 10) / 10;
export const recommendedBudget = (s) => Math.round(s.squadSize * 2.2 * marketScale(s));
export const minimumBudget = (s) => {
  if (s.mode === "monopoly") return 1;
  const prices = PLAYERS.map((p) => price(p, s)).sort((a, b) => a - b),
    otherSlots = (s.capacity - 1) * s.squadSize;
  return Math.ceil(prices.slice(otherSlots, otherSlots + s.squadSize).reduce((n, p) => n + p, 0) * 10) / 10;
};
export const budget = (s) => (s.budget ? Math.max(minimumBudget(s), s.budget) : recommendedBudget(s));
export const bowlerLimit = (s) => Math.max(1, Math.ceil(s.overs / Math.min(5, s.squadSize)));
export const scoreRuns = (bat, bowl) => {
  const difference = Math.max(0, bat - bowl);
  return difference >= 6 ? 6 : difference === 5 ? 4 : difference;
};
export function squadAdvice(g, idx) {
  const squad = g.seats[idx].squad.map(player);
  const batters = squad.filter((p) => p.bat >= 68).length,
    bowlers = squad.filter((p) => p.bowl >= 68).length;
  const batTarget = Math.max(1, Math.ceil(g.settings.squadSize * 0.45)),
    bowlTarget = Math.min(g.settings.squadSize, Math.ceil(g.settings.overs / bowlerLimit(g.settings)));
  const messages = [];
  if (batters < batTarget)
    messages.push(`Add ${batTarget - batters} more batting option${batTarget - batters === 1 ? "" : "s"} (BAT 68+).`);
  if (bowlers < bowlTarget)
    messages.push(
      `Add ${bowlTarget - bowlers} more bowling option${bowlTarget - bowlers === 1 ? "" : "s"} (BOWL 68+).`,
    );
  return { batters, bowlers, batTarget, bowlTarget, messages };
}
export function arrangedSquad(g, idx) {
  const batting = g.match.batting === idx,
    groups = batting
      ? ["Batters & keepers", "All-rounders", "Bowlers"]
      : ["Bowlers", "All-rounders", "Batters & keepers"];
  return g.seats[idx].squad
    .map((id, index) => {
      const p = player(id),
        group = p.role === "BOWL" ? "Bowlers" : p.role === "AR" ? "All-rounders" : "Batters & keepers";
      return { id, index, group, skill: batting ? p.bat : p.bowl };
    })
    .sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group) || b.skill - a.skill || a.index - b.index);
}
const round = (n) => Math.round(n * 10) / 10;
const assert = (test, message) => {
  if (!test) throw new Error(message);
};
const dice = (rng) => Math.floor(rng() * 6) + 1;
const shuffle = (a, rng) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function log(g, text) {
  g.log.unshift({ id: g.event++, text });
  g.log = g.log.slice(0, 40);
}
export function makeSeat(name, team, token, ai = false, avatar = 0) {
  return {
    name:
      String(name || "Captain")
        .trim()
        .slice(0, 24) || "Captain",
    avatar: Number.isInteger(avatar) && avatar >= 0 && avatar < AVATARS.length ? avatar : 0,
    team: Number.isInteger(+team) && +team >= 0 && +team < TEAMS.length ? +team : 0,
    token,
    ai,
    autoBalls: 0,
    squad: [],
    bank: 0,
    score: 0,
    wickets: 0,
    balls: 0,
    position: 0,
    last: 0,
  };
}
export function createGame(settings, seat) {
  return {
    settings: normalizeSettings(settings),
    round: 1,
    phase: "lobby",
    seats: [seat],
    active: 0,
    event: 1,
    log: [],
    auction: null,
    draft: null,
    match: null,
    board: [],
    pending: null,
    turn: null,
    lastDice: [1, 1],
    winner: null,
    version: 0,
  };
}
export function start(g, rng = Math.random) {
  assert(g.phase === "lobby", "The match has already started.");
  assert(g.seats.length === g.settings.capacity, "Fill the remaining places before starting.");
  g.seats.forEach((s) => {
    s.bank = budget(g.settings);
  });
  log(g, `${g.settings.capacity} captains. ${g.settings.overs} overs. One winner.`);
  if (g.settings.mode === "monopoly") {
    g.phase = "monopoly";
    const teamSet = new Set(g.seats.map((s) => s.team));
    let pool = shuffle(
      PLAYERS.filter((p) => teamSet.has(p.team)),
      rng,
    );
    if (pool.length < 20)
      pool.push(
        ...shuffle(
          PLAYERS.filter((p) => !teamSet.has(p.team)),
          rng,
        ),
      );
    const specials = {
      0: ["start", "POWERPLAY", "+6 runs each lap"],
      4: ["wide", "WIDE", "+1 & roll again"],
      6: ["out", "LBW", "−6 runs • wicket"],
      8: ["out", "BOWLED", "−6 runs • wicket"],
      12: ["bonus", "FREE HIT", "Double last score"],
      14: ["out", "STUMPED", "−6 runs • wicket"],
      16: ["no-ball", "NO BALL", "+1 & roll again"],
      18: ["out", "HIT WICKET", "−6 runs • wicket"],
      20: ["out", "RUN OUT", "−6 runs • wicket"],
      24: ["bonus", "SUPER OVER", "Double last score"],
      26: ["out", "EDGED", "−6 runs • wicket"],
      28: ["out", "CAUGHT", "−6 runs • wicket"],
    };
    g.board = Array.from({ length: 32 }, (_, i) =>
      specials[i]
        ? { kind: specials[i][0], label: specials[i][1], detail: specials[i][2] }
        : { kind: "player", id: pool.pop().id, owner: null },
    );
  } else if (g.settings.mode === "draft") {
    g.phase = "draft";
    g.draft = {
      pool: shuffle(
        PLAYERS.map((p) => p.id),
        rng,
      ),
      rolls: 0,
    };
    g.board = g.draft.pool.slice(0, 24).map((id) => ({ kind: "player", id, owner: null }));
  } else {
    g.phase = "auction";
    g.auction = {
      pool: auctionPool(rng),
      cursor: 0,
      bid: 0,
      leader: null,
      passed: [],
      results: [],
    };
    newLot(g);
  }
  return g;
}
/** Every player: MARQUEE first, then ELITE, CORE and ROOKIE, shuffled within each tier. */
export function auctionPool(rng = Math.random) {
  return TIER_ORDER.flatMap((t) =>
    shuffle(
      PLAYERS.filter((p) => p.tier === t).map((p) => p.id),
      rng,
    ),
  );
}
/** How many times each captain may call a player of their choice up to the block. */
export const scoutLimit = (s) => Math.max(2, Math.ceil(s.squadSize / 3));
/** A lot is only offered if some captain with an open place can pay for it and still fill their squad. */
function lotAffordable(g, id) {
  const cost = price(player(id), g.settings);
  return g.seats.some((s, i) => s.squad.length < g.settings.squadSize && cost <= availableCash(g, i, id));
}
/** The next `n` lots after the one currently under the hammer. */
export function upcomingLots(g, n = 1) {
  const a = g.auction;
  if (!a) return [];
  const owned = new Set(g.seats.flatMap((s) => s.squad));
  const out = [];
  for (let k = a.cursor; k < a.pool.length && out.length < n; k++) {
    const id = a.pool[k];
    if (!owned.has(id) && id !== a.id && lotAffordable(g, id)) out.push(id);
  }
  return out;
}
/** Players a captain can still go and get: unsold ones (buy now) and ones not yet auctioned (call up). */
export function scoutList(g) {
  const a = g.auction;
  if (!a) return [];
  const owned = new Set(g.seats.flatMap((s) => s.squad));
  const unsold = new Set(a.unsold || []);
  const waiting = new Set(a.pool.slice(a.cursor));
  return PLAYERS.filter((p) => !owned.has(p.id) && p.id !== a.id && (unsold.has(p.id) || waiting.has(p.id))).map((p) => ({
    id: p.id,
    status: unsold.has(p.id) ? "unsold" : "waiting",
    called: (a.called || []).includes(p.id),
  }));
}
function recordLot(g, entry) {
  const a = g.auction;
  if (!a) return;
  a.results ??= [];
  a.results.push({ lot: a.results.length + 1, ...entry });
}
function newLot(g) {
  const a = g.auction;
  if (g.seats.every((s) => s.squad.length === g.settings.squadSize)) {
    beginMatch(g);
    return;
  }
  const owned = new Set(g.seats.flatMap((s) => s.squad));
  while (a.cursor < a.pool.length) {
    const id = a.pool[a.cursor++];
    if (owned.has(id)) continue;
    if (!lotAffordable(g, id)) {
      // nobody left in the room can pay for this player and still finish a squad
      a.withdrawn = (a.withdrawn || 0) + 1;
      continue;
    }
    a.id = id;
    a.bid = 0;
    a.leader = null;
    a.passed = [];
    a.lots = (a.lots || 0) + 1;
    a.called = (a.called || []).filter((x) => x !== id);
    // captains take turns to open the bidding
    const open = g.seats.map((s, i) => i).filter((i) => g.seats[i].squad.length < g.settings.squadSize);
    g.active = open[(a.lots - 1) % open.length];
    return;
  }
  completeSquads(g);
}
function availableCash(g, idx, candidateId = g.auction?.id) {
  const s = g.seats[idx],
    needed = Math.max(0, g.settings.squadSize - s.squad.length - 1),
    otherSlots = g.seats.reduce(
      (n, t, i) => n + (i === idx ? 0 : Math.max(0, g.settings.squadSize - t.squad.length)),
      0,
    ),
    owned = new Set(g.seats.flatMap((t) => t.squad));
  const prices = PLAYERS.filter((p) => !owned.has(p.id) && p.id !== candidateId)
    .map((p) => price(p, g.settings))
    .sort((a, b) => a - b);
  const reserve = prices.slice(otherSlots, otherSlots + needed).reduce((n, p) => n + p, 0);
  return round(s.bank - reserve);
}
export function bidAmount(g) {
  return g.auction.bid ? round(g.auction.bid + 0.2) : price(player(g.auction.id), g.settings);
}
function auctionTurn(g) {
  const a = g.auction;
  const eligible = g.seats
    .map((s, i) => i)
    .filter((i) => g.seats[i].squad.length < g.settings.squadSize && !a.passed.includes(i) && i !== a.leader);
  if (eligible.length === 0) {
    if (a.leader !== null) {
      const s = g.seats[a.leader];
      s.squad.push(a.id);
      s.bank = round(s.bank - a.bid);
      g.lastSale = { id: g.event, player: a.id, seat: a.leader, amount: a.bid };
      recordLot(g, { id: a.id, status: "sold", seat: a.leader, amount: a.bid });
      log(g, `SOLD! ${player(a.id).name} → ${s.name} for ${money(a.bid)}`);
    } else {
      g.lastUnsold = { id: g.event, player: a.id, amount: price(player(a.id), g.settings) };
      a.unsold = [...(a.unsold || []), a.id];
      recordLot(g, { id: a.id, status: "unsold", seat: null, amount: 0 });
      log(g, `${player(a.id).name} goes unsold.`);
    }
    newLot(g);
    return;
  }
  for (let n = 1; n <= g.seats.length; n++) {
    const i = (g.active + n) % g.seats.length;
    if (eligible.includes(i)) {
      g.active = i;
      return;
    }
  }
}
function completeSquads(g) {
  const owned = new Set(g.seats.flatMap((s) => s.squad));
  let roundNo = 0;
  while (g.seats.some((s) => s.squad.length < g.settings.squadSize)) {
    const order = g.seats.map((_, i) => i);
    if (roundNo++ % 2) order.reverse();
    for (const idx of order) {
      const s = g.seats[idx];
      if (s.squad.length >= g.settings.squadSize) continue;
      let pool = PLAYERS.filter((p) => !owned.has(p.id) && price(p, g.settings) <= availableCash(g, idx, p.id)).sort(
        (a, b) => b.rating - a.rating,
      );
      const advice = squadAdvice(g, idx),
        needsBowler = advice.bowlers < advice.bowlTarget,
        needsBatter = advice.batters < advice.batTarget;
      if (needsBowler && needsBatter && pool.some((p) => p.bowl >= 68 && p.bat >= 68))
        pool = pool.filter((p) => p.bowl >= 68 && p.bat >= 68);
      else if (needsBowler && pool.some((p) => p.bowl >= 68)) pool = pool.filter((p) => p.bowl >= 68);
      else if (needsBatter && pool.some((p) => p.bat >= 68)) pool = pool.filter((p) => p.bat >= 68);
      // a captain who has overspent still gets a full squad: the cheapest player left, for whatever is in the purse
      const p = pool[0] || PLAYERS.filter((q) => !owned.has(q.id)).sort((a, b) => a.base - b.base || b.rating - a.rating)[0];
      assert(p, "No players are left to complete this squad.");
      const paid = Math.min(s.bank, price(p, g.settings));
      s.squad.push(p.id);
      s.bank = round(s.bank - paid);
      owned.add(p.id);
      if (g.phase === "auction") recordLot(g, { id: p.id, status: "auto", seat: idx, amount: paid });
    }
  }
  log(g, "Remaining squad places filled at base price. Time to take the field.");
  beginMatch(g);
}
function beginMatch(g) {
  g.phase = "toss";
  g.pending = null;
  g.toss = { coin: null, call: null, winner: null, choice: null };
  log(g, "Squads are locked. Time for the toss.");
}
function launchMatch(g, firstBatting = 0) {
  g.phase = "match";
  g.pending = null;
  g.match = {
    innings: 0,
    firstBatting,
    batting: firstBatting,
    bowling: 1 - firstBatting,
    balls: 0,
    wickets: 0,
    batter: 0,
    bowler: 0,
    bowlerBalls: [{}, {}],
    lastOverBowler: [null, null],
    rolls: [null, null],
    submitted: [false, false],
    scores: [0, 0],
    dismissed: [],
    history: [],
    last: null,
  };
  g.match.bowler = bestBowler(g, g.match.bowling);
  g.match.batter = bestBatter(g, g.match.batting);
  log(g, `${g.seats[firstBatting].name} will bat first. ${g.seats[1 - firstBatting].name} will chase.`);
}
export function bowlingOptions(g, seat = g.match.bowling) {
  const stats = g.match.bowlerBalls?.[seat] || {},
    last = g.match.lastOverBowler?.[seat];
  let choices = g.seats[seat].squad
    .map((id, index) => ({ id, index, balls: stats[index] || 0 }))
    .filter((p) => p.balls < bowlerLimit(g.settings) * 6);
  const fresh = choices.filter((p) => p.index !== last);
  if (fresh.length) choices = fresh;
  return choices.sort((a, b) => a.balls - b.balls || player(b.id).bowl - player(a.id).bowl).map((p) => p.index);
}
function bestBowler(g, seat) {
  return bowlingOptions(g, seat)[0] ?? 0;
}
function bestBatter(g, seat, dismissed = []) {
  const choices = g.seats[seat].squad
    .map((id, index) => ({ id, index }))
    .filter((p) => !dismissed.includes(p.index))
    .sort((a, b) => player(b.id).bat - player(a.id).bat);
  return choices[0]?.index ?? 0;
}
function finish(g) {
  g.phase = "results";
  const scores = g.settings.mode === "monopoly" ? g.seats.map((s) => s.score) : g.match.scores;
  const top = Math.max(...scores);
  g.winner = scores.filter((s) => s === top).length > 1 ? -1 : scores.indexOf(top);
  log(g, g.winner === -1 ? "A tie! Honours even." : `${g.seats[g.winner].name} wins the match!`);
}
function resolveBall(g, rng) {
  const m = g.match;
  const batter = player(g.seats[m.batting].squad[m.batter]),
    bowler = player(g.seats[m.bowling].squad[m.bowler]);
  const b = m.rolls[m.batting] + TIERS[batter.batTier].bat,
    w = m.rolls[m.bowling] + TIERS[bowler.bowlTier].bowl;
  // Natural rolls keep every match-up alive: a batter's 1 against a bowler's 5 or 6 is always out
  // (an unplayable ball), and a bowler's 1 is a loose ball that can never take a wicket.
  const natural =
    m.rolls[m.batting] === 1 && m.rolls[m.bowling] >= 5 ? "jaffa" : m.rolls[m.bowling] === 1 && b < w ? "loose" : null;
  const out = natural === "jaffa" ? true : natural === "loose" ? false : b < w,
    runs = out ? 0 : scoreRuns(b, w);
  m.bowlerBalls ??= [{}, {}];
  m.lastOverBowler ??= [null, null];
  m.bowlerBalls[m.bowling][m.bowler] = (m.bowlerBalls[m.bowling][m.bowler] || 0) + 1;
  m.balls++;
  m.scores[m.batting] += runs;
  const pick = rng();
  const type = ["Bowled", "Caught", "LBW", "Run out"][Math.floor(rng() * 4)];
  const angle = rng() * Math.PI * 2,
    shotScale = runs >= 4 ? 1 : runs > 0 ? 0.55 : 0.25,
    tx = Math.round(300 + 230 * shotScale * Math.cos(angle)),
    ty = Math.round(240 + 160 * shotScale * Math.sin(angle));
  const shotPath =
    out && ["Bowled", "LBW"].includes(type)
      ? "M304 286 Q310 240 300 170"
      : `M304 286 Q310 240 301 187 Q${Math.round((300 + tx) / 2)} ${Math.min(ty, 187) - 30} ${tx} ${ty}`;
  const how = delivery(bowler, g.event);
  m.last = {
    id: g.event++,
    batDie: m.rolls[m.batting],
    bowlDie: m.rolls[m.bowling],
    batTotal: b,
    bowlTotal: w,
    runs,
    out,
    natural,
    shotPath,
    shot: out ? type : b === w ? "Dot ball" : shotFor(angle, runs, how.spin, pick),
    kph: how.kph,
    style: how.style,
    batter: batter.id,
    bowler: bowler.id,
    batting: m.batting,
    ball: m.balls,
    innings: m.innings,
  };
  m.history.unshift({ ...m.last });
  m.history = m.history.slice(0, 240);
  if (out) {
    m.wickets++;
    m.dismissed.push(m.batter);
    m.batter = bestBatter(g, m.batting, m.dismissed);
  }
  log(
    g,
    `${Math.floor((m.balls - 1) / 6)}.${((m.balls - 1) % 6) + 1} · ${batter.name}: ${out ? type : runs + " runs"} (${b} vs ${w})`,
  );
  m.rolls = [null, null];
  m.submitted = [false, false];
  if (m.innings === 1 && m.scores[m.batting] > m.scores[m.bowling]) {
    finish(g);
    return;
  }
  if (m.balls >= g.settings.overs * 6 || m.wickets >= g.settings.squadSize) {
    if (m.innings === 1) {
      finish(g);
      return;
    }
    m.innings = 1;
    m.batting = 1 - (m.firstBatting ?? 0);
    m.bowling = m.firstBatting ?? 0;
    m.balls = 0;
    m.wickets = 0;
    m.batter = bestBatter(g, m.batting);
    m.bowler = bestBowler(g, m.bowling);
    m.dismissed = [];
    g.seats.forEach((s) => {
      if (!s.ai) s.autoBalls = 0;
    });
    log(g, `Innings break. ${g.seats[m.batting].name} needs ${m.scores[m.bowling] + 1} to win.`);
  } else if (m.balls % 6 === 0) {
    m.lastOverBowler[m.bowling] = m.bowler;
    m.bowler = bestBowler(g, m.bowling);
    log(g, `New over. ${player(g.seats[m.bowling].squad[m.bowler]).name} takes the ball.`);
  }
}
/** In Cricket Monopoly a captain is all out, and stops rolling, after this many wickets. */
export const MONOPOLY_WICKETS = 10;
function nextBoardTurn(g) {
  g.pending = null;
  if (g.phase === "draft" && g.draft.rolls >= 120) {
    completeSquads(g);
    return;
  }
  for (let n = 1; n <= g.seats.length; n++) {
    const i = (g.active + n) % g.seats.length;
    if (
      g.phase === "draft"
        ? g.seats[i].squad.length < g.settings.squadSize
        : g.seats[i].balls < g.settings.overs * 6 && g.seats[i].wickets < MONOPOLY_WICKETS
    ) {
      g.active = i;
      return;
    }
  }
  if (g.phase === "draft") beginMatch(g);
  else finish(g);
}
/** Cricket Monopoly: a signed star scores 3x his price when his owner lands on him and costs rivals the same. */
export const MONO_MAX_LEVEL = 3;
export const monoLevel = (t) => t?.lvl || 0;
/** Runs a star is worth each time someone lands on him; every upgrade adds half of his base value again. */
export const monoPoints = (g, t) => Math.ceil(price(player(t.id), g.settings) * 3 * (1 + 0.5 * monoLevel(t)));
/** What the next upgrade costs: half his price, then a full price, then one and a half. */
export const monoUpgradeCost = (g, t) => Math.max(0.1, round(price(player(t.id), g.settings) * 0.5 * (monoLevel(t) + 1)));
const canUpgrade = (g, t, s) => g.phase === "monopoly" && monoLevel(t) < MONO_MAX_LEVEL && s.bank >= monoUpgradeCost(g, t);

/** The result of one captain's turn, shown to everyone as a pop-up once the token has moved. */
function turnStart(g, d, from, to) {
  const t = g.board[to];
  g.turn = {
    id: g.event++,
    seat: g.active,
    dice: d,
    from,
    to,
    tile: t.kind === "player" ? { kind: "player", id: t.id, owner: t.owner, lvl: monoLevel(t) } : { kind: t.kind, label: t.label },
    runs: g.seats.map(() => 0),
    bank: g.seats.map(() => 0),
    notes: [],
    headline: "",
    tone: "neutral",
    done: false,
  };
}
function turnRuns(g, i, n) {
  g.seats[i].score += n;
  if (g.turn) g.turn.runs[i] += n;
}
function turnEnd(g, headline, tone = "neutral") {
  if (!g.turn) return;
  g.turn.headline = headline;
  g.turn.tone = tone;
  g.turn.done = true;
}
function rollBoard(g, rng) {
  assert(!g.pending, "Choose whether to buy this player first.");
  const s = g.seats[g.active],
    d = [dice(rng), dice(rng)],
    old = s.position;
  g.lastDice = d;
  s.position = (old + d[0] + d[1]) % g.board.length;
  turnStart(g, d, old, s.position);
  if (g.phase === "draft") g.draft.rolls++;
  else s.balls++;
  if (g.phase === "monopoly" && old + d[0] + d[1] >= g.board.length) {
    turnRuns(g, g.active, 6);
    s.last = 6;
    g.turn.notes.push("Passed POWERPLAY · +6 runs");
    log(g, `${s.name} passes POWERPLAY. +6 runs.`);
  }
  const t = g.board[s.position];
  log(g, `${s.name} rolls ${d[0]} + ${d[1]} → ${t.kind === "player" ? player(t.id).name : t.label}`);
  if (t.kind === "player") {
    const cost = price(player(t.id), g.settings);
    const who = player(t.id).name;
    if (
      t.owner === null &&
      s.bank >= cost &&
      (g.phase === "monopoly" || !s.ai || availableCash(g, g.active, t.id) >= cost)
    ) {
      g.pending = { index: s.position, seat: g.active, kind: "buy" };
      return;
    }
    if (t.owner === null) turnEnd(g, `${who} is too expensive for ${s.name}`, "neutral");
    if (g.phase === "monopoly" && t.owner !== null) {
      const rent = monoPoints(g, t);
      if (t.owner === g.active) {
        turnRuns(g, g.active, rent);
        s.last = rent;
        log(g, `Home advantage! ${s.name} scores ${rent} runs.`);
        turnEnd(g, `${who} scores ${rent} runs for ${s.name}`, "good");
        if (canUpgrade(g, t, s)) {
          g.pending = { index: s.position, seat: g.active, kind: "upgrade" };
          g.turn.done = false;
          return;
        }
      } else {
        const taken = Math.min(s.score, rent);
        turnRuns(g, g.active, -taken);
        turnRuns(g, t.owner, taken);
        log(g, `${s.name} pays ${taken} runs to ${g.seats[t.owner].name}.`);
        turnEnd(g, `${s.name} loses ${taken} run${taken === 1 ? "" : "s"} to ${who}`, "bad");
      }
    }
  } else if (t.kind === "out") {
    const lost = Math.min(s.score, 6);
    turnRuns(g, g.active, -lost);
    s.wickets++;
    log(
      g,
      s.wickets >= MONOPOLY_WICKETS
        ? `${t.label}! ${s.name} loses ${lost} runs and is ALL OUT.`
        : `${t.label}! ${s.name} loses ${lost} runs. ${MONOPOLY_WICKETS - s.wickets} wicket${MONOPOLY_WICKETS - s.wickets === 1 ? "" : "s"} left.`,
    );
    g.turn.wicket = true;
    turnEnd(g, s.wickets >= MONOPOLY_WICKETS ? `${t.label}! ${s.name} is ALL OUT` : `${t.label}! Wicket falls · ${MONOPOLY_WICKETS - s.wickets} left`, "bad");
  } else if (t.kind === "bonus") {
    const gain = s.last;
    turnRuns(g, g.active, gain);
    log(g, `${t.label}! +${gain} runs for ${s.name}.`);
    turnEnd(g, `${t.label}! Last score doubled`, "good");
  } else if (t.kind === "wide" || t.kind === "no-ball") {
    turnRuns(g, g.active, 1);
    s.last = 1;
    if (s.extraStreak < 2 || !s.extraStreak) {
      s.balls--;
      s.extraStreak = (s.extraStreak || 0) + 1;
      log(g, `${t.label}! +1 run and a free roll.`);
      turnEnd(g, `${t.label}! +1 run and a free roll`, "good");
      return;
    }
    turnEnd(g, `${t.label}! +1 run`, "good");
  } else if (t.kind === "start") {
    turnRuns(g, g.active, 6);
    s.last = 6;
    log(g, `Powerplay boost! ${s.name} adds 6 runs.`);
    turnEnd(g, "Powerplay boost! +6 runs", "good");
  }
  if (g.turn && !g.turn.done) turnEnd(g, g.turn.notes[0] || "Nothing happens", "neutral");
  s.extraStreak = 0;
  if (g.phase === "draft" && g.draft.rolls >= 120) {
    completeSquads(g);
    return;
  }
  nextBoardTurn(g);
}
export function act(state, actor, action, rng = Math.random) {
  const g = structuredClone(state);
  assert(Number.isInteger(actor) && g.seats[actor], "Unknown captain.");
  const type = action.type;
  if (type === "rematch") {
    assert(actor === 0 && g.phase === "results", "Only the host can start a rematch after the result.");
    g.round = (g.round || 1) + 1;
    g.winner = null;
    g.active = 0;
    g.pending = null;
    g.lastDice = [1, 1];
    g.turn = null;
    g.lastSale = null;
    g.lastUnsold = null;
    g.lastAuctionDecision = null;
    g.seats.forEach((s) => {
      s.autoBalls = 0;
      s.rematchRequested = false;
      s.score = 0;
      s.wickets = 0;
      s.balls = 0;
      s.position = 0;
      s.last = 0;
      s.extraStreak = 0;
    });
    if (g.settings.mode === "monopoly") {
      g.phase = "lobby";
      g.seats.forEach((s) => (s.squad = []));
      start(g, rng);
    } else {
      g.match = null;
      beginMatch(g);
    }
    log(g, `Rematch ${g.round}. A new chapter in the rivalry.`);
  } else if (type === "requestRematch") {
    assert(g.phase === "results", "Finish the match first.");
    g.seats[actor].rematchRequested = true;
    log(g, `${g.seats[actor].name} wants a rematch.`);
  } else if (type === "start") {
    assert(actor === 0, "Only the host can start.");
    start(g, rng);
  } else if (type === "addAI") {
    assert(actor === 0 && g.phase === "lobby", "Only the host can add AI before the game.");
    assert(g.seats.length < g.settings.capacity, "The lobby is full.");
    const team = action.team ?? [1, 2, 3].find((t) => !g.seats.some((s) => s.team === t)) ?? 1;
    const s = makeSeat(
      ["The Strategist", "The Finisher", "The Yorker"][g.seats.length - 1],
      team,
      `ai-${g.seats.length}`,
      true,
      g.seats.length,
    );
    g.seats.push(s);
  } else if (type === "kick") {
    assert(actor === 0 && g.phase === "lobby", "Only the host can remove captains before starting.");
    assert(
      Number.isInteger(action.seat) && action.seat > 0 && action.seat < g.seats.length,
      "The host cannot be removed.",
    );
    const removed = g.seats.splice(action.seat, 1)[0];
    log(g, `${removed.name} left the lobby.`);
  } else if (type === "settings") {
    assert(actor === 0 && g.phase === "lobby", "Only the host can change match rules before starting.");
    g.settings = normalizeSettings({
      ...g.settings,
      overs: action.overs,
      squadSize: action.squadSize,
      budget: action.budget ?? g.settings.budget,
    });
  } else if (type === "identity") {
    assert(g.phase === "lobby", "Your captain profile is locked after the game starts.");
    assert(typeof action.name === "string" && action.name.trim().length > 0, "Enter your captain name.");
    assert(
      Number.isInteger(action.avatar) && action.avatar >= 0 && action.avatar < AVATARS.length,
      "Choose an avatar.",
    );
    g.seats[actor].name = action.name.trim().slice(0, 24);
    g.seats[actor].avatar = action.avatar;
  } else if (type === "team") {
    assert(g.phase === "lobby", "Teams are locked after the game starts.");
    assert(Number.isInteger(action.team) && action.team >= 0 && action.team < TEAMS.length, "Choose a valid team.");
    g.seats[actor].team = action.team;
  } else if (type === "complete") {
    assert(actor === 0 && ["auction", "draft"].includes(g.phase), "Only the host can complete a draft.");
    completeSquads(g);
  } else if (g.phase === "auction" && (type === "callUp" || type === "buyUnsold")) {
    const a = g.auction,
      s = g.seats[actor],
      p = player(action.id);
    assert(p, "Choose a player.");
    assert(s.squad.length < g.settings.squadSize, "Your squad is already full.");
    assert(!g.seats.some((t) => t.squad.includes(p.id)) && p.id !== a.id, "That player is no longer available.");
    const cost = price(p, g.settings);
    assert(cost <= s.bank, "You do not have enough money for this player.");
    if (type === "buyUnsold") {
      assert((a.unsold || []).includes(p.id), "Only unsold players can be signed directly.");
      assert(
        !(a.leader === actor && g.settings.squadSize - s.squad.length === 1),
        "You are leading the current lot for your last place.",
      );
      a.unsold = a.unsold.filter((x) => x !== p.id);
      s.squad.push(p.id);
      s.bank = round(s.bank - cost);
      g.lastSale = { id: g.event, player: p.id, seat: actor, amount: cost };
      recordLot(g, { id: p.id, status: "sold", seat: actor, amount: cost, direct: true });
      log(g, `SOLD! ${p.name} → ${s.name} for ${money(cost)}`);
      if (g.seats.every((t) => t.squad.length === g.settings.squadSize)) beginMatch(g);
      else if (s.squad.length === g.settings.squadSize && a.leader !== actor) {
        // a full squad drops out of the lot on the block
        if (!a.passed.includes(actor)) a.passed.push(actor);
        if (g.active === actor) auctionTurn(g);
      }
    } else {
      const at = a.pool.indexOf(p.id, a.cursor);
      assert(at >= 0, "That player has already been through the auction.");
      assert(!(a.called || []).includes(p.id), "That player is already on the way to the block.");
      assert((s.scouts || 0) < scoutLimit(g.settings), "You have used all your call-ups.");
      s.scouts = (s.scouts || 0) + 1;
      a.called = [...(a.called || []), p.id];
      a.pool.splice(at, 1);
      // queue behind any earlier call-ups that are still waiting
      let slot = a.cursor;
      while (slot < a.pool.length && a.called.includes(a.pool[slot])) slot++;
      a.pool.splice(slot, 0, p.id);
      log(g, `${s.name} calls ${p.name} up to the block.`);
    }
  } else if (g.phase === "auction") {
    assert(actor === g.active, "It is another captain’s turn.");
    assert(["bid", "pass"].includes(type), "Choose bid or pass.");
    if (type === "bid") {
      const amount = bidAmount(g);
      assert(amount <= g.seats[actor].bank, "This bid exceeds the money actually remaining in your purse.");
      if (g.seats[actor].ai)
        assert(amount <= availableCash(g, actor), "The CPU is reserving money for its remaining squad places.");
      g.auction.bid = amount;
      g.auction.leader = actor;
      g.auction.passed = g.auction.passed.filter((i) => i !== actor);
      if (g.seats[actor].ai)
        g.lastAuctionDecision = {
          id: g.event,
          seat: actor,
          player: g.auction.id,
          kind: "bid",
          reason: String(action.reason || "a target for this squad").slice(0, 100),
        };
      log(g, `${g.seats[actor].name} bids ${money(amount)} for ${player(g.auction.id).name}`);
    } else {
      g.auction.passed.push(actor);
      const reason = g.seats[actor].ai
        ? String(action.reason || "not in this captain’s plan").slice(0, 100)
        : "saving the purse for another player";
      g.lastAuctionDecision = { id: g.event, seat: actor, player: g.auction.id, kind: "pass", reason };
      log(g, `${g.seats[actor].name} skips ${player(g.auction.id).name}: ${reason}.`);
    }
    auctionTurn(g);
  } else if (g.phase === "draft" || g.phase === "monopoly") {
    assert(actor === g.active, "It is another captain’s turn.");
    if (type === "roll") rollBoard(g, rng);
    else if (type === "buy" || type === "pass" || type === "upgrade") {
      assert(g.pending && g.pending.seat === actor, "Roll to land on an available player first.");
      const t = g.board[g.pending.index],
        s = g.seats[actor],
        kind = g.pending.kind || "buy",
        who = player(t.id).name;
      assert(type === "pass" || (type === "upgrade") === (kind === "upgrade"), kind === "upgrade" ? "Upgrade this player or pass." : "Sign this player or pass.");
      if (type === "upgrade") {
        const cost = monoUpgradeCost(g, t);
        assert(monoLevel(t) < MONO_MAX_LEVEL, "This player is fully upgraded.");
        assert(s.bank >= cost, "You do not have enough money to upgrade.");
        s.bank = round(s.bank - cost);
        t.lvl = monoLevel(t) + 1;
        if (g.turn) g.turn.bank[actor] -= cost;
        log(g, `${s.name} upgrades ${who} to SKILL +${t.lvl} for ${money(cost)}.`);
        turnEnd(g, `${who} upgraded to SKILL +${t.lvl} · now worth ${monoPoints(g, t)} runs`, "good");
        if (g.turn) g.turn.tile = { kind: "player", id: t.id, owner: t.owner, lvl: t.lvl };
      } else if (type === "buy") {
        const cost = price(player(t.id), g.settings);
        assert(s.bank >= cost, "You do not have enough money.");
        s.bank = round(s.bank - cost);
        s.squad.push(t.id);
        t.owner = actor;
        if (g.turn) g.turn.bank[actor] -= cost;
        log(g, `${s.name} signs ${who} for ${money(cost)}.`);
        if (g.phase === "monopoly") {
          const gain = Math.ceil(cost * 2);
          turnRuns(g, actor, gain);
          s.last = gain;
        }
        if (g.turn) g.turn.tile = { kind: "player", id: t.id, owner: actor, lvl: 0 };
        turnEnd(g, g.phase === "monopoly" ? `${s.name} signs ${who} · +${g.turn.runs[actor]} runs` : `${s.name} signs ${who}`, "good");
      } else {
        turnEnd(g, kind === "upgrade" ? `${s.name} keeps ${who} as he is` : `${s.name} passes on ${who}`, "neutral");
      }
      s.extraStreak = 0;
      if (g.phase === "draft" && type === "buy") {
        const owned = new Set(g.seats.flatMap((s) => s.squad));
        const next = g.draft.pool.find((id) => !owned.has(id) && !g.board.some((t) => t.id === id));
        if (next) {
          t.id = next;
          t.owner = null;
        }
      }
      if (g.phase === "draft" && g.seats.every((s) => s.squad.length === g.settings.squadSize)) beginMatch(g);
      else nextBoardTurn(g);
    } else throw new Error("Choose roll, buy or pass.");
  } else if (g.phase === "toss") {
    if (type === "toss") {
      assert(actor === 0 && g.toss.coin === null, "The first captain calls the coin before it is tossed.");
      assert(["heads", "tails"].includes(action.call), "Call heads or tails.");
      const coin = rng() < 0.5 ? "heads" : "tails";
      g.toss = { coin, call: action.call, winner: coin === action.call ? 0 : 1, choice: null };
      log(g, `${g.seats[0].name} calls ${action.call}. It is ${coin}! ${g.seats[g.toss.winner].name} wins the toss.`);
    } else if (type === "choose") {
      assert(g.toss.winner !== null && actor === g.toss.winner, "Only the toss winner chooses whether to bat or bowl.");
      assert(["bat", "bowl"].includes(action.choice), "Choose batting or bowling.");
      g.toss.choice = action.choice;
      log(g, `${g.seats[actor].name} chooses to ${action.choice} first.`);
      launchMatch(g, action.choice === "bat" ? actor : 1 - actor);
    } else throw new Error("Call the toss, then the winner chooses bat or bowl.");
  } else if (g.phase === "match") {
    const m = g.match;
    if (type === "autoplay") {
      assert(
        Number.isInteger(action.overs) && action.overs >= 0 && action.overs <= 20,
        "Choose a valid number of autoplay overs.",
      );
      g.seats[actor].autoBalls = Math.min(action.overs * 6, g.settings.overs * 6 - m.balls);
      log(
        g,
        action.overs
          ? `${g.seats[actor].name} enabled autoplay for ${action.overs} over${action.overs === 1 ? "" : "s"}.`
          : `${g.seats[actor].name} stopped autoplay.`,
      );
    } else if (type === "select") {
      assert(m.rolls[actor] === null, "Your die is already locked for this ball.");
      assert(
        Number.isInteger(action.index) && action.index >= 0 && action.index < g.seats[actor].squad.length,
        "Choose a squad member.",
      );
      if (actor === m.batting) {
        assert(!m.dismissed.includes(action.index), "That batter is already out.");
        m.batter = action.index;
      } else {
        assert(m.balls % 6 === 0, "A bowler completes the current over before changing.");
        assert(
          bowlingOptions(g, actor).includes(action.index),
          "That bowler has reached their over limit or bowled the previous over.",
        );
        m.bowler = action.index;
      }
    } else if (type === "roll") {
      assert(m.rolls[actor] === null, "You have already rolled. Wait for your opponent.");
      m.rolls[actor] = dice(rng);
      m.submitted[actor] = true;
      if (g.seats[actor].autoBalls > 0) g.seats[actor].autoBalls--;
      if (m.rolls.every((v) => v !== null)) resolveBall(g, rng);
    } else throw new Error("Select a player or roll your die.");
  } else throw new Error("This action is unavailable.");
  g.version = (g.version || 0) + 1;
  return g;
}
export function aiAction(g) {
  if (g.phase === "lobby" || g.phase === "results") return null;
  if (g.phase === "toss") {
    if (g.toss.coin === null) return g.seats[0].ai ? { actor: 0, action: { type: "toss", call: "heads" } } : null;
    const winner = g.toss.winner;
    if (!g.seats[winner].ai) return null;
    const squad = g.seats[winner].squad.map(player),
      bat = squad.reduce((n, p) => n + p.bat, 0),
      bowl = squad.reduce((n, p) => n + p.bowl, 0);
    return { actor: winner, action: { type: "choose", choice: bat >= bowl ? "bat" : "bowl" } };
  }
  if (g.phase === "match") {
    const i = g.seats.findIndex((s, i) => (s.ai || s.autoBalls > 0) && g.match.rolls[i] === null);
    return i >= 0 ? { actor: i, action: { type: "roll" } } : null;
  }
  const i = g.active,
    s = g.seats[i];
  if (!s.ai) return null;
  if (g.phase === "auction") {
    return { actor: i, action: auctionDecision(g, i) };
  }
  if (g.pending) {
    const p = player(g.board[g.pending.index].id);
    if (g.phase === "draft") return { actor: i, action: draftDecision(g, i) };
    const t = g.board[g.pending.index];
    if (g.pending.kind === "upgrade") {
      const cost = monoUpgradeCost(g, t);
      // upgrades are worth it while the CPU still keeps a cushion for signings
      return { actor: i, action: { type: s.bank - cost >= budget(g.settings) * 0.3 ? "upgrade" : "pass" } };
    }
    return { actor: i, action: { type: s.bank >= price(p, g.settings) ? "buy" : "pass" } };
  }
  return { actor: i, action: { type: "roll" } };
}
/* ───────────── CPU squad building ─────────────
 * The CPU does not chase every player. Before each decision it works out
 *   1. which roles it still needs (top-order batters, bowlers for every over, then cheap depth),
 *   2. the best mix of tiers it can afford for those places at realistic auction prices, and
 *   3. whether this player belongs in that plan, and what they are worth to it.
 * Each tier step is worth one point on the die, so tiers are valued 3/2/1/0.
 */
const TIER_VALUE = { gold: 3, red: 2, blue: 1, gray: 0 };
const MARKUP = { gold: 1.3, red: 1.12, blue: 1.04, gray: 1 };
function squadNeeds(g, i) {
  const s = g.seats[i],
    advice = squadAdvice(g, i),
    slots = g.settings.squadSize - s.squad.length,
    unit = s.bank / Math.max(1, slots),
    lowBudget = unit < 1.3 * marketScale(g.settings),
    current = s.squad.map(player);
  const isBat = (q) => (lowBudget ? ["BAT", "WK", "AR"].includes(q.role) : q.bat >= 68),
    isBowl = (q) => (lowBudget ? ["BOWL", "AR"].includes(q.role) : q.bowl >= 68);
  const needBat = Math.max(0, advice.batTarget - current.filter(isBat).length),
    needBowl = Math.max(0, advice.bowlTarget - current.filter(isBowl).length),
    keySlots = Math.min(slots, needBat + needBowl);
  /** The tier this player would play at in a role the squad still needs, or null. */
  const fit = (q) => {
    const tiers = [];
    if (needBat && isBat(q)) tiers.push(q.batTier);
    if (needBowl && isBowl(q)) tiers.push(q.bowlTier);
    if (!tiers.length) return null;
    return { tier: tiers.sort((a, b) => TIER_VALUE[b] - TIER_VALUE[a])[0], dual: tiers.length > 1 };
  };
  return { slots, unit, lowBudget, needBat, needBowl, keySlots, filler: slots - keySlots, isBat, isBowl, fit };
}
function playersStillAvailable(g) {
  const owned = new Set(g.seats.flatMap((t) => t.squad));
  const ids =
    g.phase === "auction"
      ? [g.auction.id, ...g.auction.pool.slice(g.auction.cursor)]
      : [...g.board.filter((t) => t.kind === "player").map((t) => t.id), ...(g.draft?.pool || [])];
  return [...new Set(ids)].filter((id) => !owned.has(id)).map(player);
}
function tierPlan(g, i, needs, pool) {
  const s = g.seats[i],
    hard = g.settings.difficulty === "competitive" ? 1.08 : 1;
  const supply = { gold: [], red: [], blue: [], gray: [] };
  for (const q of pool) {
    const f = needs.fit(q);
    if (f) supply[f.tier].push(q);
  }
  const avg = {},
    cap = {};
  for (const t of TIER_ORDER) {
    avg[t] = supply[t].length ? supply[t].reduce((n, q) => n + price(q, g.settings), 0) / supply[t].length : Infinity;
    // rivals want the same players: plan on winning roughly a fair share of each tier
    cap[t] = Math.min(supply[t].length, Math.ceil(supply[t].length / g.seats.length) + 1);
  }
  const cheapest = pool.length ? Math.min(...pool.map((q) => price(q, g.settings))) : 0,
    money = s.bank - needs.filler * cheapest,
    k = needs.keySlots;
  let best = null;
  for (let a = 0; a <= Math.min(k, cap.gold); a++)
    for (let b = 0; a + b <= k && b <= cap.red; b++)
      for (let c = 0; a + b + c <= k && c <= cap.blue; c++) {
        const d = k - a - b - c;
        if (d > cap.gray) continue;
        const cost =
          (a ? a * avg.gold * MARKUP.gold * hard : 0) +
          (b ? b * avg.red * MARKUP.red * hard : 0) +
          (c ? c * avg.blue * MARKUP.blue : 0) +
          (d ? d * avg.gray : 0);
        if (cost > money) continue;
        const value = a * 3 + b * 2 + c;
        if (!best || value > best.value || (value === best.value && cost < best.cost))
          best = { value, cost, quota: { gold: a, red: b, blue: c, gray: d } };
      }
  return { ...(best || { value: 0, cost: 0, quota: { gold: 0, red: 0, blue: 0, gray: k } }), supply, avg, cheapest };
}
const median = (list) => {
  const v = [...list].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};
const planText = (q) =>
  TIER_ORDER.filter((t) => q[t])
    .map((t) => `${q[t]} ${TIERS[t].tag[0]}${TIERS[t].tag.slice(1).toLowerCase()}`)
    .join(", ");
export function auctionDecision(g, i) {
  const s = g.seats[i],
    p = player(g.auction.id),
    cost = price(p, g.settings),
    next = bidAmount(g),
    cash = availableCash(g, i),
    needs = squadNeeds(g, i),
    pool = playersStillAvailable(g),
    lotsLeft = pool.length,
    opening = g.auction.leader === null;
  const pass = (reason) => ({ type: "pass", reason }),
    bid = (reason) => ({ type: "bid", reason });
  if (next > cash) return pass("keeping enough money for every remaining squad place");
  const f = needs.fit(p),
    running_out = lotsLeft <= needs.slots * g.seats.length * 2;
  if (needs.keySlots === 0) {
    // core is built: only cheap depth, and never in a bidding war
    if (opening && (cost <= tierPlan(g, i, needs, pool).cheapest * 2.2 || running_out))
      return bid("cheap depth for the bench");
    return pass("my core is set; only cheap depth from here");
  }
  if (!f) {
    if (needs.filler > 0 && opening && running_out) return bid("late depth at base price");
    if (needs.needBowl && !needs.needBat) return pass("batting is covered; looking for bowling depth");
    if (needs.needBat && !needs.needBowl) return pass("bowling is covered; looking for batting depth");
    return pass("does not fill a missing role");
  }
  // more roles to fill than places left: only all-rounders can square it, so hold out for them while they last
  if (needs.needBat + needs.needBowl > needs.slots && !f.dual && !running_out) {
    const duals = pool.filter((q) => needs.fit(q)?.dual && price(q, g.settings) <= cash).length;
    if (duals >= needs.slots * 2) return pass("need all-rounders to cover batting and bowling in the places left");
  }
  const plan = tierPlan(g, i, needs, pool),
    quota = plan.quota[f.tier],
    planned = TIER_ORDER.filter((t) => plan.quota[t]),
    role = needs.needBowl && needs.isBowl(p) && (!needs.needBat || !needs.isBat(p)) ? "bowler" : f.dual ? "all-rounder" : "batter";
  if (!quota && !running_out) {
    const better = planned.some((t) => TIER_VALUE[t] > TIER_VALUE[f.tier]);
    if (better) return pass(`holding out for ${TIERS[planned[0]].tag} players (plan: ${planText(plan.quota)})`);
    // a class above the plan: only at the opening price, and only if the rest of the squad still fits
    const cheaperRest = plan.cost - (planned.length ? plan.avg[planned[0]] : 0);
    if (!(opening && cost + cheaperRest <= s.bank - needs.filler * plan.cheapest))
      return pass(`outside my budget plan (${planText(plan.quota) || "depth only"})`);
  }
  const skill = (q) => Math.max(needs.needBat && needs.isBat(q) ? q.bat : 0, needs.needBowl && needs.isBowl(q) ? q.bowl : 0),
    rivals = plan.supply[f.tier],
    mid = median(rivals.map(skill));
  // patience: with plenty of this class still to come, wait for the better ones
  if (quota && !f.dual && rivals.length >= quota * 3 + 3 && skill(p) < mid && lotsLeft > needs.slots * 5)
    return pass(`plenty of ${TIERS[f.tier].tag} ${role}s still to come; waiting for a stronger one`);
  const scarce = rivals.length <= Math.max(1, quota) * 2,
    lift = MARKUP[f.tier] + (skill(p) >= mid ? 0.08 : -0.04) + (scarce ? 0.15 : 0) + (f.dual ? 0.15 : 0),
    room = s.bank - needs.filler * plan.cheapest - Math.max(0, plan.cost - plan.avg[f.tier] * MARKUP[f.tier]),
    ceiling = Math.min(
      cash,
      Math.max(cost, room),
      cost * lift * (g.settings.difficulty === "competitive" ? 1.1 : 1),
    );
  if (next > Math.max(cost, ceiling) + 1e-9) return pass("this bid is above my valuation; saving for other targets");
  return bid(
    f.dual
      ? `an all-rounder covers two needs (plan: ${planText(plan.quota)})`
      : scarce
        ? `few ${TIERS[f.tier].tag} ${role}s remain and I still need ${Math.max(1, quota)}`
        : `fits my plan: ${planText(plan.quota)}`,
  );
}
/** Roll & Recruit: sign players that fit the plan instead of everyone the token lands on. */
export function draftDecision(g, i) {
  const p = player(g.board[g.pending.index].id),
    s = g.seats[i],
    cost = price(p, g.settings);
  if (s.bank < cost) return { type: "pass" };
  const needs = squadNeeds(g, i),
    pool = playersStillAvailable(g),
    late = g.draft.rolls >= 70,
    plan = tierPlan(g, i, needs, pool);
  if (needs.keySlots === 0) return { type: cost <= plan.cheapest * 2.2 || late ? "buy" : "pass" };
  const f = needs.fit(p);
  if (!f) return { type: needs.filler > 0 && (late || cost <= plan.cheapest * 1.5) && g.draft.rolls >= 30 ? "buy" : "pass" };
  const planned = TIER_ORDER.filter((t) => plan.quota[t]);
  if (plan.quota[f.tier] || late) return { type: "buy" };
  const lowest = Math.min(...planned.map((t) => TIER_VALUE[t]), 3);
  // better than planned and affordable, or good enough once the draft is half done
  if (TIER_VALUE[f.tier] > lowest) return { type: cost <= s.bank - plan.cost + (plan.avg[planned.at(-1)] || 0) ? "buy" : "pass" };
  return { type: g.draft.rolls >= 45 && TIER_VALUE[f.tier] >= lowest - 1 ? "buy" : "pass" };
}
export function publicGame(g, actor) {
  const copy = structuredClone(g);
  copy.seats.forEach((s) => delete s.token);
  if (copy.match && g.phase === "match") copy.match.rolls = copy.match.rolls.map((v, i) => (i === actor ? v : null));
  return copy;
}
