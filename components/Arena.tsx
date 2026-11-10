import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  CircleDot,
  Copy,
  Crown,
  Dices,
  Gavel,
  HelpCircle,
  Search,
  PhoneCall,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  PLAYERS,
  TEAMS,
  TIERS,
  TIER_ORDER,
  AVATARS,
  player,
  money,
  price,
  bidAmount,
  squadAdvice,
  arrangedSquad,
  bowlingOptions,
  bowlerLimit,
  upcomingLots,
  scoutList,
  scoutLimit,
  MONOPOLY_WICKETS,
} from "../lib/game.mjs";
import Stadium from "./Stadium";

const ROLE: Record<string, string> = { BAT: "Batter", BOWL: "Bowler", AR: "All-rounder", WK: "Wicketkeeper" };
const css = (o: Record<string, any>) => o as React.CSSProperties;
const teamColor = (game: any, seat: number) => TEAMS[game.seats[seat].team].color;
const oversText = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

/* ───────────────────────── shared bits ───────────────────────── */

export function TierTag({ tier, size = "" }: { tier: string; size?: string }) {
  const t = TIERS[tier] || TIERS.gray;
  return (
    <span className={`ar-tag ar-tag-${tier} ${size}`} style={css({ "--tier": t.color })} title={`${t.name} tier`}>
      <i>{t.icon || "◆"}</i>
      {t.tag || t.name.toUpperCase()}
    </span>
  );
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// which way to turn the cube so a face points at the viewer
const FACE_TURN: Record<number, [number, number]> = { 1: [0, 0], 2: [90, 0], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 6: [0, 180] };
/** A real six-faced cube: spins while rolling, then tumbles on to the rolled face. */
export function ArDie({
  value,
  rolling = false,
  size = 46,
  tint = "",
  nonce = "",
}: {
  value: number | null;
  rolling?: boolean;
  size?: number;
  tint?: string;
  nonce?: string | number;
}) {
  const v = value || 0;
  const [rx, ry] = FACE_TURN[v || 1];
  return (
    <div
      className={`ar-die ${rolling ? "is-rolling" : v ? "is-set" : "is-blank"}`}
      style={css({ ...(size ? { "--size": `${size}px` } : {}), "--tint": tint || "#f3f5e6", "--rx": `${rx}deg`, "--ry": `${ry}deg` })}
      role="img"
      aria-label={rolling ? "Die rolling" : v ? `Die shows ${v}` : "Die not rolled"}
    >
      <div className="ar-cube" key={rolling ? "roll" : `${v}-${nonce}`}>
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div key={f} className={`ar-cube-face f${f}`}>
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} className={PIPS[f].includes(i) ? "on" : ""} />
            ))}
          </div>
        ))}
      </div>
      <span className="ar-die-shadow" />
    </div>
  );
}

