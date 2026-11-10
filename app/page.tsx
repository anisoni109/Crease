"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Dices,
  Flag,
  Gavel,
  HelpCircle,
  Home,
  Link2,
  Loader2,
  Plus,
  Search,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  PLAYERS,
  TEAMS,
  TIERS,
  AVATARS,
  player,
  money,
  price,
  budget,
  normalizeSettings,
  minimumBudget,
  arrangedSquad,
  bowlerLimit,
  bowlingOptions,
  squadAdvice,
  makeSeat,
  createGame,
  act,
  aiAction,
  bidAmount,
} from "../lib/game.mjs";
import { API_BASE } from "../lib/paths";
import { claudeHosted, claudeRoom } from "../lib/claudeParty";
import { setDiceSound, unlockAudio } from "../lib/diceSound";
import SetupFlow from "../components/SetupFlow";
import Statistics, { Scorecard } from "../components/Statistics";
import { makeRecord } from "../lib/records.mjs";
import { ArenaHead, AuctionArena, BoardArena, TossArena, MatchArena, TierTag, revealMs } from "../components/Arena";
type Game = any;
const MODES = [
  {
    id: "auction",
    eyebrow: "BUILD YOUR DREAM TEAM",
    title: "The Auction",
    desc: "Big names. Bold bids. Build your squad, then settle it on the pitch.",
    icon: Gavel,
    tag: "FAN FAVOURITE",
    number: "01",
  },
  {
    id: "draft",
    eyebrow: "LET THE DICE DECIDE",
    title: "Roll & Recruit",
    desc: "Roll around the board. Sign the stars you land on. Take your team to battle.",
    icon: Dices,
    tag: "A LITTLE LUCK. A LOT OF STRATEGY.",
    number: "02",
  },
  {
    id: "monopoly",
    eyebrow: "OWN THE GAME",
    title: "Cricket Monopoly",
    desc: "Buy players. Collect runs. Dodge wickets. Turn the whole board your colour.",
    icon: Crown,
    tag: "THE BOARD IS YOURS",
    number: "03",
  },
];
function Die({ value, rolling = false, small = false }: { value: number; rolling?: boolean; small?: boolean }) {
  const dots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <div className={`die ${rolling ? "rolling" : ""} ${small ? "small-die" : ""}`} aria-label={`Die: ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={(dots[value] || dots[1]).includes(i) ? "pip on" : "pip"} />
      ))}
    </div>
  );
}
function TeamBadge({ team, size = "" }: { team: number; size?: string }) {
  const t = TEAMS[team];
  return (
    <span className={`team-badge ${size}`} style={{ "--team": t.color } as React.CSSProperties}>
      {t.symbol}
    </span>
  );
}
function Tier({ tier }: { tier: string }) {
  return (
    <span className={`tier tier-${tier}`}>
      <span>◆</span> {TIERS[tier].name}
    </span>
  );
}
function Portrait({ p, className = "" }: { p: any; className?: string }) {
  return (
    <div className={`portrait ${className}`} style={{ "--tier": TIERS[p.tier].color } as React.CSSProperties}>
      <span className="portrait-watermark">{p.rating}</span>
      <img src={p.photo} alt={p.name} loading="lazy" />
      <span className="portrait-no">{p.role}</span>
    </div>
  );
}
function PlayerCard({ p, settings }: { p: any; settings?: any }) {
  return (
    <article className={`player-card tier-border-${p.tier}`}>
      <div className="player-card-top">
        <TierTag tier={p.tier} />
        <span>
          {p.rating}
          <small> OVR</small>
        </span>
      </div>
      <Portrait p={p} />
      <div className="player-card-info">
        <span>
          {p.country} <i>•</i>{" "}
          {p.role === "AR" ? "All-rounder" : p.role === "BOWL" ? "Bowler" : p.role === "WK" ? "Wicketkeeper" : "Batter"}
        </span>
        <h3>{p.name}</h3>
        <div className="card-skills">
          <span>
            BAT <b>{p.bat}</b>
          </span>
          <span>
            BOWL <b>{p.bowl}</b>
          </span>
          <strong>{money(settings ? price(p, settings) : p.base)}</strong>
        </div>
      </div>
    </article>
  );
}

function SquadBalance({ game, seat }: { game: any; seat: number }) {
  const info = squadAdvice(game, seat);
  return (
    <div className={`squad-advice ${info.messages.length ? "" : "balanced"}`}>
      <h4>
        <Shield size={12} /> SQUAD BALANCE
      </h4>
      <div>
        <span>
          {info.batters}/{info.batTarget} batting options
        </span>
        <span>
          {info.bowlers}/{info.bowlTarget} bowling options
        </span>
      </div>
      {info.messages.length ? (
        info.messages.map((m: string) => <p key={m}>{m}</p>)
      ) : (
        <p>Good balance. You have options with both bat and ball.</p>
      )}
      <p>All-rounders can cover both roles.</p>
    </div>
  );
}
export default function CricketGame() {
  const [view, setView] = useState("home"),
    [settings, setSettings] = useState({
      mode: "auction",
      overs: 5,
      squadSize: 11,
      capacity: 2,
      difficulty: "casual",
      budget: 0,
    }),
    [name, setName] = useState(""),
    [avatar, setAvatar] = useState(0),
    [team, setTeam] = useState(0),
    [opponent, setOpponent] = useState(1);
  const [game, setGame] = useState<Game>(null),
    [seat, setSeat] = useState(0),
    [party, setParty] = useState<any>(null),
    [modal, setModal] = useState(""),
    [joinCode, setJoinCode] = useState(""),
    [search, setSearch] = useState(""),
    [role, setRole] = useState("ALL"),
    [tierFilter, setTierFilter] = useState("ALL");
  const [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(true),
    [voice, setVoice] = useState(true),
    [resume, setResume] = useState<any>(null),
    [rolling, setRolling] = useState(false),
    [popup, setPopup] = useState<any>(null),
    [boardMoving, setBoardMoving] = useState(false),
    [finale, setFinale] = useState(false);
  const prevPhase = useRef<string | null>(null);
  useEffect(() => {
    // let the last ball (or last roll) play out before the result screen takes over
    const was = prevPhase.current;
    prevPhase.current = game?.phase ?? null;
    if (game?.phase === "results" && (was === "match" || was === "monopoly")) {
      setFinale(true);
      const t = setTimeout(() => setFinale(false), was === "match" ? 4200 : 3600);
      return () => clearTimeout(t);
    }
    if (game?.phase !== "results") setFinale(false);
  }, [game?.phase]);
  const [profileReady, setProfileReady] = useState(false),
    [identity, setIdentity] = useState<any>(null),
    [localRecords, setLocalRecords] = useState<any[]>([]);
  const audio = useRef<AudioContext | null>(null),
    flight = useRef(false),
    restored = useRef(false),
    toastTimer = useRef<any>(null),
    lastBallAt = useRef(0),
    seenBall = useRef<number | null>(null);
  const announce = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4300);
  };
  useEffect(() => setDiceSound(sound), [sound]);
  useEffect(() => unlockAudio(), []);
  function playNote(kind = "roll") {
    if (!sound) return;
    try {
      const ctx = audio.current || (audio.current = new AudioContext());
      if (ctx.state === "suspended") void ctx.resume();
      const notes =
        kind === "win"
          ? [392, 494, 587, 784]
          : kind === "buy"
            ? [440, 659, 880]
            : kind === "boundary"
              ? [523, 659, 784, 1046]
              : kind === "wicket"
                ? [392, 330, 220]
                : kind === "hit"
                  ? [140, 420]
                  : kind === "step"
                    ? [620]
                  : [180, 260, 320];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(),
          gain = ctx.createGain();
        o.connect(gain);
        gain.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = f;
        gain.gain.setValueAtTime(0.045, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.16);
        o.start(ctx.currentTime + i * 0.07);
        o.stop(ctx.currentTime + i * 0.07 + 0.17);
      });
    } catch {}
  }
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crease-save-v2");
      if (saved) setResume(JSON.parse(saved));
      const key = localStorage.getItem("crease-identity");
      const ident = key ? JSON.parse(key) : { captainId: crypto.randomUUID(), captainSecret: crypto.randomUUID() };
      localStorage.setItem("crease-identity", JSON.stringify(ident));
      setIdentity(ident);
      const records = localStorage.getItem("crease-history");
      if (records) setLocalRecords(JSON.parse(records));
      const pref = localStorage.getItem("crease-captain");
      if (pref) {
        const p = JSON.parse(pref);
        setName(p.name || "");
        setTeam(p.team ?? 0);
        setAvatar(p.avatar ?? 0);
      }
      const code = new URLSearchParams(location.search).get("party");
      if (code) {
        setJoinCode(code.toUpperCase());
        setModal("join");
      }
    } catch {}
    restored.current = true;
    setProfileReady(true);
  }, []);
  useEffect(() => {
    if (!profileReady) return;
    try {
      localStorage.setItem("crease-captain", JSON.stringify({ name, team, avatar }));
      if (game) localStorage.setItem("crease-save-v2", JSON.stringify({ game, party, seat }));
    } catch {}
  }, [game, party, seat, name, team, avatar, profileReady]);
  async function roomCall(body: any, quiet = false) {
    if (flight.current) return null;
    flight.current = true;
    if (!quiet) setBusy(true);
    try {
      let res: { ok: boolean; status: number }, data: any;
      if (claudeHosted()) {
        const r = await claudeRoom(body);
        res = r;
        data = r.data;
      } else {
        const r = await fetch(`${API_BASE}/api/room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        res = r;
        data = await r.json();
      }
      if (!res.ok) {
        if (res.status === 403 && body.op === "poll") {
          setParty(null);
          setGame(null);
          setResume(null);
          setView("home");
          localStorage.removeItem("crease-save-v2");
          announce("Your seat is no longer in this lobby. Join a new party to play.");
          return null;
        }
        if (data.game) {
          setGame(data.game);
          if (!quiet) announce("The party just updated. Try your action again.");
          return null;
        }
        throw new Error(data.error || "Could not connect.");
      }
      setGame(data.game);
      setSeat(data.seat);
      setParty({ code: data.code, token: data.token });
      return data;
    } catch (e) {
      if (!quiet) announce(e instanceof Error ? e.message : "Connection lost. Try again.");
      return null;
    } finally {
      flight.current = false;
      if (!quiet) setBusy(false);
    }
  }
  useEffect(() => {
    if (!party || !game || view !== "game") return;
    const timer = setInterval(() => {
      void roomCall({ op: "poll", ...party }, true);
    }, 1400);
    return () => clearInterval(timer);
  }, [party?.code, party?.token, view]);
  useEffect(() => {
    if (!game || party || view !== "game" || popup || boardMoving) return;
    const next = aiAction(game);
    if (!next) return;
    const ballId = game.match?.last?.id ?? null;
    if (ballId !== seenBall.current) {
      seenBall.current = ballId;
      if (ballId !== null && game.phase === "match") lastBallAt.current = Date.now();
    }
    // let the ball replay finish before the next ball can be resolved
    const replay = game.phase === "match" ? Math.max(0, lastBallAt.current + 3300 - Date.now()) : 0;
    const timer = setTimeout(
      () => {
        try {
          setGame((g: Game) => {
            const fresh = aiAction(g);
            return fresh ? act(g, fresh.actor, fresh.action) : g;
          });
        } catch (e) {
          announce(e instanceof Error ? e.message : "AI turn failed.");
        }
      },
      Math.max(game.phase === "match" ? 900 : game.phase === "toss" ? 2000 : 950, replay),
    );
    return () => clearTimeout(timer);
  }, [game, party, view, popup, boardMoving]);
  useEffect(() => {
    if (game?.phase === "results") playNote("win");
  }, [game?.phase]);
  useEffect(() => {
    if (game?.phase !== "results" || party) return;
    const id = `solo:${game.soloId || "legacy"}:${game.round || 1}`;
    setLocalRecords((old) => {
      if (old.some((r) => r.id === id)) return old;
      const next = [makeRecord(game, id), ...old].slice(0, 30);
      try {
        localStorage.setItem("crease-history", JSON.stringify(next));
      } catch {
        announce("Device storage is full. This solo result could not be saved.");
      }
      return next;
    });
  }, [game?.phase, game?.round, party?.code]);
  useEffect(() => {
    const last = game?.match?.last;
    if (!last) return;
    lastBallAt.current = Date.now();
    playNote(last.out ? "wicket" : last.runs >= 4 ? "boundary" : "hit");
    if (sound && voice && typeof window !== "undefined" && "speechSynthesis" in window) {
      const line = last.out
        ? `Wicket! ${player(last.batter).name} is ${last.shot.toLowerCase()}.`
        : last.runs === 0
          ? "A dot ball. Good bowling."
          : last.runs === 6
            ? "That is a magnificent six!"
            : last.runs === 4
              ? "Four runs! Beautifully played."
              : `${last.runs} run${last.runs === 1 ? "" : "s"} to ${player(last.batter).name}.`;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.rate = 1.12;
      utterance.volume = 0.75;
      window.speechSynthesis.speak(utterance);
    }
  }, [game?.match?.last?.id]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, game?.phase]);
  // SOLD / UNSOLD popups. Prefer the structured events; fall back to the
  // commentary log for older party servers that only report sales.
  const seenLog = useRef<number | null>(null);
  useEffect(() => {
    const log = game?.log;
    if (!log?.length || game.phase === "lobby") {
      seenLog.current = log?.[0]?.id ?? null;
      return;
    }
    const prev = seenLog.current;
    seenLog.current = log[0].id;
    if (prev === null) return;
    const fresh = log.filter((l: any) => l.id > prev);
    let next: any = null;
    for (const entry of fresh) {
      if (game.lastSale && entry.text.startsWith("SOLD!") && entry.id >= game.lastSale.id)
        next = { kind: "sold", key: `s${game.lastSale.id}`, ...game.lastSale };
      else if (/ goes unsold\.$/.test(entry.text)) {
        const name = entry.text.replace(/ goes unsold\.$/, "");
        const p = game.lastUnsold && player(game.lastUnsold.player)?.name === name ? player(game.lastUnsold.player) : PLAYERS.find((x) => x.name === name);
        if (p) next = { kind: "unsold", key: `u${entry.id}`, player: p.id, amount: game.lastUnsold?.amount };
      }
    }
    if (!next) return;
    setPopup(next);
    playNote(next.kind === "sold" ? "buy" : "wicket");
  }, [game?.log?.[0]?.id]);
  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => setPopup(null), popup.kind === "sold" ? 2200 : 1700);
    return () => clearTimeout(timer);
  }, [popup?.key]);
  useEffect(() => {
    if (!modal) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [modal]);
  // keyboard: Space / Enter rolls, B bids, P passes
  const keyAction = useRef<(k: string) => void>(() => {});
  keyAction.current = (k: string) => {
    if (!game || view !== "game" || modal || popup || boardMoving) return;
    const myTurn = game.active === seat;
    if (game.phase === "auction" && myTurn) {
      if (k === "b") void action("bid");
      else if (k === "p") void action("pass");
    } else if (k === " " || k === "enter") {
      if (game.phase === "match" && !game.match.submitted[seat] && !(game.seats[seat].autoBalls > 0)) void action("roll");
      else if ((game.phase === "draft" || game.phase === "monopoly") && myTurn && !game.pending) void action("roll");
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || (el && /INPUT|TEXTAREA|SELECT|BUTTON/.test(el.tagName))) return;
      const k = e.key.toLowerCase();
      if ([" ", "enter", "b", "p"].includes(k)) {
        if (k === " ") e.preventDefault();
        keyAction.current(k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  async function action(type: string, extra: any = {}) {
    if (busy || rolling) return;
    if (type === "roll" || type === "toss") {
      setRolling(true);
      if (type === "toss") playNote("buy");
      setTimeout(() => setRolling(false), type === "toss" ? 1250 : 850);
    } else if (type === "buy" || type === "bid") playNote("buy");
    if (party) {
      await roomCall({ op: "action", ...party, action: { type, ...extra }, version: game.version });
      return;
    }
    try {
      setGame(act(game, seat, { type, ...extra }));
    } catch (e) {
      announce(e instanceof Error ? e.message : "That action is unavailable.");
    }
  }
  function startSolo() {
    if (!name.trim()) {
      announce("Enter your captain name.");
      return;
    }
    const captain = makeSeat(name, team, "local-captain", false, avatar);
    captain.captainId = identity?.captainId;
    let g = createGame(settings, captain);
    g.soloId = crypto.randomUUID();
    g = act(g, 0, { type: "addAI", team: opponent });
    while (g.seats.length < g.settings.capacity) g = act(g, 0, { type: "addAI" });
    // solo games skip the lobby: every setting was chosen in the setup window
    g = act(g, 0, { type: "start" });
    setGame(g);
    setSeat(0);
    setParty(null);
    setView("game");
    setModal("");
    playNote("buy");
  }
  async function createParty() {
    if (!name.trim()) {
      announce("Enter your captain name.");
      return;
    }
    const data = await roomCall({ op: "create", settings, name, team, avatar, ...identity });
    if (data) {
      setView("game");
      setModal("");
      announce("Party created. Share your code with a friend.");
    }
  }
  async function joinParty() {
    if (!name.trim()) {
      announce("Enter your captain name.");
      return;
    }
    const data = await roomCall({ op: "join", code: joinCode.trim(), name, team, avatar, ...identity });
    if (data) {
      setView("game");
      setModal("");
    }
  }
  function resumeGame() {
    if (!resume) return;
    setGame(resume.game);
    setSeat(resume.seat);
    setParty(resume.party);
    setView("game");
    if (resume.party) void roomCall({ op: "poll", ...resume.party });
  }
  async function copyParty(link = false) {
    // a Claude-hosted game cannot read its own share URL, so share the code instead
    if (link && claudeHosted()) link = false;
    try {
      await navigator.clipboard.writeText(
        link ? `${location.origin}${location.pathname}?party=${party.code}` : party.code,
      );
      announce(link ? "Invite link copied." : claudeHosted() ? "Party code copied. Send it with this game's Claude link." : "Party code copied.");
    } catch {
      announce(`Your party code is ${party.code}`);
    }
  }
  const my = game?.seats[seat],
    current = game?.seats[game.active],
    isTurn = game?.active === seat,
    config = normalizeSettings(settings),
    mode = MODES.find((m) => m.id === settings.mode)!;
  const filtered = PLAYERS.filter(
    (p) =>
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase())) &&
      (role === "ALL" || p.role === role) &&
      (tierFilter === "ALL" || p.tier === tierFilter),
  );
  const locked = view === "game" && !!game && (!["lobby", "results"].includes(game.phase) || finale);
  const shownPhase = game?.phase === "results" && finale ? game.settings.mode === "monopoly" ? "monopoly" : "match" : game?.phase;
  const soundTools = (
    <>
      <button
        className="ar-icon"
        onClick={() => {
          setSound(!sound);
          if (sound && "speechSynthesis" in window) window.speechSynthesis.cancel();
          announce(sound ? "Sound off." : "Sound on.");
        }}
        aria-label={sound ? "Mute sound" : "Enable sound"}
      >
        {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      <button
        className={`ar-icon ${voice ? "voice-on" : ""}`}
        aria-label={voice ? "Disable voice commentary" : "Enable voice commentary"}
        onClick={() => {
          setVoice(!voice);
          if (voice && "speechSynthesis" in window) window.speechSynthesis.cancel();
          announce(voice ? "Voice commentary off." : "Voice commentary on.");
        }}
      >
        <AudioLines size={16} />
      </button>
    </>
  );
  const setMode = (id: string) =>
    setSettings((s) => ({ ...s, mode: id, capacity: id === "monopoly" ? s.capacity : 2 }));
  return (
    <div className={`app-shell ${locked ? "is-locked" : ""}`}>
      <aside className="sidebar">
        <button className="brand-mark" aria-label="Crease home" onClick={() => setView("home")}>
          <span>C</span>
          <i />
          <i />
        </button>
        <div className="side-links">
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")} aria-label="Home">
            <Home size={21} />
            <span>Home</span>
          </button>
          <button
            className={view === "game" ? "active" : ""}
            onClick={() => (game ? setView("game") : announce("Choose a mode and start your first game."))}
            aria-label="Game room"
          >
            <Dices size={23} />
            <span>Play</span>
          </button>
          <button
            className={view === "players" ? "active" : ""}
            onClick={() => setView("players")}
            aria-label="Player pool"
          >
            <Users size={21} />
            <span>Players</span>
          </button>
          <button
            className={view === "statistics" ? "active" : ""}
            onClick={() => setView("statistics")}
            aria-label="Statistics"
          >
            <Trophy size={21} />
            <span>Statistics</span>
          </button>
          <button onClick={() => setModal("rules")} aria-label="How to play">
            <BookOpen size={21} />
            <span>Rules</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="side-season">EST. 2026</span>
          <button aria-label="Help" onClick={() => setModal("rules")}>
            <HelpCircle size={21} />
          </button>
          <div className="avatar">{AVATARS[avatar]}</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button className="wordmark" onClick={() => setView("home")}>
            CREASE<span>CRICKET. REIMAGINED.</span>
          </button>
          <div className="topbar-nav">
            <span className="status">
              <i /> ALL PLAY. NO LIMITS.
            </span>
            <button
              className="icon-button"
              onClick={() => {
                setSound(!sound);
                if (sound && "speechSynthesis" in window) window.speechSynthesis.cancel();
                announce(sound ? "Sound off." : "Sound on.");
              }}
              aria-label={sound ? "Mute sound" : "Enable sound"}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className={`icon-button voice-button ${voice ? "voice-on" : ""}`}
              aria-label={voice ? "Disable voice commentary" : "Enable voice commentary"}
              onClick={() => {
                setVoice(!voice);
                if (voice && "speechSynthesis" in window) window.speechSynthesis.cancel();
                announce(voice ? "Voice commentary off." : "Voice commentary on.");
              }}
            >
              <AudioLines size={18} />
            </button>
            <div className="top-divider" />
            <button className="captain" onClick={() => setModal("profile")}>
              <div className="avatar small-avatar">{AVATARS[avatar]}</div>
              <span>{name || "Choose profile"}</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <main>
          {view === "statistics" && (
            <Statistics identity={identity} localRecords={localRecords} onBack={() => setView("home")} />
          )}
          {view === "home" && (
            <SetupFlow
              settings={settings}
              setSettings={setSettings}
              name={name}
              setName={setName}
              avatar={avatar}
              setAvatar={setAvatar}
              team={team}
              setTeam={setTeam}
              opponent={opponent}
              setOpponent={setOpponent}
              onSolo={startSolo}
              onParty={createParty}
              onJoin={() => setModal("join")}
              onRules={() => setModal("rules")}
              onPlayers={() => setView("players")}
              onResume={resumeGame}
              canResume={!!resume?.game && resume.game.phase !== "results"}
              busy={busy}
            />
          )}
          {view === "players" && (
            <section className="players-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">THE PEOPLE WHO MAKE THE GAME</div>
                  <h1>
                    A league of legends<span>.</span>
                  </h1>
                  <p>200 familiar faces. Find your next match winner.</p>
                </div>
                <button className="secondary-button" onClick={() => setView("home")}>
                  <ChevronLeft size={16} /> Back to game setup
                </button>
              </div>
              <div className="pool-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    placeholder="Search players or countries…"
                    aria-label="Search players"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="pool-filters">
                  {["ALL", "BAT", "BOWL", "AR", "WK"].map((r) => (
                    <button className={role === r ? "active" : ""} key={r} onClick={() => setRole(r)}>
                      {r === "ALL" ? "All roles" : r}
                    </button>
                  ))}
                </div>
                <select
                  className="tier-select"
                  aria-label="Filter by tier"
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                >
                  <option value="ALL">All tiers</option>
                  {Object.keys(TIERS).map((t) => (
                    <option key={t} value={t}>
                      {TIERS[t].tag} · {TIERS[t].name}
                    </option>
                  ))}
                </select>
                <span className="pool-count">{filtered.length} PLAYERS</span>
              </div>
              <div className="player-pool">
                {filtered.map((p) => (
                  <PlayerCard key={p.id} p={p} settings={config} />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>No players found</h3>
                  <p>Try a different name, country or role.</p>
                  <button
                    className="text-link"
                    onClick={() => {
                      setSearch("");
                      setRole("ALL");
                      setTierFilter("ALL");
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
              <p className="source-note">
                Player names and roles:{" "}
                <a href="https://www.iplt20.com/teams" target="_blank" rel="noreferrer">
                  Official IPL team directory
                </a>
                ; additional portrait sources:{" "}
                <a href="https://www.punjabkingsipl.in/" target="_blank" rel="noreferrer">
                  Punjab Kings
                </a>
                ,{" "}
                <a href="https://www.bcci.tv/" target="_blank" rel="noreferrer">
                  BCCI
                </a>{" "}
                and{" "}
                <a href="https://www.espncricinfo.com/" target="_blank" rel="noreferrer">
                  ESPNcricinfo
                </a>
                . Retrieved 9 Nov 2026. This is a curated popular-player pool, not an official popularity ranking. Skill
                ratings, tiers and prices are created for gameplay.
              </p>
            </section>
          )}
          {locked && (
            <section className="arena" data-phase={game.phase}>
              <ArenaHead
                game={game}
                party={party}
                onHome={() => setView("home")}
                onRules={() => setModal("rules")}
                onCopy={() => copyParty()}
                extra={soundTools}
                tickerDelay={shownPhase === "match" ? revealMs(game.match?.last) : shownPhase === "draft" || shownPhase === "monopoly" ? 1300 : 0}
              />
              <div className="ar-body">
                {game.phase === "auction" && (
                  <AuctionArena
                    game={game}
                    seat={seat}
                    busy={busy}
                    popup={popup}
                    onAction={(t, x) => void action(t, x)}
                    onComplete={() => setModal("complete")}
                  />
                )}
                {(shownPhase === "draft" || shownPhase === "monopoly") && (
                  <BoardArena
                    game={game}
                    seat={seat}
                    busy={busy}
                    onAction={(t, x) => void action(t, x)}
                    onComplete={() => setModal("complete")}
                    onMotion={setBoardMoving}
                    onStep={() => playNote("step")}
                  />
                )}
                {game.phase === "toss" && (
                  <TossArena game={game} seat={seat} busy={busy} rolling={rolling} onAction={(t, x) => void action(t, x)} />
                )}
                {shownPhase === "match" && (
                  <MatchArena
                    game={game}
                    seat={seat}
                    busy={busy}
                    rolling={rolling}
                    onAction={(t, x) => void action(t, x)}
                    onTiers={() => setModal("tiers")}
                  />
                )}
              </div>
            </section>
          )}
          {view === "game" && game && !locked && (
            <section className="game-page">
              <div className="game-topline">
                <div>
                  <button className="back-link" onClick={() => setView("home")}>
                    <ChevronLeft size={13} /> HOME GROUND
                  </button>
                  <h1>
                    {game.phase === "lobby"
                      ? "Your party starts here."
                      : game.phase === "auction"
                        ? "Going. Going. Yours."
                        : game.phase === "draft"
                          ? "Roll into your dream team."
                          : game.phase === "monopoly"
                            ? "Make the board yours."
                            : game.phase === "results"
                              ? "That’s a wrap."
                              : game.phase === "toss"
                                ? "The first call matters."
                                : "Welcome to the crease."}
                  </h1>
                </div>
                <div className="game-meta">
                  <span className="game-format">
                    {game.settings.overs} OVERS <i>•</i>{" "}
                    {game.settings.mode === "monopoly"
                      ? `${game.settings.capacity} CAPTAINS`
                      : `${game.settings.squadSize} A SIDE`}
                  </span>
                  {party ? (
                    <button className="party-code" onClick={() => copyParty()}>
                      <Users size={14} />
                      {party.code}
                      <Copy size={13} />
                    </button>
                  ) : (
                    <span className="solo-pill">
                      <Sparkles size={12} /> SOLO vs AI
                    </span>
                  )}
                  <button className="icon-button" aria-label="Game rules" onClick={() => setModal("rules")}>
                    <BookOpen size={17} />
                  </button>
                </div>
              </div>
              {game.phase === "lobby" && (
                <div className="lobby-layout">
                  <div className="lobby-card">
                    <div className="eyebrow">
                      <span className="live-dot" /> YOUR PRIVATE CLUBHOUSE
                    </div>
                    <h2>
                      {party ? (
                        <>
                          Good games need
                          <br />
                          <em>great company.</em>
                        </>
                      ) : (
                        <>
                          Your rival is
                          <br />
                          <em>ready to play.</em>
                        </>
                      )}
                    </h2>
                    <p>
                      {party ? (
                        <>
                          Share the party code. Pick your colours.
                          <br />
                          Let the friendly rivalries begin.
                        </>
                      ) : (
                        <>
                          Review your squad settings and AI rival.
                          <br />
                          Proceed when you’re ready.
                        </>
                      )}
                    </p>
                    {party ? (
                      <>
                        <button className="big-party-code" onClick={() => copyParty()}>
                          {party.code}
                          <Copy size={23} />
                        </button>
                        <button className="secondary-button" onClick={() => copyParty(true)}>
                          <Link2 size={15} /> Copy invite link
                        </button>
                      </>
                    ) : (
                      <div className="solo-lobby-ready">
                        <Sparkles size={25} />
                        <strong>SOLO PRACTICE</strong>
                        <p>Your AI rival plays automatically.</p>
                      </div>
                    )}
                    <div className="lobby-details">
                      <span>{MODES.find((m) => m.id === game.settings.mode)?.title}</span>
                      <span>{game.settings.overs} overs</span>
                      <span>{money(budget(game.settings))} each</span>
                    </div>
                    {party && <p className="subtle">Party codes expire after 24 hours of inactivity.</p>}
                  </div>
                  <div className="lobby-seats">
                    <div className="section-heading">
                      <h2>The captains</h2>
                      <span>
                        {game.seats.length} / {game.settings.capacity}
                      </span>
                    </div>
                    {Array.from({ length: game.settings.capacity }, (_, i) => {
                      const s = game.seats[i];
                      return (
                        <div className={`lobby-seat ${s ? "occupied" : ""}`} key={i}>
                          {s ? (
                            <>
                              <TeamBadge team={s.team} />
                              <div>
                                <strong>
                                  <span className="inline-avatar">{AVATARS[s.avatar ?? 0]}</span>
                                  {s.name}
                                  {i === seat ? " (you)" : ""}
                                </strong>
                                <span>{TEAMS[s.team].name}</span>
                              </div>
                              <span className="ready-tag">
                                {s.ai ? "AI" : "READY"} <Check size={12} />
                              </span>
                              {seat === 0 && i > 0 && (
                                <button
                                  className="lobby-kick"
                                  aria-label={`Remove ${s.name} from lobby`}
                                  title="Remove captain"
                                  onClick={() => action("kick", { seat: i })}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="empty-avatar">
                                <Users size={20} />
                              </div>
                              <div>
                                <strong>Waiting for a captain…</strong>
                                <span>Send them your party code</span>
                              </div>
                              {seat === 0 && (
                                <button className="text-link" onClick={() => action("addAI")}>
                                  <Plus size={12} /> Add AI
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div className="lobby-profile-edit">
                      <label>
                        Your captain name
                        <input
                          aria-label="Your lobby name"
                          maxLength={24}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => name.trim() && action("identity", { name, avatar: my.avatar ?? avatar })}
                        />
                      </label>
                      <label>Your avatar</label>
                      <div className="avatar-picker">
                        {AVATARS.map((a, i) => (
                          <button
                            key={a}
                            aria-label={`Choose avatar ${i + 1}`}
                            className={(my.avatar ?? 0) === i ? "chosen" : ""}
                            onClick={() => {
                              setAvatar(i);
                              void action("identity", { name: my.name, avatar: i });
                            }}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="lobby-team-picker">
                      Your franchise
                      <select value={my.team} onChange={(e) => action("team", { team: +e.target.value })}>
                        {TEAMS.map((t, i) => (
                          <option key={i} value={i}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {seat === 0 && (
                      <div className="host-lobby-rules">
                        <div className="eyebrow">
                          <Shield size={12} /> HOST MATCH RULES
                        </div>
                        <label>
                          Budget per captain
                          <select
                            aria-label="Lobby budget"
                            value={game.settings.budget || 0}
                            onChange={(e) =>
                              action("settings", {
                                overs: game.settings.overs,
                                squadSize: game.settings.squadSize,
                                budget: +e.target.value,
                              })
                            }
                          >
                            <option value={0}>Balanced automatically</option>
                            {game.settings.budget > 0 &&
                              ![5, 8, 10, 12, 15, 20, 30, 40, 60, 100].includes(game.settings.budget) && (
                                <option value={game.settings.budget}>{money(game.settings.budget)}</option>
                              )}
                            {[5, 8, 10, 12, 15, 20, 30, 40, 60, 100].map((n) => (
                              <option key={n} value={n} disabled={n < minimumBudget(game.settings)}>
                                {money(n)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Custom purse
                          <input
                            className="lobby-budget-input"
                            aria-label="Custom lobby budget"
                            type="number"
                            key={`${game.settings.budget}-${game.settings.squadSize}`}
                            defaultValue={budget(game.settings)}
                            min={minimumBudget(game.settings)}
                            max={500}
                            step={0.5}
                            onBlur={(e) =>
                              action("settings", {
                                overs: game.settings.overs,
                                squadSize: game.settings.squadSize,
                                budget: +e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Overs
                          <select
                            aria-label="Lobby overs"
                            value={game.settings.overs}
                            onChange={(e) =>
                              action("settings", { overs: +e.target.value, squadSize: game.settings.squadSize })
                            }
                          >
                            {[1, 2, 5, 10, 20].map((n) => (
                              <option key={n} value={n}>
                                {n} overs
                              </option>
                            ))}
                          </select>
                        </label>
                        {game.settings.mode !== "monopoly" && (
                          <label>
                            Players per squad
                            <select
                              aria-label="Lobby squad size"
                              value={game.settings.squadSize}
                              onChange={(e) =>
                                action("settings", { overs: game.settings.overs, squadSize: +e.target.value })
                              }
                            >
                              {[3, 5, 7, 11].map((n) => (
                                <option key={n} value={n}>
                                  {n} players
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                    <button
                      className="primary-button"
                      disabled={seat !== 0 || game.seats.length !== game.settings.capacity || busy}
                      onClick={() => action("start")}
                    >
                      {seat === 0
                        ? "Proceed to " +
                          (game.settings.mode === "auction"
                            ? "auction"
                            : game.settings.mode === "draft"
                              ? "team selection"
                              : "the board")
                        : "Waiting for the host"}
                      <ArrowRight size={17} />
                    </button>
                    <p className="subtle">
                      {seat === 0
                        ? "Review your captains, then proceed when everyone is ready."
                        : "You’re in. The host will proceed when everyone is ready."}
                    </p>
                  </div>
                </div>
              )}
              {game.phase === "results" && (
                <div className="results-layout">
                  <div className="results-confetti">
                    {Array.from({ length: 30 }, (_, i) => (
                      <i
                        key={i}
                        style={{
                          left: `${i * 3.4}%`,
                          animationDelay: `${i * 0.13}s`,
                          background: ["#caff55", "#edc578", "#7eafff", "#ec8a7d"][i % 4],
                        }}
                      />
                    ))}
                  </div>
                  <div className="trophy-circle">
                    <Trophy size={64} strokeWidth={1.3} />
                  </div>
                  <div className="eyebrow">THE SCOREBOOK HAS SPOKEN</div>
                  <h2>{game.winner === -1 ? "Honours even." : `${game.seats[game.winner].name} takes the glory.`}</h2>
                  <p>
                    {game.winner === seat
                      ? "A captain’s performance. A well-earned victory."
                      : game.winner === -1
                        ? "Some rivalries need another chapter."
                        : "What a game. Every rivalry deserves a rematch."}
                  </p>
                  <div className="result-scores">
                    {game.seats.map((s: any, i: number) => (
                      <div key={i} className={game.winner === i ? "winner" : ""}>
                        <TeamBadge team={s.team} />
                        <h3>{s.name}</h3>
                        <strong>
                          {game.settings.mode === "monopoly" ? s.score : game.match.scores[i]}
                          <small> RUNS</small>
                        </strong>
                        <span>
                          {game.winner === i ? (
                            <>
                              <Trophy size={12} /> MATCH WINNER
                            </>
                          ) : game.winner === -1 ? (
                            "TIED"
                          ) : (
                            "WELL PLAYED"
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="subtle">
                    {party
                      ? "Result saved to your multiplayer scorebook. The host starts rematches."
                      : "Result saved in your solo scorebook."}
                    {game.seats.some((s: any) => s.rematchRequested) && " A captain has requested a rematch."}
                  </p>
                  <div className="result-actions">
                    <button
                      className="primary-button"
                      disabled={busy || (!!my.rematchRequested && seat !== 0)}
                      onClick={() => action(seat === 0 ? "rematch" : "requestRematch")}
                    >
                      {seat === 0
                        ? "Rematch · same squads"
                        : my.rematchRequested
                          ? "Rematch requested"
                          : "Request rematch"}{" "}
                      <Dices size={17} />
                    </button>
                    <button className="secondary-button" onClick={() => setModal("scorecard")}>
                      Match scorecard
                    </button>
                    <button className="secondary-button" onClick={() => setView("statistics")}>
                      Statistics <Trophy size={15} />
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setView("home");
                        setGame(null);
                        setParty(null);
                        setResume(null);
                        localStorage.removeItem("crease-save-v2");
                      }}
                    >
                      Back to the clubhouse <ArrowRight size={17} />
                    </button>
                    <button className="secondary-button" onClick={() => setView("players")}>
                      Scout your next squad <Users size={15} />
                    </button>
                  </div>
                </div>
              )}
              {game.phase !== "lobby" && (
                <div className="match-bottom">
                  <div className="commentary">
                    <div className="commentary-heading">
                      <span className="live-dot" />
                      <h3>The commentary box</h3>
                      <span>LIVE FEED</span>
                    </div>
                    <div className="commentary-lines" aria-live="polite">
                      {game.log.slice(0, 6).map((entry: any, i: number) => (
                        <p key={entry.id}>
                          <span>{i === 0 ? "JUST NOW" : String(entry.id).padStart(2, "0")}</span>
                          {entry.text}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="game-rules-summary">
                    <span className="eyebrow">A LITTLE REMINDER</span>
                    <h3>
                      {game.settings.mode === "monopoly"
                        ? "Score runs. Stay in the game."
                        : "A great team is just the beginning."}
                    </h3>
                    <p>
                      {game.settings.mode === "monopoly"
                        ? "Your signings generate runs. Rival signings cost runs. The highest score after everyone’s rolls wins."
                        : "Batter + tier bonus vs bowler + tier bonus. Lower batting total = wicket. Equal = dot. Higher = the difference in runs. A batter's 1 against a 5 or 6 is always out; a bowler's 1 never takes a wicket."}
                    </p>
                    <button className="text-link" onClick={() => setModal("rules")}>
                      Open the playbook <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          <section
            className={`modal ${modal === "scorecard" ? "scorecard-modal" : modal === "rules" ? "rules-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={modal === "join" ? "Join a party" : modal === "profile" ? "Captain profile" : "Game playbook"}
          >
            <button className="modal-close icon-button" onClick={() => setModal("")} aria-label="Close dialog">
              <X size={20} />
            </button>
            {modal === "scorecard" && game && (
              <Scorecard
                record={makeRecord(
                  game,
                  party ? `${party.code}:${game.round || 1}` : `solo:${game.soloId}:${game.round || 1}`,
                )}
                onClose={() => setModal("")}
              />
            )}
            {modal === "join" && (
              <>
                <div className="modal-icon">
                  <Link2 size={25} />
                </div>
                <div className="eyebrow">YOUR INVITE TO THE RIVALRY</div>
                <h2>Join the party.</h2>
                <p>Grab the 8-character code from your host.</p>
                <label>
                  Captain name
                  <input autoFocus maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Your franchise
                  <select aria-label="Your joining franchise" value={team} onChange={(e) => setTeam(+e.target.value)}>
                    {TEAMS.map((t, i) => (
                      <option key={i} value={i}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Your avatar</label>
                <div className="avatar-picker">
                  {AVATARS.map((a, i) => (
                    <button
                      key={a}
                      aria-label={`Join avatar ${i + 1}`}
                      className={avatar === i ? "chosen" : ""}
                      onClick={() => setAvatar(i)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <label>
                  Party code
                  <input
                    className="code-input"
                    placeholder="ABCD2345"
                    value={joinCode}
                    maxLength={8}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && joinCode.length === 8 && joinParty()}
                  />
                </label>
                <button
                  className="primary-button"
                  onClick={joinParty}
                  disabled={busy || joinCode.length !== 8 || !name.trim()}
                >
                  {busy ? <Loader2 size={16} className="spin" /> : "Take your seat"}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {modal === "profile" && (
              <>
                <div className="modal-icon">
                  <Flag size={25} />
                </div>
                <h2>Captain’s corner.</h2>
                <p>Give your rivals a name to remember.</p>
                <label>
                  Your name
                  <input maxLength={24} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </label>
                <button
                  className="primary-button"
                  onClick={() => {
                    setName(name.trim() || "Captain");
                    setModal("");
                    announce("Captain profile saved.");
                  }}
                >
                  Save profile <Check size={16} />
                </button>
              </>
            )}
            {modal === "complete" && (
              <>
                <div className="modal-icon">
                  <Zap size={25} />
                </div>
                <h2>Straight to the action?</h2>
                <p>
                  Fill every remaining squad place with an available player at base price. Your signed players stay in
                  your team. Then the toss winner chooses whether to bat or bowl.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    void action("complete");
                    setModal("");
                  }}
                >
                  Complete squads & toss <ArrowRight size={17} />
                </button>
                <button className="text-link modal-cancel" onClick={() => setModal("")}>
                  Keep drafting
                </button>
              </>
            )}
            {(modal === "rules" || modal === "tiers") && (
              <>
                <div className="eyebrow">THE CREASE PLAYBOOK</div>
                <h2>
                  Big fun.
                  <br />
                  <em>Simple rules.</em>
                </h2>
                {modal === "rules" && (
                  <div className="rules-intro">
                    {MODES.map((m) => (
                      <div key={m.id}>
                        <m.icon size={20} />
                        <div>
                          <h3>{m.title}</h3>
                          <p>
                            {m.id === "auction"
                              ? "Captains take turns bidding or passing. Each raise is ₹0.2 Cr. Both captains may pass; then the player is unsold. If there is a bid and everyone else passes, the last bidder signs the player. Your bids are limited only by your actual purse. Players come up in random order, and only players that some captain can still afford are shown. Use Find a player to sign an unsold player at base price or to call a waiting player up next. The CPU plans a squad it can afford and skips players outside that plan."
                              : m.id === "draft"
                                ? "Roll two dice to move around the player board. Buy or pass on the player you land on. Fill your squad, then face your rival in dice cricket. After 120 draft rolls, remaining places auto-fill."
                                : "Roll two dice, buy stars and collect runs. Purchases score 2× price, rounded up. Owned-player landings score 3× price; rivals transfer up to that many runs to the owner. Pass Powerplay for +6. Seven wicket squares cost 6 runs each, and ten wickets end your innings. Highest score after all rolls wins."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="rules-subheading">The dice cricket duel</h3>
                <p>
                  Each innings lasts your selected overs × 6 balls, or until every squad member is out. Choose a batter
                  or bowler before rolling. Each captain rolls one die, then the skill tier adds a bonus. Two natural
                  rolls override the totals: a batter's 1 against a bowler's 5 or 6 is always out, and a bowler's 1 can
                  never take a wicket.
                </p>
                <table className="tier-table">
                  <thead>
                    <tr>
                      <th>SKILL TIER</th>
                      <th>BATTING</th>
                      <th>BOWLING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(TIERS).map(([id, t]: any) => (
                      <tr key={id}>
                        <td>
                          <Tier tier={id} />
                        </td>
                        <td>Die {t.bat ? " + " + t.bat : ""}</td>
                        <td>Die {t.bowl > 0 ? " + " + t.bowl : t.bowl < 0 ? " − " + Math.abs(t.bowl) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="rule-comparisons">
                  <div>
                    <span>BAT &lt; BOWL</span>
                    <strong>Wicket.</strong>
                  </div>
                  <div>
                    <span>BAT = BOWL</span>
                    <strong>Dot ball.</strong>
                  </div>
                  <div>
                    <span>BAT &gt; BOWL</span>
                    <strong>Score the difference.</strong>
                  </div>
                </div>
                <p>
                  Runs are the batting total minus the bowling total, capped at 6. A difference of 5 is scored as 4. For
                  example: batting 8 vs bowling 5 scores 3 runs. One batter roll plus one bowler roll together count as
                  exactly one ball. A bowler completes an over before the next bowler takes over. The over limit adapts
                  to the innings and squad size; autoplay can handle selected overs for your captain. Batting and
                  bowling tiers use separate skill ratings (90+ gold, 80+ red, 68+ blue, below 68 gray). Swap players
                  before your die is locked. Dismissed batters cannot return. The second team chases; equal final scores
                  are a tie.
                </p>
                {modal === "rules" && (
                  <>
                    <h3 className="rules-subheading">On the Monopoly board</h3>
                    <p>
                      One roll is one ball; each captain gets overs × 6 rolls. Wides and no balls add a run and a free
                      roll (at most two consecutive free rolls). Bowled, caught or run out costs up to 6 runs. A ×2 tile
                      adds your last positive scoring gain again. Scores never drop below zero. Landing exactly on
                      Powerplay also scores its tile bonus.
                    </p>
                    <h3 className="rules-subheading">Play with your people</h3>
                    <p>
                      Create a party and share its code or invite link. The host starts when seats are filled, and can
                      add AI to empty seats. Auction and Roll & Recruit are head-to-head; Monopoly supports 2–4
                      captains. Reopen this browser to resume your most recent game. Parties expire after 24 hours of
                      inactivity.
                    </p>
                    <p className="source-note">
                      Independent fan-made game. Player data and portraits from the{" "}
                      <a href="https://www.iplt20.com/teams" target="_blank" rel="noreferrer">
                        official IPL team directory
                      </a>
                      . Prices and skill ratings are game-balanced estimates, not official valuations.
                    </p>
                  </>
                )}
                <button className="primary-button" onClick={() => setModal("")}>
                  Got it. Game on. <ArrowRight size={17} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="live-dot" />
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
