// Party play when the game is opened as a Claude artifact link.
// Mirrors the /api/room server protocol (create / join / action / poll) but keeps
// each party as one document in the artifact's shared database. Every write is
// made under a short cooperative lease and a version check, so two captains
// acting at the same moment can never both apply a move.
import { createGame, makeSeat, act, aiAction, publicGame } from "./game.mjs";

type Result = { ok: boolean; status: number; data: any };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const holder = `tab-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let dbPromise: Promise<any> | null = null;

export function claudeHosted() {
  return typeof window !== "undefined" && typeof (window as any).claude?.use === "function";
}

async function database() {
  if (!dbPromise) dbPromise = (window as any).claude.use("db");
  const db = await dbPromise;
  if (!db) throw Object.assign(new Error("Online parties need you to be signed in to Claude with edit access to this game."), { status: 503 });
  return db;
}

const ref = (db: any, code: string) => db.doc(`parties/${code}`);

async function load(doc: any) {
  const snap = await doc.get();
  if (!snap.exists) return null;
  const body = snap.data();
  return { game: JSON.parse(body.state), version: Number(body.version) || 0, updated: Number(body.updated) || 0 };
}

async function save(doc: any, game: any) {
  await doc.set({ state: JSON.stringify(game), version: game.version || 0, updated: Date.now(), phase: game.phase });
}

async function withLease<T>(doc: any, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 14; attempt++) {
    const lease = await doc.acquire({ holder, ttlMs: 1500 });
    if (lease.acquired) return fn();
    await sleep(200 + Math.random() * 300);
  }
  throw Object.assign(new Error("Another captain acted at the same moment. Please try again."), { status: 409 });
}

function fail(message: string, status = 400): Result {
  return { ok: false, status, data: { error: message } };
}

export async function claudeRoom(body: any): Promise<Result> {
  try {
    const db = await database();
    if (body.op === "create") {
      if (typeof body.name !== "string" || !body.name.trim()) return fail("Enter your captain name.");
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
      const token = crypto.randomUUID();
      const captain: any = makeSeat(body.name, body.team, token, false, body.avatar);
      captain.captainId = body.captainId;
      const game = createGame(body.settings, captain);
      await save(ref(db, code), game);
      return { ok: true, status: 200, data: { code, token, seat: 0, game: publicGame(game, 0) } };
    }
    const code = String(body.code || "")
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, "");
    if (code.length !== 8) return fail("Enter an 8-character party code.");
    const doc = ref(db, code);

    if (body.op === "poll") {
      const row = await load(doc);
      if (!row || Date.now() - row.updated > 86400000) return fail("Party not found or expired. Ask the host for a new code.", 404);
      let game = row.game;
      const seat = game.seats.findIndex((s: any) => s.token === body.token);
      if (seat === -1) return fail("Rejoin this party to take a seat.", 403);
      // any seated captain may tick AI / autoplay turns, guarded by the lease + version
      if (aiAction(game)) {
        game = await withLease(doc, async () => {
          const fresh = await load(doc);
          if (!fresh) return game;
          const next = aiAction(fresh.game);
          if (!next || fresh.version !== row.version) return fresh.game;
          const moved = act(fresh.game, next.actor, next.action);
          await save(doc, moved);
          return moved;
        }).catch(() => game);
      }
      return { ok: true, status: 200, data: { code, token: body.token, seat, game: publicGame(game, seat) } };
    }

    return await withLease(doc, async () => {
      const row = await load(doc);
      if (!row || Date.now() - row.updated > 86400000) return fail("Party not found or expired. Ask the host for a new code.", 404);
      let game = row.game,
        token = body.token,
        seat = game.seats.findIndex((s: any) => s.token === token);
      if (body.op === "join" && seat === -1) {
        if (typeof body.name !== "string" || !body.name.trim()) return fail("Enter your captain name.");
        if (game.phase !== "lobby") return fail("This match has already started.");
        if (game.seats.length >= game.settings.capacity) return fail("This party is full.");
        if (body.captainId && game.seats.some((s: any) => s.captainId === body.captainId))
          return fail("This captain already has a seat. Use another browser profile for a second captain.");
        token = crypto.randomUUID();
        seat = game.seats.length;
        // keep the two sides visually distinct: take a free franchise if this one is taken
        let team = Number(body.team) || 0;
        if (game.seats.some((s: any) => s.team === team))
          team = [1, 0, 2, 3, 4, 5, 6, 7, 8, 9].find((t) => !game.seats.some((s: any) => s.team === t)) ?? team;
        const captain: any = makeSeat(body.name, team, token, false, body.avatar);
        captain.captainId = body.captainId;
        game.seats.push(captain);
        game.version = (game.version || 0) + 1;
      } else if (seat === -1) return fail("Rejoin this party to take a seat.", 403);
      else if (body.op === "action") {
        if (body.version !== row.version)
          return { ok: false, status: 409, data: { game: publicGame(game, seat), seat, code, token, conflict: true } };
        game = act(game, seat, body.action);
      } else if (body.op !== "join") return fail("Unknown party action.");
      if (game.version !== row.version) await save(doc, game);
      return { ok: true, status: 200, data: { code, token, seat, game: publicGame(game, seat) } };
    });
  } catch (e: any) {
    const status = e?.status || (e?.code === "invalid_argument" ? 403 : 400);
    const message =
      e?.code === "invalid_argument"
        ? "You can watch, but only captains with edit access to this game can play online. Ask the owner to invite you as an editor."
        : e?.message || "Could not reach the party. Please try again.";
    return fail(message, status === 403 ? 401 : status);
  }
}