/** Counts a number up or down to its new value. */
export function Count({ value, ms = 450 }: { value: number; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current,
      diff = value - start;
    if (!diff) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const cur = Math.round(start + diff * eased);
      from.current = cur;
      setShown(cur);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}
export function useDelayed<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!ms) {
      setShown(value);
      return;
    }
    const t = setTimeout(() => setShown(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return ms ? shown : value;
}
const fmtMod = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;
/** When the replay shows the outcome of a ball (ms after it resolves). Mirrors the stadium timeline. */
export function revealMs(last: any) {
  if (!last) return 0;
  if (last.out) return last.shot === "Bowled" ? 1400 : last.shot === "LBW" ? 1600 : 2250;
  return last.runs === 6 ? 2300 : last.runs === 4 ? 2050 : 1550;
}

function Face({ id, className = "" }: { id: number; className?: string }) {
  const p = player(id);
  return (
    <span className={`ar-face ${className}`} style={css({ "--tier": TIERS[p.tier].color })}>
      <img src={p.photo} alt="" loading="lazy" />
    </span>
  );
}

function SeatChip({ game, seat, i, mode }: { game: any; seat: number; i: number; mode: "auction" | "draft" | "monopoly" }) {
  const s = game.seats[i],
    t = TEAMS[s.team],
    size = game.settings.squadSize;
  const active = game.active === i && game.phase !== "match";
  return (
    <div className={`ar-seat ${active ? "is-active" : ""} ${i === seat ? "is-you" : ""}`} style={css({ "--team": t.color })}>
      <span className="ar-seat-badge">{AVATARS[s.avatar ?? 0]}</span>
      <div className="ar-seat-id">
        <strong>
          {s.name}
          {i === seat && <em>YOU</em>}
          {s.ai && <em className="ai">CPU</em>}
        </strong>
        <span>
          <b style={{ color: t.color }}>{t.short}</b>
          {mode === "monopoly" ? (
            <>
              {" "}
              · {s.balls}/{game.settings.overs * 6} rolls · {s.wickets} W
            </>
          ) : (
            <span className="ar-pips" aria-label={`${s.squad.length} of ${size} signed`}>
              {Array.from({ length: size }, (_, k) => (
                <i key={k} className={k < s.squad.length ? "on" : ""} />
              ))}
            </span>
          )}
        </span>
      </div>
      <div className="ar-seat-num">
        {mode === "monopoly" ? (
          <>
            <strong>
              {s.score}
              <small> R</small>
            </strong>
            <span>{money(s.bank)}</span>
          </>
        ) : (
          <>
            <strong>{money(s.bank)}</strong>
            <span>PURSE</span>
          </>
        )}
      </div>
      {active && <span className="ar-seat-turn">{i === seat ? "YOUR TURN" : "DECIDING"}</span>}
    </div>
  );
}

/* ───────────────────────── head bar ───────────────────────── */

export function ArenaHead({
  game,
  party,
  onHome,
  onRules,
  onCopy,
  extra,
  tickerDelay = 0,
}: {
  game: any;
  party: any;
  onHome: () => void;
  onRules: () => void;
  onCopy: () => void;
  extra?: React.ReactNode;
  tickerDelay?: number;
}) {
  const title =
    game.phase === "auction"
      ? "Live Auction"
      : game.phase === "draft"
        ? "Roll & Recruit"
        : game.phase === "monopoly"
          ? "Cricket Monopoly"
          : game.phase === "toss"
            ? "The Toss"
            : game.phase === "results"
              ? "Full Time"
            : game.match?.innings === 1
              ? "The Chase"
              : "First Innings";
  const latest = useDelayed(game.log?.[0], tickerDelay);
  return (
    <header className="ar-head">
      <button className="ar-home" onClick={onHome} aria-label="Back to home">
        <ChevronLeft size={15} />
        <span>Home</span>
      </button>
      <div className="ar-title">
        <span className="ar-title-dot" />
        <h1>{title}</h1>
        <span className="ar-format">
          {game.settings.overs} OV · {game.settings.mode === "monopoly" ? `${game.settings.capacity} CAPTAINS` : `${game.settings.squadSize}-A-SIDE`}
        </span>
      </div>
      <div className="ar-ticker" aria-live="polite">
        {latest && (
          <p key={latest.id}>
            <b>LIVE</b>
            {latest.text}
          </p>
        )}
      </div>
      <div className="ar-head-tools">
        {party ? (
          <button className="ar-code" onClick={onCopy} title="Copy party code">
            {party.code} <Copy size={12} />
          </button>
        ) : (
          <span className="ar-solo">
            <Sparkles size={11} /> SOLO
          </span>
        )}
        {extra}
        <button className="ar-icon" onClick={onRules} aria-label="Rules">
          <BookOpen size={16} />
        </button>
      </div>
    </header>
  );
}

/* ───────────────────────── auction ───────────────────────── */

function setInfo(game: any, id: number) {
  const a = game.auction,
    tier = player(id).tier;
  const inSet = a.pool.filter((x: number) => player(x).tier === tier);
  const done = a.pool.slice(0, a.cursor).filter((x: number) => player(x).tier === tier).length;
  return { tier, total: inSet.length, index: done };
}

export function Ledger({ game, seat, onBuy }: { game: any; seat: number; onBuy?: (id: number) => void }) {
  const [filter, setFilter] = useState("all");
  const a = game.auction;
  const rows: any[] = useMemo(() => {
    if (Array.isArray(a.results)) return [...a.results].reverse();
    // older party servers do not keep a ledger: rebuild what we can from the squads
    return game.seats
      .flatMap((s: any, i: number) => s.squad.map((id: number) => ({ id, status: "sold", seat: i, amount: null })))
      .map((r: any, k: number) => ({ ...r, lot: k + 1 }));
  }, [a.results, game.seats]);
  const counts = {
    sold: rows.filter((r) => r.status === "sold").length,
    unsold: rows.filter((r) => r.status === "unsold").length,
    auto: rows.filter((r) => r.status === "auto").length,
  };
  const ownedIds = new Set(game.seats.flatMap((x: any) => x.squad));
  const remaining = a.pool.slice(a.cursor).filter((x: number) => !ownedIds.has(x)).length;
  const stillUnsold = new Set(a.unsold || []);
  const visible = rows.filter((r) =>
    filter === "all" ? true : filter === "mine" ? r.seat === seat : filter === "sold" ? r.status !== "unsold" : r.status === filter,
  );
  const live = player(a.id);
  return (
    <section className="ar-ledger" aria-label="Auction tracker">
      <header>
        <h3>
          <Gavel size={13} /> Auction tracker
        </h3>
        <div className="ar-ledger-stats">
          <span className="s-sold">
            <b>{counts.sold + counts.auto}</b> sold
          </span>
          <span className="s-unsold">
            <b>{counts.unsold}</b> unsold
          </span>
          <span>
            <b>{remaining}</b> to come
          </span>
        </div>
        <div className="ar-ledger-filter" role="tablist">
          {[
            ["all", "All"],
            ["sold", "Sold"],
            ["unsold", "Unsold"],
            ["mine", "My buys"],
          ].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
      </header>
      <div className="ar-ledger-scroll">
        <table>
          <thead>
            <tr>
              <th>LOT</th>
              <th>PLAYER</th>
              <th>TAG</th>
              <th className="hide-sm">ROLE</th>
              <th className="hide-sm num">BASE</th>
              <th>STATUS</th>
              <th>TEAM</th>
              <th className="num">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {(filter === "all" || filter === "sold") && (
              <tr className="row-live">
                <td>{String(a.lots ?? a.cursor).padStart(3, "0")}</td>
                <td>
                  <span className="ar-ledger-player">
                    <Face id={live.id} />
                    {live.name}
                  </span>
                </td>
                <td>
                  <TierTag tier={live.tier} size="xs" />
                </td>
                <td className="hide-sm">{live.role}</td>
                <td className="hide-sm num">{money(price(live, game.settings))}</td>
                <td>
                  <span className="ar-status st-live">
                    <i /> ON THE BLOCK
                  </span>
                </td>
                <td>
                  {a.leader !== null ? (
                    <span className="ar-team-dot" style={css({ "--team": teamColor(game, a.leader) })}>
                      {TEAMS[game.seats[a.leader].team].short}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="num">{a.bid ? money(a.bid) : <span className="muted">—</span>}</td>
              </tr>
            )}
            {visible.map((r) => {
              const p = player(r.id);
              return (
                <tr key={`${r.lot}-${r.id}`} className={`row-${r.status} ${r.seat === seat ? "row-mine" : ""}`}>
                  <td>{String(r.lot).padStart(3, "0")}</td>
                  <td>
                    <span className="ar-ledger-player">
                      <Face id={r.id} />
                      {p.name}
                    </span>
                  </td>
                  <td>
                    <TierTag tier={p.tier} size="xs" />
                  </td>
                  <td className="hide-sm">{p.role}</td>
                  <td className="hide-sm num">{money(price(p, game.settings))}</td>
                  <td>
                    <span className={`ar-status st-${r.status}`}>{r.status === "auto" ? "AUTO-FILL" : r.direct ? "SIGNED" : r.status.toUpperCase()}</span>
                  </td>
                  <td>
                    {r.seat !== null && r.seat !== undefined ? (
                      <span className="ar-team-dot" style={css({ "--team": teamColor(game, r.seat) })}>
                        {TEAMS[game.seats[r.seat].team].short}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">
                    {r.status === "unsold" && stillUnsold.has(r.id) && onBuy && price(p, game.settings) <= game.seats[seat].bank ? (
                      <button className="ar-buy-now" onClick={() => onBuy(r.id)}>
                        Sign {money(price(p, game.settings))}
                      </button>
                    ) : r.amount ? (
                      money(r.amount)
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!visible.length && filter !== "all" && filter !== "sold" && (
              <tr>
                <td colSpan={8} className="ar-ledger-empty">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoutModal({ game, seat, busy, onAction, onClose }: { game: any; seat: number; busy: boolean; onAction: (t: string, x?: any) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("all");
  const [role, setRole] = useState("all");
  const [reach, setReach] = useState(true);
  const my = game.seats[seat];
  const callsLeft = scoutLimit(game.settings) - (my.scouts || 0);
  const full = my.squad.length >= game.settings.squadSize;
  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    return scoutList(game)
      .map((r: any) => ({ ...r, p: player(r.id), cost: price(player(r.id), game.settings) }))
      .filter(
        (r: any) =>
          (!text || r.p.name.toLowerCase().includes(text) || r.p.country.toLowerCase().includes(text)) &&
          (tier === "all" || (tier === "unsold" ? r.status === "unsold" : r.p.tier === tier)) &&
          (role === "all" || r.p.role === role) &&
          (!reach || r.cost <= my.bank),
      )
      .sort((x: any, y: any) => (x.status === y.status ? y.p.rating - x.p.rating : x.status === "unsold" ? -1 : 1));
  }, [game, q, tier, role, reach]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  return (
    <div className="ar-scout-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="ar-scout" role="dialog" aria-modal="true" aria-label="Find a player">
        <header>
          <div>
            <h3>Find a player</h3>
            <p>
              Sign <b>unsold</b> players straight away at base price, or <b>call up</b> anyone still waiting so they are auctioned next.
            </p>
          </div>
          <div className="ar-scout-wallet">
            <span>
              PURSE <b>{money(my.bank)}</b>
            </span>
            <span>
              CALL-UPS <b>{Math.max(0, callsLeft)}</b>
            </span>
          </div>
          <button className="ar-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="ar-scout-tools">
          <label className="ar-scout-search">
            <Search size={15} />
            <input id="scout-search" autoFocus placeholder="Search by name or country" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select aria-label="Filter by tag" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">All tags</option>
            <option value="unsold">Unsold only</option>
            {TIER_ORDER.map((t: string) => (
              <option key={t} value={t}>
                {TIERS[t].tag}
              </option>
            ))}
          </select>
          <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>
            {Object.entries(ROLE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="ar-scout-check">
            <input id="scout-reach" type="checkbox" checked={reach} onChange={(e) => setReach(e.target.checked)} /> Within my purse
          </label>
        </div>
        <div className="ar-scout-list">
          {rows.map((r: any) => (
            <div key={r.id} className={`ar-scout-row ${r.status}`}>
              <Face id={r.id} />
              <div className="ar-scout-name">
                <strong>{r.p.name}</strong>
                <small>
                  {ROLE[r.p.role]} · BAT {r.p.bat} · BOWL {r.p.bowl}
                </small>
              </div>
              <TierTag tier={r.p.tier} size="xs" />
              <b className="ar-scout-price">{money(r.cost)}</b>
              {r.status === "unsold" ? (
                <button className="ar-btn ar-btn-primary" disabled={busy || full || r.cost > my.bank} onClick={() => onAction("buyUnsold", { id: r.id })}>
                  Sign now
                </button>
              ) : r.called ? (
                <span className="ar-scout-called">
                  <PhoneCall size={12} /> Coming up
                </span>
              ) : (
                <button className="ar-btn ar-btn-ghost" disabled={busy || full || callsLeft <= 0 || r.cost > my.bank} onClick={() => onAction("callUp", { id: r.id })}>
                  Call up
                </button>
              )}
            </div>
          ))}
          {!rows.length && <p className="ar-muted">No players match. Try clearing a filter.</p>}
        </div>
      </section>
    </div>
  );
}

function AuctionPopup({ popup, game }: { popup: any; game: any }) {
  if (!popup) return null;
  const p = player(popup.player);
  const sold = popup.kind === "sold";
  const s = sold ? game.seats[popup.seat] : null;
  return (
    <div className={`ar-popup ${sold ? "is-sold" : "is-unsold"}`} key={popup.key} style={css({ "--team": s ? TEAMS[s.team].color : "#8e9890" })}>
      <div className="ar-popup-card">
        <div className="ar-popup-photo">
          <img src={p.photo} alt="" />
        </div>
        <div className="ar-popup-text">
          <span className="ar-stamp">{sold ? "SOLD!" : "UNSOLD"}</span>
          <strong>{p.name}</strong>
          {sold ? (
            <p>
              <span className="ar-team-dot" style={css({ "--team": TEAMS[s.team].color })}>
                {TEAMS[s.team].short}
              </span>
              {s.name} · <b>{money(popup.amount)}</b>
            </p>
          ) : (
            <p>No bids at {money(popup.amount ?? price(p, game.settings))}. Moving on.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuctionArena({
  game,
  seat,
  busy,
  popup,
  onAction,
  onComplete,
}: {
  game: any;
  seat: number;
  busy: boolean;
  popup: any;
  onAction: (type: string, extra?: any) => void;
  onComplete: () => void;
}) {
  const a = game.auction,
    p = player(a.id),
    tier = TIERS[p.tier],
    my = game.seats[seat],
    isTurn = game.active === seat,
    current = game.seats[game.active];
  const next = upcomingLots(game, 1)[0];
  const info = setInfo(game, a.id);
  const locked = !isTurn || busy || !!popup;
  const advice = squadAdvice(game, seat);
  const thought = game.lastAuctionDecision && game.seats[game.lastAuctionDecision.seat]?.ai ? game.lastAuctionDecision : null;
  const owned = new Set(game.seats.flatMap((x: any) => x.squad));
  const waiting = a.pool.slice(a.cursor).filter((x: number) => !owned.has(x));
  const sets = TIER_ORDER.map((t: string) => ({
    t,
    left: waiting.filter((x: number) => player(x).tier === t).length + (p.tier === t ? 1 : 0),
    live: t === p.tier,
  }));
  const [scout, setScout] = useState(false);
  const callsLeft = scoutLimit(game.settings) - (my.scouts || 0);
  const canScout = my.squad.length < game.settings.squadSize;
  const unsoldCount = (a.unsold || []).length;
  return (
    <div className="ar-auction">
      <div className="ar-strip">
        {game.seats.map((_: any, i: number) => (
          <SeatChip key={i} game={game} seat={seat} i={i} mode="auction" />
        ))}
        <div className="ar-next" style={css({ "--tier": next ? TIERS[player(next).tier].color : "#556" })}>
          <span className="ar-next-label">UP NEXT</span>
          {next ? (
            <>
              <Face id={next} />
              <div>
                <strong>{player(next).name}</strong>
                <span>
                  <TierTag tier={player(next).tier} size="xs" /> {ROLE[player(next).role]} · {money(price(player(next), game.settings))}
                </span>
              </div>
            </>
          ) : (
            <div>
              <strong>Final lot</strong>
              <span>Last player in the pool</span>
            </div>
          )}
        </div>
      </div>

      <div className="ar-auction-main">
        <div className={`ar-stage tier-${p.tier}`} style={css({ "--tier": tier.color })}>
          <div className="ar-stage-top">
            <span className="ar-live">
              <i /> LOT {String(a.lots ?? a.cursor).padStart(3, "0")} · {waiting.length} TO COME
            </span>
            <div className="ar-sets" aria-label="Players left in the pool by tag">
              {sets.map((x: any) => (
                <span key={x.t} className={`ar-set ${x.live ? "is-live" : x.left ? "" : "is-done"}`} style={css({ "--tier": TIERS[x.t].color })}>
                  {TIERS[x.t].tag}
                  <small>{x.left}</small>
                </span>
              ))}
            </div>
          </div>
          <div className="ar-stage-body" key={a.id}>
            <div className="ar-stage-photo">
              <span className="ar-stage-rating">{p.rating}</span>
              <div className="ar-stage-rings" />
              <img src={p.photo} alt={p.name} />
            </div>
            <div className="ar-stage-info">
              <TierTag tier={p.tier} size="lg" />
              <h2>{p.name}</h2>
              <p>
                {p.country} · {ROLE[p.role]}
              </p>
              <div className="ar-meters">
                {(["bat", "bowl"] as const).map((k) => (
                  <div key={k}>
                    <span>
                      {k === "bat" ? "BAT" : "BOWL"} <b>{p[k]}</b>
                    </span>
                    <div className="ar-meter">
                      <i style={{ width: `${p[k]}%` }} />
                    </div>
                    <TierPill tier={k === "bat" ? p.batTier : p.bowlTier} kind={k} />
                  </div>
                ))}
              </div>
              <div className="ar-base">
                <span>BASE PRICE</span>
                <strong>{money(price(p, game.settings))}</strong>
              </div>
            </div>
          </div>
          <AuctionPopup popup={popup} game={game} />
        </div>

        <aside className="ar-panel">
          <div className={`ar-bid ${a.leader !== null ? "has-leader" : ""}`} style={css({ "--team": a.leader !== null ? teamColor(game, a.leader) : "#c9f66b" })}>
            <span>{a.leader === null ? "OPENING PRICE" : "HIGHEST BID"}</span>
            <strong key={a.bid}>{money(a.bid || price(p, game.settings))}</strong>
            <em>
              {a.leader === null ? (
                <>
                  <Gavel size={12} /> Waiting for the first bid
                </>
              ) : (
                <>
                  <i /> {game.seats[a.leader].name} {a.leader === seat ? "(you) lead" : "leads"}
                </>
              )}
            </em>
          </div>
          <div className={`ar-turn ${isTurn && !popup ? "is-you" : ""}`}>
            {popup ? (
              <>Next lot coming up…</>
            ) : isTurn ? (
              <>
                <span className="live-dot" /> Your call, captain.
              </>
            ) : (
              <>
                <Loader2 size={13} className="spin" /> {current?.name} is deciding…
              </>
            )}
          </div>
          <div className="ar-actions">
            <button className="ar-btn ar-btn-primary" disabled={locked || bidAmount(game) > my.bank} onClick={() => onAction("bid")}>
              <Gavel size={17} /> Bid {money(bidAmount(game))}
              <ArrowUpRight size={16} />
            </button>
            <button className="ar-btn ar-btn-ghost" disabled={locked} onClick={() => onAction("pass")}>
              {a.leader === null ? "Pass" : "Drop out"} <X size={15} />
            </button>
          </div>
          <button className="ar-scout-btn" disabled={!canScout} onClick={() => setScout(true)}>
            <Search size={15} />
            <span>
              Find a player
              <small>
                {unsoldCount ? `${unsoldCount} unsold to sign now · ` : ""}
                {callsLeft} call-up{callsLeft === 1 ? "" : "s"} left
              </small>
            </span>
            <ArrowRight size={15} />
          </button>
          <div className="ar-panel-scroll">
            {thought && (
              <div className="ar-thought">
                <Sparkles size={13} />
                <p>
                  <b>
                    {game.seats[thought.seat].name} {thought.kind === "pass" ? "skipped" : "bid on"} {player(thought.player).name}
                  </b>
                  {thought.reason}.
                </p>
              </div>
            )}
            <div className="ar-needs">
              <h4>
                <Shield size={11} /> SQUAD NEEDS
              </h4>
              <div>
                <span className={advice.batters >= advice.batTarget ? "ok" : ""}>
                  BAT {advice.batters}/{advice.batTarget}
                </span>
                <span className={advice.bowlers >= advice.bowlTarget ? "ok" : ""}>
                  BOWL {advice.bowlers}/{advice.bowlTarget}
                </span>
              </div>
            </div>
            <div className="ar-mysquad">
              <h4>
                YOUR SQUAD{" "}
                <span>
                  {my.squad.length}/{game.settings.squadSize}
                </span>
              </h4>
              {my.squad.length ? (
                my.squad.map((id: number) => (
                  <div key={id} className="ar-mysquad-row">
                    <Face id={id} />
                    <span>
                      {player(id).name}
                      <small>{ROLE[player(id).role]}</small>
                    </span>
                    <TierTag tier={player(id).tier} size="xs" />
                  </div>
                ))
              ) : (
                <p className="ar-muted">Your first signing will appear here.</p>
              )}
            </div>
            {a.withdrawn > 0 && (
              <p className="ar-muted small">
                {a.withdrawn} player{a.withdrawn === 1 ? "" : "s"} priced above every remaining purse {a.withdrawn === 1 ? "was" : "were"} withdrawn.
              </p>
            )}
            {seat === 0 && (
              <button className="ar-link" onClick={onComplete}>
                <Zap size={12} /> Quick-complete squads
              </button>
            )}
          </div>
        </aside>
      </div>

      <Ledger game={game} seat={seat} onBuy={canScout && !busy ? (id: number) => onAction("buyUnsold", { id }) : undefined} />
      {scout && <ScoutModal game={game} seat={seat} busy={busy} onAction={onAction} onClose={() => setScout(false)} />}
    </div>
  );
}

function TierPill({ tier, kind }: { tier: string; kind: "bat" | "bowl" }) {
  const mod = TIERS[tier][kind];
  return (
    <span className="ar-mod" style={css({ "--tier": TIERS[tier].color })} title={`${TIERS[tier].name} ${kind === "bat" ? "batting" : "bowling"} bonus`}>
      {mod >= 0 ? "+" : "−"}
      {Math.abs(mod)}
    </span>
  );
}

/* ───────────────────────── board (draft + monopoly) ───────────────────────── */

function tileXY(i: number, length: number) {
  const n = length === 32 ? 9 : 7,
    edge = n - 1;
  if (i < n) return { x: i, y: 0, n };
  if (i <= edge * 2) return { x: edge, y: i - edge, n };
  if (i <= edge * 3) return { x: edge * 3 - i, y: edge, n };
  return { x: 0, y: edge * 4 - i, n };
}

/**
 * Board movement: when a captain's position changes, roll the dice for ~0.75s,
 * then walk the token one tile at a time. `busy` is true while anything is
 * animating so the page can hold AI turns and the panel can wait for the landing.
 */
const ROLL_MS = 750,
  STEP_MS = 260;
function useBoardMotion(positions: number[], length: number, onStep?: () => void) {
  const [shown, setShown] = useState<number[]>(positions);
  const [phase, setPhase] = useState<"idle" | "rolling" | "moving">("idle");
  const [mover, setMover] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [left, setLeft] = useState(0);
  const shownRef = useRef<number[]>(positions);
  const key = positions.join(",");
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  useEffect(() => {
    const changed = positions.map((p, i) => (p !== shownRef.current[i] ? i : -1)).filter((i) => i >= 0);
    if (!changed.length) return;
    let cancelled = false;
    const timers: any[] = [];
    const run = async () => {
      for (const seat of changed) {
        if (cancelled) return;
        const from = shownRef.current[seat] ?? positions[seat];
        const steps = (positions[seat] - from + length) % length;
        setMover(seat);
        setPath([from]);
        setLeft(steps);
        setPhase("rolling");
        await new Promise((r) => timers.push(setTimeout(r, ROLL_MS)));
        setPhase("moving");
        for (let k = 1; k <= steps; k++) {
          if (cancelled) return;
          await new Promise((r) => timers.push(setTimeout(r, STEP_MS)));
          const pos = (from + k) % length;
          shownRef.current = shownRef.current.map((v, i) => (i === seat ? pos : v));
          setShown(shownRef.current);
          setPath((p) => [...p, pos]);
          setLeft(steps - k);
          stepRef.current?.();
        }
        await new Promise((r) => timers.push(setTimeout(r, 180)));
      }
      if (!cancelled) {
        setPhase("idle");
        setMover(null);
      }
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      // jump straight to the latest positions if a new move interrupts this one
      shownRef.current = shownRef.current.map((v, i) => (changed.includes(i) ? positions[i] : v));
      setShown(shownRef.current);
    };
  }, [key, length]);
  return { shown, phase, mover, path, left, busy: phase !== "idle" };
}

function TumbleDice({ values, rolling }: { values: number[]; rolling: boolean; size?: number }) {
  return (
    <div className={`ar-tray-dice ${rolling ? "is-rolling" : "is-landed"}`}>
      {values.map((v, i) => (
        <div key={i} className="ar-tray-die" style={css({ "--d": `${i * 0.09}s` })}>
          <ArDie value={v} rolling={rolling} size={0} nonce={values.join("")} />
        </div>
      ))}
    </div>
  );
}

export function BoardArena({
  game,
  seat,
  busy,
  onAction,
  onComplete,
  onMotion,
  onStep,
}: {
  game: any;
  seat: number;
  busy: boolean;
  rolling?: boolean;
  onAction: (type: string, extra?: any) => void;
  onComplete: () => void;
  onMotion?: (moving: boolean) => void;
  onStep?: () => void;
}) {
  const draft = game.phase === "draft";
  const isTurn = game.active === seat,
    current = game.seats[game.active],
    my = game.seats[seat];
  const len = game.board.length;
  const motion = useBoardMotion(
    game.seats.map((s: any) => s.position),
    len,
    onStep,
  );
  useEffect(() => {
    onMotion?.(motion.busy);
  }, [motion.busy]);
  useEffect(() => () => onMotion?.(false), []);
  const moving = motion.busy;
  const pending = game.pending && !moving ? player(game.board[game.pending.index].id) : null;
  const moverSeat = motion.mover !== null ? game.seats[motion.mover] : null;
  const pathSet = new Set(motion.path);
  const here = motion.mover !== null ? motion.shown[motion.mover] : null;
  const latest = game.log?.[0]?.text || "";
  const dice = game.lastDice || [1, 1];
  const canRoll = isTurn && !game.pending && !busy && !moving;
  const status = moving
    ? motion.phase === "rolling"
      ? `${moverSeat?.name} is rolling…`
      : `${moverSeat?.name} moves ${motion.left ? `· ${motion.left} to go` : "· landed"}`
    : latest;
  const boardSize = len === 32 ? 9 : 7;
  return (
    <div className="ar-boardgame">
      <div className="ar-strip">
        {game.seats.map((_: any, i: number) => (
          <SeatChip key={i} game={game} seat={seat} i={i} mode={draft ? "draft" : "monopoly"} />
        ))}
      </div>
      <div className="ar-board-main">
        <div className="ar-board-box">
          <div className={`ar-board ${moving ? "is-moving" : ""}`} style={css({ "--n": boardSize })}>
            {game.board.map((tile: any, i: number) => {
              const { x, y } = tileXY(i, len);
              const p = tile.kind === "player" ? player(tile.id) : null;
              const owner = tile.owner !== null && tile.owner !== undefined ? game.seats[tile.owner] : null;
              const onPath = moving && pathSet.has(i);
              return (
                <div
                  key={`${i}-${tile.id}`}
                  className={`ar-tile ${p ? "is-player" : `is-event ev-${tile.kind}`} ${game.pending?.index === i && !moving ? "is-landed" : ""} ${owner ? "is-owned" : ""} ${onPath ? "is-path" : ""} ${here === i && moving ? "is-here" : ""}`}
                  style={css({
                    gridColumn: x + 1,
                    gridRow: y + 1,
                    "--tile": owner ? TEAMS[owner.team].color : p ? TIERS[p.tier].color : "#c9f66b",
                    "--mover": moverSeat ? TEAMS[moverSeat.team].color : "#c9f66b",
                  })}
                >
                  {p ? (
                    <>
                      <img src={p.photo} alt="" loading="lazy" />
                      <span className="ar-tile-name">{p.name.split(" ").slice(-1)[0]}</span>
                      <b>{owner ? TEAMS[owner.team].short : money(price(p, game.settings)).replace(" Cr", "")}</b>
                    </>
                  ) : (
                    <>
                      <strong>{tile.kind === "out" ? "W" : tile.kind === "bonus" ? "×2" : tile.kind === "start" ? "GO" : "+1"}</strong>
                      <span className="ar-tile-name">{tile.label}</span>
                    </>
                  )}
                </div>
              );
            })}

            <div className="ar-board-center">
              <div className="ar-center-top">
                <span className="ar-board-eyebrow">{draft ? "ROLL & RECRUIT" : "CRICKET MONOPOLY"}</span>
                <span className="ar-board-turn" style={css({ "--team": teamColor(game, moving && motion.mover !== null ? motion.mover : game.active) })}>
                  <i>{AVATARS[(moving && moverSeat ? moverSeat : current).avatar ?? 0]}</i>
                  {moving ? moverSeat?.name : isTurn ? "Your turn" : `${current.name}’s turn`}
                </span>
              </div>

              <div className={`ar-tray ${motion.phase}`}>
                <TumbleDice values={dice} rolling={motion.phase === "rolling"} size={0} />
                <div className="ar-tray-sum" key={`${dice.join("-")}-${motion.phase}`}>
                  {motion.phase === "rolling" ? "?" : dice[0] + dice[1]}
                  <small>{motion.phase === "moving" ? `${motion.left} left` : "SPACES"}</small>
                </div>
              </div>

              <p className="ar-center-status" key={status}>
                {status}
              </p>

              {pending ? (
                <div className="ar-center-offer" style={css({ "--tier": TIERS[pending.tier].color })}>
                  <img src={pending.photo} alt="" />
                  <div>
                    <TierTag tier={pending.tier} size="xs" />
                    <strong>{pending.name}</strong>
                    <small>
                      {ROLE[pending.role]} · {money(price(pending, game.settings))}
                    </small>
                  </div>
                  {isTurn && (
                    <div className="ar-center-offer-actions">
                      <button className="ar-btn ar-btn-primary" disabled={busy} onClick={() => onAction("buy")}>
                        Sign
                      </button>
                      <button className="ar-btn ar-btn-ghost" disabled={busy} onClick={() => onAction("pass")}>
                        Pass
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button className="ar-center-roll" disabled={!canRoll} onClick={() => onAction("roll")}>
                  <Dices size={20} />
                  {moving ? "Moving…" : isTurn ? "Roll the dice" : `Waiting for ${current.name}`}
                </button>
              )}

              <div className="ar-center-standings">
                {game.seats.map((s: any, i: number) => (
                  <span key={i} className={game.active === i ? "on" : ""} style={css({ "--team": teamColor(game, i) })}>
                    <i>{AVATARS[s.avatar ?? 0]}</i>
                    <b>{draft ? `${s.squad.length}/${game.settings.squadSize}` : `${s.score} runs`}</b>
                  </span>
                ))}
              </div>
            </div>

            {motion.shown.map((pos: number, i: number) => {
              const { x, y, n } = tileXY(pos, len);
              const sharing = motion.shown.filter((q: number) => q === pos).length;
              const order = motion.shown.slice(0, i).filter((q: number) => q === pos).length;
              const off = sharing > 1 ? (order - (sharing - 1) / 2) * 2.4 : 0;
              const hopping = motion.mover === i && motion.phase === "moving";
              return (
                <span
                  key={i}
                  className={`ar-token ${game.active === i && !moving ? "is-active" : ""} ${hopping ? "is-hopping" : ""}`}
                  style={css({
                    left: `calc(${((x + 0.5) / n) * 100}% + ${off}%)`,
                    top: `calc(${((y + 0.5) / n) * 100}% + ${off * 0.5}%)`,
                    "--team": teamColor(game, i),
                    animationName: hopping ? (motion.path.length % 2 ? "arStepA" : "arStepB") : undefined,
                  })}
                  title={game.seats[i].name}
                >
                  {AVATARS[game.seats[i].avatar ?? 0]}
                </span>
              );
            })}
          </div>
        </div>
        <aside className="ar-panel">
          <div className="ar-panel-head">
            <span>{draft ? "SCOUTING REPORT" : "FROM THE DUGOUT"}</span>
            <h2>
              {moving
                ? `${moverSeat?.name} is on the move`
                : pending
                  ? isTurn
                    ? "Sign this star?"
                    : `${current.name} is deciding`
                  : isTurn
                    ? "Your move, captain."
                    : `${current.name} is rolling…`}
            </h2>
          </div>
          <div className="ar-actions">
            {pending ? (
              <>
                <button className="ar-btn ar-btn-primary" disabled={!isTurn || busy} onClick={() => onAction("buy")}>
                  <Plus size={16} /> Sign for {money(price(pending, game.settings))}
                </button>
                <button className="ar-btn ar-btn-ghost" disabled={!isTurn || busy} onClick={() => onAction("pass")}>
                  Pass <X size={15} />
                </button>
              </>
            ) : (
              <button className="ar-btn ar-btn-primary ar-btn-wide" disabled={!canRoll} onClick={() => onAction("roll")}>
                {moving ? <Loader2 size={17} className="spin" /> : <Dices size={18} />}
                {moving ? "Moving…" : isTurn ? "Roll the dice" : "Waiting for your turn"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          <div className="ar-panel-scroll">
            <div className="ar-board-rules">
              {draft ? (
                <p>Land on a player to sign or pass. Fill your {game.settings.squadSize}-player squad to unlock the match.</p>
              ) : (
                <>
                  <p>Signings score 2× price. Land on your own star for 3× price; rival stars take runs from you.</p>
                  <div>
                    <span className="good">+1</span> Wide / no ball · free roll
                  </div>
                  <div>
                    <span className="gold">×2</span> Free hit / super over
                  </div>
                  <div>
                    <span className="bad">W</span> 7 wicket squares · −6 runs · {MONOPOLY_WICKETS} wickets and you are all out
                  </div>
                </>
              )}
            </div>
            {draft && (
              <div className="ar-needs">
                <h4>
                  <Shield size={11} /> SQUAD NEEDS
                </h4>
                <div>
                  <span className={squadAdvice(game, seat).batters >= squadAdvice(game, seat).batTarget ? "ok" : ""}>
                    BAT {squadAdvice(game, seat).batters}/{squadAdvice(game, seat).batTarget}
                  </span>
                  <span className={squadAdvice(game, seat).bowlers >= squadAdvice(game, seat).bowlTarget ? "ok" : ""}>
                    BOWL {squadAdvice(game, seat).bowlers}/{squadAdvice(game, seat).bowlTarget}
                  </span>
                </div>
              </div>
            )}
            <div className="ar-mysquad">
              <h4>
                YOUR SIGNINGS <span>{my.squad.length}</span>
              </h4>
              {my.squad.length ? (
                my.squad.map((id: number) => (
                  <div key={id} className="ar-mysquad-row">
                    <Face id={id} />
                    <span>
                      {player(id).name}
                      <small>{ROLE[player(id).role]}</small>
                    </span>
                    <TierTag tier={player(id).tier} size="xs" />
                  </div>
                ))
              ) : (
                <p className="ar-muted">No signings yet.</p>
              )}
            </div>
            {draft && seat === 0 && (
              <button className="ar-link" onClick={onComplete}>
                <Zap size={12} /> Quick-complete squads
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── toss ───────────────────────── */

export function TossArena({ game, seat, busy, rolling, onAction }: { game: any; seat: number; busy: boolean; rolling: boolean; onAction: (type: string, extra?: any) => void }) {
  const toss = game.toss,
    called = toss.coin !== null,
    winner = called ? game.seats[toss.winner] : null,
    canCall = !called && seat === 0,
    canChoose = called && seat === toss.winner;
  return (
    <div className="ar-toss">
      <div className="ar-toss-teams">
        {game.seats.map((s: any, i: number) => {
          const adv = squadAdvice(game, i);
          return (
            <div key={i} className={`ar-toss-team ${called && toss.winner === i ? "is-winner" : ""}`} style={css({ "--team": TEAMS[s.team].color })}>
              <span className="ar-seat-badge">{AVATARS[s.avatar ?? 0]}</span>
              <div>
                <strong>
                  {s.name}
                  {i === seat ? " · YOU" : ""}
                </strong>
                <span>{TEAMS[s.team].name}</span>
                <div className="ar-toss-faces">
                  {s.squad.map((id: number) => (
                    <Face key={id} id={id} />
                  ))}
                </div>
                <small>
                  {adv.batters} batting · {adv.bowlers} bowling options
                </small>
              </div>
              {called && toss.winner === i && <Crown size={20} className="ar-crown" />}
            </div>
          );
        })}
        <span className="ar-vs">VS</span>
      </div>
      <div className="ar-toss-center">
        <div className={`ar-coin ${rolling ? "is-flipping" : ""} ${called ? `is-${toss.coin}` : ""}`} key={toss.coin || "wait"}>
          <div className="ar-coin-face front">
            <Crown size={34} />
            <b>HEADS</b>
          </div>
          <div className="ar-coin-face back">
            <Dices size={34} />
            <b>TAILS</b>
          </div>
        </div>
        <h2>{called ? `${winner.name} wins the toss` : "Call it, captain."}</h2>
        <p>
          {called
            ? `${game.seats[0].name} called ${toss.call}. It landed ${toss.coin}.`
            : `${game.seats[0].name} calls. The winner chooses to bat or bowl.`}
        </p>
        {!called ? (
          <div className="ar-toss-buttons">
            <button className="ar-btn ar-btn-primary" disabled={!canCall || busy || rolling} onClick={() => onAction("toss", { call: "heads" })}>
              <Crown size={17} /> Heads
            </button>
            <button className="ar-btn ar-btn-primary" disabled={!canCall || busy || rolling} onClick={() => onAction("toss", { call: "tails" })}>
              <Dices size={17} /> Tails
            </button>
          </div>
        ) : (
          <div className="ar-toss-buttons">
            <button className="ar-btn ar-btn-primary" disabled={!canChoose || busy || rolling} onClick={() => onAction("choose", { choice: "bat" })}>
              🏏 Bat first
            </button>
            <button className="ar-btn ar-btn-primary" disabled={!canChoose || busy || rolling} onClick={() => onAction("choose", { choice: "bowl" })}>
              <CircleDot size={16} /> Bowl first
            </button>
          </div>
        )}
        <span className="ar-toss-wait">
          {!called
            ? canCall
              ? "Heads or tails?"
              : `Waiting for ${game.seats[0].name} to call…`
            : canChoose
              ? "You won the toss. How do you want to start?"
              : `${winner.name} is choosing…`}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── match ───────────────────────── */

export function ArenaScore({ game }: { game: any }) {
  const m = game.match,
    bat = game.seats[m.batting],
    bowl = game.seats[m.bowling],
    batTeam = TEAMS[bat.team],
    bowlTeam = TEAMS[bowl.team],
    striker = player(bat.squad[m.batter]),
    bowler = player(bowl.squad[m.bowler]);
  const innings = m.history.filter((b: any) => b.innings === m.innings),
    batBalls = innings.filter((b: any) => b.batter === striker.id),
    bowled = innings.filter((b: any) => b.bowler === bowler.id);
  const batterRuns = batBalls.reduce((n: number, b: any) => n + b.runs, 0),
    bowlerRuns = bowled.reduce((n: number, b: any) => n + b.runs, 0),
    bowlerWickets = bowled.filter((b: any) => b.out && b.shot !== "Run out").length;
  const otherHistory = m.history.filter((b: any) => b.batting === m.bowling),
    otherWickets = otherHistory.filter((b: any) => b.out).length,
    ballsLeft = Math.max(0, game.settings.overs * 6 - m.balls),
    needed = Math.max(0, m.scores[m.bowling] + 1 - m.scores[m.batting]);
  const rr = m.balls ? ((m.scores[m.batting] / m.balls) * 6).toFixed(2) : "0.00",
    rrr = ballsLeft ? ((needed / ballsLeft) * 6).toFixed(2) : "—";
  const overBalls = innings.slice(0, m.balls % 6 || Math.min(6, m.balls)).reverse();
  return (
    <div className="ar-score" aria-label="Scoreboard">
      <div className="ar-score-team" style={css({ "--team": batTeam.color })}>
        <span className="ar-score-sym">{batTeam.symbol}</span>
        <div>
          <strong>{batTeam.short}</strong>
          <small>{bat.name}</small>
        </div>
        <b key={`${m.innings}-${m.wickets}`} className={`ar-score-big`}>
          <Count value={m.scores[m.batting]} />
          <small>/{m.wickets}</small>
        </b>
        <div className="ar-score-overs">
          <strong>{oversText(m.balls)}</strong>
          <small>/{game.settings.overs} OV</small>
        </div>
      </div>
      <div className="ar-score-eq">
        <strong>{m.innings === 0 ? "SETTING THE TARGET" : `NEED ${needed} OFF ${ballsLeft}`}</strong>
        <span>
          {m.innings === 0 ? (
            <>
              vs <b style={{ color: bowlTeam.color }}>{bowlTeam.short}</b> · CRR {rr}
            </>
          ) : (
            <>
              <b style={{ color: bowlTeam.color }}>{bowlTeam.short}</b> {m.scores[m.bowling]}/{otherWickets} · RRR {rrr}
            </>
          )}
        </span>
      </div>
      <div className="ar-score-figs">
        <div>
          <span className="tag bat">BAT</span>
          <strong>{striker.name}*</strong>
          <b>
            {batterRuns}
            <small>({batBalls.length})</small>
          </b>
        </div>
        <div>
          <span className="tag bowl">BOWL</span>
          <strong>{bowler.name}</strong>
          <b>
            {bowlerWickets}-{bowlerRuns}
            <small>({oversText(bowled.length)})</small>
          </b>
        </div>
      </div>
      <div className="ar-score-over">
        <span>{m.balls > 0 && m.balls % 6 === 0 ? "LAST OVER" : "THIS OVER"}</span>
        <div>
          {Array.from({ length: 6 }, (_, k) => {
            const b = overBalls[k];
            return (
              <i key={k} className={!b ? "empty" : b.out ? "w" : b.runs >= 4 ? "b" : b.runs === 0 ? "d" : ""}>
                {b ? (b.out ? "W" : b.runs || "•") : ""}
              </i>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MatchArena({
  game,
  seat,
  busy,
  rolling,
  onAction,
  onTiers,
}: {
  game: any;
  seat: number;
  busy: boolean;
  rolling: boolean;
  onAction: (type: string, extra?: any) => void;
  onTiers: () => void;
}) {
  const m = game.match,
    my = game.seats[seat];
  const batting = m.batting === seat;
  const last = m.last;
  // Hold the read-out and the scoreboard until the replay reaches the moment of the result.
  const [reveal, setReveal] = useState(true);
  const lastId = useRef(last?.id);
  const prevGame = useRef<any>(game);
  const [held, setHeld] = useState<any>(null);
  useEffect(() => {
    if (!last || last.id === lastId.current) {
      prevGame.current = game;
      return;
    }
    lastId.current = last.id;
    setReveal(false);
    setHeld(prevGame.current);
    const t = setTimeout(() => {
      setReveal(true);
      setHeld(null);
      prevGame.current = game;
    }, revealMs(last));
    return () => {
      clearTimeout(t);
      setHeld(null);
      setReveal(true);
      prevGame.current = game;
    };
  }, [game]);
  const over = game.phase !== "match";
  // once the result has had its moment, an opponent's early roll may start the next ball's display
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    if (!reveal) {
      setSettled(false);
      return;
    }
    const t = setTimeout(() => setSettled(true), 1500);
    return () => clearTimeout(t);
  }, [reveal, last?.id]);
  const fresh = !over && reveal && (m.submitted[seat] || (settled && m.submitted.some(Boolean))); // a new ball is being rolled
  const showLast = !!last && reveal && !fresh;
  const history = useMemo(
    () => (held || game).match.history.filter((b: any) => b.innings === m.innings && !b.out && b.runs > 0 && b.id !== (reveal ? -1 : last?.id)),
    [game, held, reveal],
  );
  return (
    <div className="ar-match">
      <div className="ar-match-main">
        <div className="ar-field">
          <Stadium
            event={last && last.innings === m.innings ? last : last && m.innings === 1 && m.balls === 0 ? null : last}
            batColor={teamColor(game, m.batting)}
            bowlColor={teamColor(game, m.bowling)}
            batShort={TEAMS[game.seats[m.batting].team].short}
            bowlShort={TEAMS[game.seats[m.bowling].team].short}
            wagon={history}
          />
          {m.innings === 1 && m.balls === 0 && (
            <div className="ar-break">
              <span>INNINGS BREAK</span>
              <strong>
                {game.seats[m.batting].name} need {m.scores[m.bowling] + 1}
              </strong>
              <p>
                from {game.settings.overs * 6} balls · {game.settings.squadSize} wickets in hand
              </p>
            </div>
          )}
        </div>
        <aside className="ar-panel ar-duel">
          <div className="ar-duel-head">
            <span>THE DICE DUEL</span>
            <button className="ar-link" onClick={onTiers}>
              Tier bonuses <HelpCircle size={11} />
            </button>
          </div>
          <div className={`ar-duel-cards ${showLast ? (last.out ? "res-out" : last.runs >= 4 ? "res-boundary" : "res-runs") : ""}`}>
            {[m.batting, m.bowling].map((idx: number, k: number) => {
              // while the last ball is on show, keep the two players who contested it on the cards
              const shownId = showLast || (!reveal && last) ? (k === 0 ? last.batter : last.bowler) : game.seats[idx].squad[k === 0 ? m.batter : m.bowler];
              const seatIdx = showLast || (!reveal && last) ? (k === 0 ? last.batting : 1 - last.batting) : idx;
              const p = player(shownId);
              const t = k === 0 ? p.batTier : p.bowlTier;
              const mod = k === 0 ? TIERS[t].bat : TIERS[t].bowl;
              const mine = seatIdx === seat;
              const lastDie = last?.[k === 0 ? "batDie" : "bowlDie"];
              const value = fresh ? (mine ? m.rolls[seatIdx] : null) : !reveal && last ? (mine ? lastDie : null) : showLast ? lastDie : null;
              const spinning = (rolling && mine) || (!reveal && !!last && !mine) || (fresh && !mine && m.submitted[seatIdx]);
              const total = showLast ? (k === 0 ? last.batTotal : last.bowlTotal) : null;
              const won = showLast && (k === 0 ? !last.out && last.runs > 0 : last.out);
              return (
                <div
                  key={k}
                  className={`ar-duel-card ${k === 0 ? "is-bat" : "is-bowl"} ${mine ? "is-mine" : ""} ${won ? "is-winner" : showLast ? "is-settled" : ""}`}
                  style={css({ "--team": teamColor(game, seatIdx), "--tier": TIERS[t].color })}
                >
                  <span className="ar-duel-role">
                    {k === 0 ? "🏏 BATTING" : "● BOWLING"}
                    {mine ? " · YOU" : ""}
                  </span>
                  <div className="ar-duel-photo" key={p.id}>
                    <img src={p.photo} alt="" />
                  </div>
                  <strong>{p.name}</strong>
                  <small>
                    {TIERS[t].name} {k === 0 ? "bat" : "ball"}
                  </small>
                  <div className="ar-duel-sum">
                    <ArDie value={value} rolling={spinning} size={38} nonce={`${last?.id}-${fresh}`} />
                    <span className="ar-duel-mod" title="Tier bonus">
                      {fmtMod(mod)}
                    </span>
                    <span className="ar-duel-eq">=</span>
                    <b className={`ar-duel-total ${total === null ? "is-pending" : ""}`} key={total === null ? "p" : `t${last.id}`}>
                      {total === null ? "?" : <Count value={total} ms={350} />}
                    </b>
                  </div>
                  <span className={m.submitted[seatIdx] && fresh ? "ar-locked" : "ar-waiting"}>
                    {fresh ? (
                      m.submitted[seatIdx] ? (
                        <>
                          <Check size={11} /> LOCKED IN
                        </>
                      ) : mine ? (
                        "your roll"
                      ) : (
                        "to roll"
                      )
                    ) : !reveal && last ? (
                      "ball in play…"
                    ) : showLast ? (
                      won ? (
                        "wins the ball"
                      ) : (
                        " "
                      )
                    ) : mine ? (
                      "your roll"
                    ) : (
                      "to roll"
                    )}
                  </span>
                </div>
              );
            })}
            <span className={`ar-vs ${showLast ? "is-result" : ""}`} key={showLast ? `r${last.id}` : "vs"}>
              {showLast ? (last.out ? "OUT" : last.runs === 0 ? "DOT" : `+${last.runs}`) : "VS"}
            </span>
          </div>
          {showLast && (
            <div className={`ar-equation ${last.out ? "is-out" : last.runs >= 4 ? "is-boundary" : ""}`} key={last.id}>
              <span>LAST BALL</span>
              <strong>
                {last.batTotal} <i>{last.out && last.batTotal >= last.bowlTotal ? "✕" : last.out ? "<" : last.batTotal === last.bowlTotal ? "=" : ">"}</i> {last.bowlTotal}
              </strong>
              <b>
                {last.natural === "jaffa"
                  ? "UNPLAYABLE · 1 v " + last.bowlDie
                  : last.natural === "loose"
                    ? "LOOSE BALL · NO WICKET"
                    : last.out
                      ? `OUT · ${last.shot}`
                      : last.runs === 0
                        ? "DOT"
                        : `${last.runs} RUN${last.runs === 1 ? "" : "S"}`}
              </b>
            </div>
          )}
          <div className="ar-actions">
            <button
              className={`ar-btn ar-btn-primary ar-btn-wide ar-roll ${batting ? "is-bat" : "is-bowl"}`}
              disabled={over || m.submitted[seat] || busy || rolling || my.autoBalls > 0}
              onClick={() => onAction("roll")}
            >
              <Dices size={19} />
              {rolling ? "Rolling…" : my.autoBalls > 0 ? "Autoplay running…" : m.submitted[seat] ? "Locked · waiting…" : batting ? "Roll to bat" : "Roll to bowl"}
              {m.submitted[seat] ? <Check size={16} /> : <ArrowRight size={17} />}
            </button>
          </div>
          <div className="ar-panel-scroll">
            <div className="ar-auto">
              <div>
                <h4>
                  <Zap size={11} /> AUTOPLAY
                </h4>
                <p>{my.autoBalls > 0 ? `${my.autoBalls} auto rolls left` : "Let your captain roll for you"}</p>
              </div>
              <select
                aria-label="Autoplay overs"
                value={my.autoBalls > 0 ? "on" : "off"}
                onChange={(e) =>
                  onAction("autoplay", {
                    overs:
                      e.target.value === "off" ? 0 : e.target.value === "all" ? Math.ceil((game.settings.overs * 6 - m.balls) / 6) : +e.target.value,
                  })
                }
              >
                {my.autoBalls > 0 && <option value="on">Running…</option>}
                <option value="off">Off</option>
                {[1, 2, 5]
                  .filter((n) => n <= game.settings.overs)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n} over{n === 1 ? "" : "s"}
                    </option>
                  ))}
                <option value="all">Rest of innings</option>
              </select>
            </div>
            <div className="ar-pick-head">
              <h4>{batting ? "PICK YOUR BATTER" : "PICK YOUR BOWLER"}</h4>
              <span>{batting ? "before your roll" : m.balls % 6 === 0 ? "for this over" : "over in progress"}</span>
            </div>
            {!batting && (
              <p className="ar-muted small">
                Max {bowlerLimit(game.settings)} over{bowlerLimit(game.settings) === 1 ? "" : "s"} per bowler · change at the end of an over.
              </p>
            )}
            <div className="ar-pick">
              {arrangedSquad(game, seat).map((entry: any, order: number, entries: any[]) => {
                const { id, index: i, group } = entry,
                  p = player(id),
                  out = batting && m.dismissed.includes(i),
                  selected = i === (batting ? m.batter : m.bowler),
                  eligible = batting ? !out : bowlingOptions(game, seat).includes(i);
                const t = batting ? p.batTier : p.bowlTier;
                const balls = m.bowlerBalls?.[seat]?.[i] || 0;
                return (
                  <Fragment key={id}>
                    {(order === 0 || entries[order - 1].group !== group) && <div className="ar-pick-group">{group}</div>}
                    <button
                      className={`${selected ? "is-selected" : ""} ${!eligible ? "is-out" : ""}`}
                      disabled={!eligible || m.submitted[seat] || busy || (!batting && m.balls % 6 !== 0)}
                      onClick={() => onAction("select", { index: i })}
                      style={css({ "--tier": TIERS[t].color })}
                    >
                      <Face id={id} />
                      <span>
                        {p.name}
                        <small>
                          {out ? "OUT" : `${batting ? "BAT " + p.bat : "BOWL " + p.bowl}`}
                          {!batting && ` · ${oversText(balls)}/${bowlerLimit(game.settings)} ov`}
                        </small>
                      </span>
                      <span className="ar-mod" style={css({ "--tier": TIERS[t].color })}>
                        {batting ? (TIERS[t].bat >= 0 ? "+" : "−") + Math.abs(TIERS[t].bat) : (TIERS[t].bowl >= 0 ? "+" : "−") + Math.abs(TIERS[t].bowl)}
                      </span>
                      {selected && <Check size={13} className="ar-check" />}
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
      <ArenaScore game={held || game} />
    </div>
  );
}
