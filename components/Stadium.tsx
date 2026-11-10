import { useEffect, useMemo, useRef } from "react";
import { delivery, player } from "../lib/game.mjs";

/*
 * The match-day stadium. A broadcast-style view from behind the bowler:
 * striker at the far (top) end, bowler running in towards the camera end.
 * Every resolved ball replays a short sequence:
 *   0.00s  bowler runs in            0.90s  release
 *   1.30s  ball reaches the striker  1.30s+ shot / wicket / runs / signals
 * Coordinates live in an 800 × 520 field; the SVG is drawn larger than its
 * viewBox so wide screens show more of the stands instead of empty bars.
 */

const CX = 400,
  CY = 272,
  RX = 330,
  RY = 212;
const STRIKER = { x: 391, y: 197 };
const NON_STRIKER = { x: 434, y: 370 };
const BOWLER = { x: 386, y: 392 };
const KEEPER = { x: 400, y: 150 };
const UMPIRE = { x: 404, y: 424 };
const CONTACT = { x: 398, y: 186 };
const STUMPS_TOP = 178;
const STUMPS_BOTTOM = 374;
const FIELD = [
  { x: 436, y: 148, name: "Slip" },
  { x: 236, y: 205, name: "Point" },
  { x: 252, y: 318, name: "Cover" },
  { x: 330, y: 438, name: "Mid-off" },
  { x: 486, y: 440, name: "Mid-on" },
  { x: 574, y: 312, name: "Midwicket" },
  { x: 584, y: 196, name: "Square leg" },
  { x: 548, y: 100, name: "Fine leg" },
  { x: 250, y: 112, name: "Third man" },
];
const scaleAt = (y: number) => 0.74 + y * 0.0012;
const r1 = (n: number) => Math.round(n * 10) / 10;

type Kind = "batter" | "fielder" | "keeper" | "bowler" | "umpire";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255),
    g = c((n >> 8) & 255),
    b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** A small cricketer drawn with feet at (0,0), about 46 units tall. */
function Cricketer({ kind, kit, skin = "#c99a74", number }: { kind: Kind; kit: string; skin?: string; number?: number }) {
  const dark = shade(kit, -0.28),
    light = shade(kit, 0.18);
  const umpire = kind === "umpire",
    padded = kind === "batter" || kind === "keeper";
  const trousers = umpire ? "#22262b" : padded ? "#eef1e6" : dark;
  const shirt = umpire ? "#f3f1ea" : kit;
  return (
    <g className={`ck ck-${kind}`}>
      <ellipse className="ck-shadow" cx="1" cy="0.5" rx="12" ry="3.6" />
      <g className="ck-leg ck-leg-l">
        <rect x="-6.3" y="-21" width={padded ? 6 : 5} height="20" rx="2.5" fill={trousers} />
        {padded && <path d="M-5.6-17h4.6M-5.6-12h4.6M-5.6-7h4.6" stroke="#c9cfc0" strokeWidth=".8" />}
        <ellipse cx="-3.6" cy="-0.8" rx="3.6" ry="1.8" fill="#f5f5ef" />
      </g>
      <g className="ck-leg ck-leg-r">
        <rect x={padded ? 0.3 : 1.3} y="-21" width={padded ? 6 : 5} height="20" rx="2.5" fill={trousers} />
        {padded && <path d="M.8-17h4.6M.8-12h4.6M.8-7h4.6" stroke="#c9cfc0" strokeWidth=".8" />}
        <ellipse cx="3.6" cy="-0.8" rx="3.6" ry="1.8" fill="#f5f5ef" />
      </g>
      <path d="M-8.5-20.5Q-10-31-6.8-37.2h13.6Q10-31 8.5-20.5Z" fill={shirt} />
      {!umpire && <path d="M-8.5-20.5Q-10-31-6.8-37.2h2.6Q-7-30-5.6-20.5Z" fill={light} opacity=".75" />}
      {!umpire && <path d="M-8.4-24h16.8" stroke={dark} strokeWidth="2" />}
      {number !== undefined && (
        <text y="-25.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={shade(kit, 0.45)}>
          {number}
        </text>
      )}
      <g className="ck-arm ck-arm-l">
        <path d="M-7-35-11.5-24" stroke={shirt} strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="-11.8" cy="-22.6" r={kind === "keeper" ? 3.6 : 2.2} fill={kind === "keeper" ? "#f1efe2" : skin} />
      </g>
      <g className="ck-arm ck-arm-r">
        <path d="M7-35 11.5-24" stroke={shirt} strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="11.8" cy="-22.6" r={kind === "keeper" ? 3.6 : 2.2} fill={kind === "keeper" ? "#f1efe2" : skin} />
      </g>
      <rect x="-2" y="-39.5" width="4" height="3" fill={skin} />
      <circle cy="-43" r="5.6" fill={skin} />
      {kind === "batter" || kind === "keeper" ? (
        <>
          <path d="M-6.3-42.4a6.3 6.6 0 0 1 12.6 0v1.4H-6.3Z" fill={kind === "keeper" ? dark : "#1b2b45"} />
          <path d="M-6-40.6h12M-5-38.7h10M-1.7-41v4M1.7-41v4" stroke="#aab4ba" strokeWidth=".75" />
          <path d="M-6.3-43h12.6" stroke={kit} strokeWidth="1.4" />
        </>
      ) : umpire ? (
        <>
          <ellipse cy="-46.4" rx="9" ry="2" fill="#f3f1ea" />
          <path d="M-5-46.4a5 4.2 0 0 1 10 0Z" fill="#f3f1ea" />
          <path d="M-5-46.6h10" stroke="#1d2126" strokeWidth="1" />
        </>
      ) : (
        <>
          <path d="M-5.8-44.3a5.8 5.8 0 0 1 11.6 0Z" fill={kit} />
          <path d="M-1-44.6q6.5-.6 10 1.4" stroke={dark} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      )}
      {kind === "batter" && (
        <g className="ck-bat">
          <rect x="-1.1" y="-28" width="2.2" height="7" rx="1" fill="#2b2b2b" />
          <path d="M-2.4-21.5h4.8l.4 18.5q0 2-2.8 2-2.8 0-2.8-2Z" fill="#e2c88c" />
          <path d="M-.2-20v17" stroke="#c6a96a" strokeWidth=".7" />
        </g>
      )}
    </g>
  );
}

function Place({ x, y, children, className = "", style }: any) {
  return (
    <g transform={`translate(${x} ${y}) scale(${r1(scaleAt(y) * 100) / 100})`} className={className} style={style}>
      {children}
    </g>
  );
}

function parseTarget(event: any) {
  const nums = String(event?.shotPath || "")
    .match(/-?\d+(\.\d+)?/g)
    ?.map(Number);
  if (nums && nums.length >= 2 && !["Bowled", "LBW"].includes(event?.shot)) {
    const tx = nums[nums.length - 2],
      ty = nums[nums.length - 1];
    const dx = (tx - 300) / 230,
      dy = (ty - 240) / 160;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) return Math.atan2(dy, dx);
  }
  const seed = Number(event?.id || 1) * 2.399963;
  return seed % (Math.PI * 2);
}

const onEllipse = (angle: number, k: number) => ({
  x: CX + RX * k * Math.cos(angle),
  y: CY + RY * k * Math.sin(angle),
});

function plan(event: any) {
  if (!event) return null;
  const shot = String(event.shot || ""),
    runs = Number(event.runs || 0);
  const kind = event.out
    ? shot === "Bowled"
      ? "bowled"
      : shot === "LBW"
        ? "lbw"
        : shot === "Run out"
          ? "runout"
          : "caught"
    : runs === 6
      ? "six"
      : runs === 4
        ? "four"
        : runs === 0
          ? "dot"
          : "runs";
  const angle = parseTarget(event);
  let target =
    kind === "dot"
      ? { x: CONTACT.x + 52 * Math.cos(angle), y: CONTACT.y + 36 * Math.abs(Math.sin(angle)) + 22 }
      : kind === "runs"
        ? onEllipse(angle, [0, 0.52, 0.68, 0.84][runs] || 0.6)
        : kind === "four"
          ? onEllipse(angle, 1.0)
          : kind === "six"
            ? onEllipse(angle, 1.24)
            : kind === "caught"
              ? onEllipse(angle, 0.62)
              : kind === "runout"
                ? onEllipse(angle, 0.44)
                : { x: 400, y: STUMPS_TOP };
  let chaser = -1;
  if (["runs", "four", "caught", "runout", "six"].includes(kind)) {
    let best = Infinity;
    FIELD.forEach((f, i) => {
      const d = Math.hypot(f.x - target.x, (f.y - target.y) * 1.3);
      if (d < best) {
        best = d;
        chaser = i;
      }
    });
  }
  if (kind === "caught" && chaser >= 0) target = { x: FIELD[chaser].x, y: FIELD[chaser].y - 30 * scaleAt(FIELD[chaser].y) };
  if (kind === "runout" && chaser >= 0) {
    const f = FIELD[chaser];
    target = { x: f.x + (target.x - f.x) * 0.35, y: f.y + (target.y - f.y) * 0.35 };
  }
  const start = CONTACT;
  const mid = { x: (start.x + target.x) / 2, y: (start.y + target.y) / 2 };
  const lift = kind === "six" ? 170 : kind === "caught" ? 95 : 0;
  const bend = kind === "four" || kind === "runs" ? 18 : 0;
  const ground = `M${r1(start.x)} ${r1(start.y)} Q${r1(mid.x + bend * Math.sin(angle))} ${r1(mid.y - bend * Math.cos(angle))} ${r1(target.x)} ${r1(target.y)}`;
  const air = lift
    ? `M${r1(start.x)} ${r1(start.y)} Q${r1(mid.x)} ${r1(mid.y - lift)} ${r1(target.x)} ${r1(target.y)}`
    : ground;
  const delivery =
    kind === "bowled"
      ? `M394 340 L401 262 L400 ${STUMPS_TOP + 2}`
      : kind === "lbw"
        ? `M394 340 L401 262 L395 ${STUMPS_TOP + 15}`
        : `M394 340 L401 262 L${CONTACT.x} ${CONTACT.y}`;
  const shotDur = kind === "six" ? 1.15 : kind === "four" ? 0.85 : kind === "caught" ? 0.95 : kind === "dot" ? 0.5 : 0.75;
  // chasing fielder moves in its own (scaled) coordinates
  let chase: any = null;
  if (chaser >= 0) {
    const f = FIELD[chaser],
      s = scaleAt(f.y);
    const share = kind === "four" ? 0.82 : kind === "six" ? 0.55 : kind === "caught" ? 0.25 : 0.94;
    const goal = kind === "caught" ? { x: target.x, y: f.y } : target;
    chase = {
      index: chaser,
      dx: r1(((goal.x - f.x) * share) / s),
      dy: r1(((goal.y - f.y) * share) / s),
    };
  }
  const throwPath =
    kind === "runout" ? `M${r1(target.x)} ${r1(target.y)} Q${r1((target.x + 424) / 2)} ${r1((target.y + 360) / 2 - 40)} 404 ${STUMPS_BOTTOM - 4}` : "";
  return { kind, runs, angle, target, ground, air, delivery, shotDur, chase, throwPath, lift };
}

export function Stadium({
  event,
  batColor = "#f9cf52",
  bowlColor = "#579bff",
  batShort = "BAT",
  bowlShort = "BOWL",
  wagon = [],
}: {
  event?: any;
  batColor?: string;
  bowlColor?: string;
  batShort?: string;
  bowlShort?: string;
  /** earlier scoring shots of this innings, drawn as a faint wagon wheel */
  wagon?: any[];
}) {
  const p = useMemo(() => plan(event), [event?.id]);
  const svg = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    try {
      svg.current?.setCurrentTime?.(0);
    } catch {}
  }, [event?.id]);
  const wheel = useMemo(
    () =>
      wagon.slice(0, 24).map((b: any) => {
        const a = parseTarget(b),
          end = onEllipse(a, b.runs === 6 ? 1.06 : b.runs === 4 ? 1 : [0, 0.52, 0.68, 0.84][b.runs] || 0.6);
        return { id: b.id, runs: b.runs, x: r1(end.x), y: r1(end.y) };
      }),
    [wagon.map((b: any) => b.id).join(",")],
  );
  const bowlerInfo = event ? player(event.bowler) : null,
    batterInfo = event ? player(event.batter) : null;
  const how = event && bowlerInfo ? delivery(bowlerInfo, event.id) : null;
  const pace = event ? (event.kph ?? how?.kph ?? "").toString() : "";
  const style = event?.style || how?.style || "";
  const kind = p?.kind || "idle";
  const runs = p?.runs || 0;
  const runCycles = kind === "runs" ? runs : kind === "runout" ? 1 : 0;
  const resultDelay =
    kind === "six" ? 2.3 : kind === "four" ? 2.05 : kind === "caught" ? 2.2 : kind === "runout" ? 2.25 : kind === "bowled" ? 1.4 : kind === "lbw" ? 1.6 : 1.55;
  const crowd = useMemo(() => {
    // deterministic crowd speckle
    const dots: { x: number; y: number; c: string; d: number }[] = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const palette = [batColor, bowlColor, "#f4f1df", "#d9c27a", "#9cc2ff", "#ef8f7d", "#c9f66b"];
    for (let i = 0; i < 520; i++) {
      const a = rnd() * Math.PI * 2,
        k = 1.13 + rnd() * 0.5;
      const x = CX + RX * k * Math.cos(a),
        y = CY + RY * k * Math.sin(a) - 8;
      dots.push({ x, y, c: palette[Math.floor(rnd() * palette.length)], d: rnd() * 3 });
    }
    return dots;
  }, [batColor, bowlColor]);
  const label = event
    ? `${event.shot}: ${event.out ? "wicket" : runs + " run" + (runs === 1 ? "" : "s")}`
    : "Cricket ground. Bowler at the top of the run-up, striker taking guard.";
  return (
    <div className={`st-root st-${kind} st-runs-${runs}`} key={event?.id || "idle"} style={{ "--result-delay": `${resultDelay}s` } as any}>
      <svg ref={svg} className="st-svg" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        <defs>
          <radialGradient id="st-grass" cx="50%" cy="48%" r="60%">
            <stop offset="0" stopColor="#4f8a45" />
            <stop offset=".7" stopColor="#3b7438" />
            <stop offset="1" stopColor="#2a5a2c" />
          </radialGradient>
          <linearGradient id="st-pitch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cbb98a" />
            <stop offset=".5" stopColor="#d8c697" />
            <stop offset="1" stopColor="#c7b080" />
          </linearGradient>
          <radialGradient id="st-glow">
            <stop offset="0" stopColor="#fffbe0" stopOpacity=".95" />
            <stop offset=".35" stopColor="#fff6c0" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff6c0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="st-vignette" cx="50%" cy="52%" r="62%">
            <stop offset=".72" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".35" />
          </radialGradient>
          <clipPath id="st-outfield">
            <ellipse cx={CX} cy={CY} rx={RX + 14} ry={RY + 12} />
          </clipPath>
          <path id="st-board-path" d={`M${CX - RX - 26} ${CY} a${RX + 26} ${RY + 22} 0 1 1 0 .1`} />
        </defs>

        <g className="st-cam">
          {/* stands, extended well past the viewBox so wide screens stay filled */}
          <rect x="-700" y="-400" width="2200" height="1320" fill="#0c140f" />
          <ellipse cx={CX} cy={CY - 6} rx={RX * 1.75} ry={RY * 1.75} fill="#121c15" />
          <ellipse cx={CX} cy={CY - 6} rx={RX * 1.62} ry={RY * 1.62} fill="#17241a" />
          <g className="st-crowd">
            {crowd.map((d, i) => (
              <circle key={i} cx={r1(d.x)} cy={r1(d.y)} r={1.7} fill={d.c} style={{ animationDelay: `${r1(d.d)}s` }} />
            ))}
          </g>
          {/* floodlights */}
          {[
            [40, -10],
            [760, -10],
            [10, 560],
            [790, 560],
          ].map(([x, y], i) => (
            <g key={i} className="st-light">
              <circle cx={x} cy={y} r="120" fill="url(#st-glow)" opacity=".55" />
              <rect x={x - 16} y={y - 9} width="32" height="18" rx="3" fill="#2a332c" stroke="#fffbe0" strokeWidth="1.5" />
              <path d={`M${x - 11} ${y - 3}h22M${x - 11} ${y + 3}h22`} stroke="#fffbe8" strokeWidth="2.4" />
            </g>
          ))}
          {/* advertising boards */}
          <ellipse cx={CX} cy={CY} rx={RX + 26} ry={RY + 22} fill="none" stroke="#1a2a1d" strokeWidth="16" />
          <ellipse className="st-boards" cx={CX} cy={CY} rx={RX + 26} ry={RY + 22} fill="none" strokeWidth="11" strokeDasharray="70 8" />
          <text className="st-board-text" fontSize="8.5" letterSpacing="3">
            <textPath href="#st-board-path" startOffset="0">
              CREASE CRICKET CLUB · {batShort} vs {bowlShort} · ROLL THE DICE · OWN THE CREASE · CREASE CRICKET CLUB · {batShort} vs{" "}
              {bowlShort} · ROLL THE DICE · OWN THE CREASE · CREASE CRICKET CLUB ·
            </textPath>
          </text>

          {/* outfield */}
          <ellipse cx={CX} cy={CY} rx={RX + 14} ry={RY + 12} fill="url(#st-grass)" />
          <g clipPath="url(#st-outfield)" opacity=".5">
            {Array.from({ length: 14 }, (_, i) => (
              <rect key={i} x={CX - RX - 20 + i * 50} y={CY - RY - 20} width="25" height={RY * 2 + 40} fill="#5f9a52" opacity=".38" />
            ))}
          </g>
          <ellipse cx={CX} cy={CY} rx={RX + 14} ry={RY + 12} fill="url(#st-vignette)" />
          <ellipse className="st-rope" cx={CX} cy={CY} rx={RX} ry={RY} fill="none" strokeWidth="3" />
          <ellipse cx={CX} cy={CY} rx="168" ry="118" fill="none" stroke="#e9f3dc" strokeOpacity=".32" strokeWidth="1.4" strokeDasharray="5 7" />
          <text x={CX} y={CY + RY - 14} textAnchor="middle" className="st-turf-text">
            CREASE
          </text>

          {/* pitch */}
          <path d={`M383 158 L417 158 L423 390 L377 390 Z`} fill="url(#st-pitch)" />
          <path d="M392 230q8 6 16 0M389 300q11 8 22 0" stroke="#b9a273" strokeWidth="1.2" fill="none" opacity=".6" />
          <path d="M376 186h48M372 364h56M384 170v22M416 170v22M381 352v22M419 352v22" stroke="#fbf7e6" strokeWidth="1.6" />
          <path d="M391 178h18M390 374h20" stroke="#fbf7e6" strokeWidth="2.4" />

          {/* stumps */}
          {[STUMPS_TOP, STUMPS_BOTTOM].map((y, end) => (
            <g key={y} className={`st-stumps st-stumps-${end === 0 ? "top" : "bottom"}`}>
              {[-6, 0, 6].map((dx, i) => (
                <rect
                  key={dx}
                  className="st-stump"
                  x={400 + dx - 1.4}
                  y={y - 21}
                  width="2.8"
                  height="21"
                  rx="1"
                  fill="#f4e7c3"
                  style={{ transformOrigin: `${400 + dx}px ${y}px`, ["--i" as any]: i - 1 }}
                />
              ))}
              <rect className="st-bail st-bail-l" x="393" y={y - 23} width="7" height="2.2" rx="1" fill="#f4e7c3" style={{ transformOrigin: `396.5px ${y - 22}px` }} />
              <rect className="st-bail st-bail-r" x="400" y={y - 23} width="7" height="2.2" rx="1" fill="#f4e7c3" style={{ transformOrigin: `403.5px ${y - 22}px` }} />
            </g>
          ))}

          {/* wagon wheel of earlier scoring shots */}
          <g className="st-wagon">
            {wheel.map((w) => (
              <line key={w.id} x1={CONTACT.x} y1={CONTACT.y} x2={w.x} y2={w.y} className={`w${w.runs}`} />
            ))}
          </g>
          {p && (
            <ellipse cx="401" cy="263" rx="2" ry="1" fill="#e9dcb4" opacity="0">
              <animate attributeName="opacity" values="0;.8;0" begin="1.13s" dur="0.5s" />
              <animate attributeName="rx" values="2;11" begin="1.13s" dur="0.5s" fill="freeze" />
              <animate attributeName="ry" values="1;4.5" begin="1.13s" dur="0.5s" fill="freeze" />
            </ellipse>
          )}

          {/* far-side fielders and keeper (drawn before the striker) */}
          {FIELD.map((f, i) =>
            f.y < 200 ? (
              <Place key={i} x={f.x} y={f.y} className={`st-fielder ${p?.chase?.index === i ? "st-chaser" : ""}`}>
                <g className="st-move" style={
                    p?.chase?.index === i
                      ? ({ "--dx": `${p.chase.dx}px`, "--dy": `${p.chase.dy}px` } as any)
                      : ({ "--wx": `${r1(((400 - f.x) / Math.hypot(400 - f.x, 280 - f.y)) * 9)}px`, "--wy": `${r1(((280 - f.y) / Math.hypot(400 - f.x, 280 - f.y)) * 9)}px` } as any)
                  }>
                  <Cricketer kind="fielder" kit={bowlColor} />
                </g>
              </Place>
            ) : null,
          )}
          <Place x={KEEPER.x} y={KEEPER.y} className="st-keeper">
            <g className="st-move">
              <Cricketer kind="keeper" kit={bowlColor} />
            </g>
          </Place>

          {/* striker */}
          <Place x={STRIKER.x} y={STRIKER.y} className="st-striker">
            <g className="st-move" style={{ "--run": `${r1((NON_STRIKER.y - STRIKER.y - 4) / scaleAt(STRIKER.y))}px`, "--cycles": runCycles } as any}>
              <Cricketer kind="batter" kit={batColor} />
            </g>
          </Place>

          {/* ball: delivery, shot (shadow + ball), throw */}
          {p && (
            <g className="st-ball-layer">
              <circle r="3.2" fill="#f7f2e1" stroke="#c8352c" strokeWidth=".9" opacity="0">
                <set attributeName="opacity" to="1" begin="0.9s" />
                <set attributeName="opacity" to={["bowled", "lbw"].includes(p.kind) ? "1" : "0"} begin="1.3s" />
                <set attributeName="opacity" to="0" begin="2.4s" />
                <animateMotion path={p.delivery} begin="0.9s" dur="0.4s" fill="freeze" keyPoints="0;0.58;1" keyTimes="0;0.6;1" calcMode="linear" />
              </circle>
              {!["bowled", "lbw"].includes(p.kind) && (
                <>
                  <ellipse rx="3.4" ry="1.4" fill="#000" opacity="0">
                    <set attributeName="opacity" to=".35" begin="1.3s" />
                    <set attributeName="opacity" to="0" begin={`${r1(1.3 + p.shotDur + 0.5)}s`} />
                    <animateMotion path={p.ground} begin="1.3s" dur={`${p.shotDur}s`} fill="freeze" />
                  </ellipse>
                  <circle className="st-ball" r={p.lift ? 3.8 : 3.2} fill="#f7f2e1" stroke="#c8352c" strokeWidth=".8" opacity="0">
                    <set attributeName="opacity" to="1" begin="1.3s" />
                    <set attributeName="opacity" to="0" begin={p.kind === "runout" ? "1.95s" : `${r1(1.3 + p.shotDur + 0.6)}s`} />
                    <animateMotion path={p.air} begin="1.3s" dur={`${p.shotDur}s`} fill="freeze" />
                  </circle>
                  <path className="st-trail" d={p.air} fill="none" stroke="#fff8d6" strokeWidth="1.4" strokeDasharray="3 6" pathLength={100} />
                </>
              )}
              {p.kind !== "dot" && !p.lift && p.kind !== "runout" && event && !event.out && (
                <g className="st-impact" transform={`translate(${CONTACT.x} ${CONTACT.y})`}>
                  <path d="M0-9 2-2 9 0 2 2 0 9-2 2-9 0-2-2Z" fill="#fff6c9" opacity="0">
                    <animate attributeName="opacity" values="0;1;0" begin="1.28s" dur="0.28s" />
                  </path>
                </g>
              )}
              {p.kind === "runs" && (
                <circle r="2.8" fill="#f7f2e1" stroke="#c8352c" strokeWidth=".8" opacity="0">
                  <set attributeName="opacity" to="1" begin={`${r1(1.3 + p.shotDur + 0.6)}s`} />
                  <set attributeName="opacity" to="0" begin={`${r1(1.3 + p.shotDur + 1.15)}s`} />
                  <animateMotion
                    path={`M${r1(p.target.x)} ${r1(p.target.y)} Q${r1((p.target.x + 400) / 2)} ${r1((p.target.y + 150) / 2 - 46)} 400 150`}
                    begin={`${r1(1.3 + p.shotDur + 0.6)}s`}
                    dur="0.5s"
                    fill="freeze"
                  />
                </circle>
              )}
              {p.throwPath && (
                <circle r="2.6" fill="#f7f2e1" stroke="#c8352c" strokeWidth=".8" opacity="0">
                  <set attributeName="opacity" to="1" begin="1.95s" />
                  <animateMotion path={p.throwPath} begin="1.95s" dur="0.32s" fill="freeze" />
                </circle>
              )}
            </g>
          )}

          {/* near-side fielders */}
          {FIELD.map((f, i) =>
            f.y >= 200 ? (
              <Place key={i} x={f.x} y={f.y} className={`st-fielder ${p?.chase?.index === i ? "st-chaser" : ""}`}>
                <g className="st-move" style={
                    p?.chase?.index === i
                      ? ({ "--dx": `${p.chase.dx}px`, "--dy": `${p.chase.dy}px` } as any)
                      : ({ "--wx": `${r1(((400 - f.x) / Math.hypot(400 - f.x, 280 - f.y)) * 9)}px`, "--wy": `${r1(((280 - f.y) / Math.hypot(400 - f.x, 280 - f.y)) * 9)}px` } as any)
                  }>
                  <Cricketer kind="fielder" kit={bowlColor} number={i + 3} />
                </g>
              </Place>
            ) : null,
          )}

          {/* non-striker, bowler, umpire */}
          <Place x={NON_STRIKER.x} y={NON_STRIKER.y} className="st-nonstriker">
            <g className="st-move" style={{ "--run": `${r1(-(NON_STRIKER.y - STRIKER.y - 4) / scaleAt(NON_STRIKER.y))}px`, "--cycles": runCycles } as any}>
              <Cricketer kind="batter" kit={batColor} />
            </g>
          </Place>
          <Place x={UMPIRE.x} y={UMPIRE.y} className="st-umpire">
            <g className="st-move">
              <Cricketer kind="umpire" kit="#f3f1ea" />
            </g>
          </Place>
          <Place x={BOWLER.x} y={BOWLER.y} className="st-bowler">
            <g className="st-move">
              <Cricketer kind="bowler" kit={bowlColor} number={9} />
            </g>
          </Place>

          {/* six fireworks */}
          {p?.kind === "six" && (
            <g transform={`translate(${r1(p.target.x)} ${r1(p.target.y)})`}>
             <g className="st-fireworks">
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1={r1(Math.cos(a) * 6)}
                    y1={r1(Math.sin(a) * 6)}
                    x2={r1(Math.cos(a) * 34)}
                    y2={r1(Math.sin(a) * 34)}
                    stroke={["#ffe27a", batColor, "#ffffff", "#c9f66b"][i % 4]}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                );
              })}
             </g>
            </g>
          )}
        </g>
      </svg>
      <div className="st-result" aria-hidden={!event}>
        <strong>
          {!event
            ? ""
            : event.out
              ? "WICKET!"
              : runs === 6
                ? "SIX!"
                : runs === 4
                  ? "FOUR!"
                  : runs === 0
                    ? "DOT BALL"
                    : `${runs} RUN${runs === 1 ? "" : "S"}`}
        </strong>
        <span>
          {event
            ? event.natural === "jaffa"
              ? `UNPLAYABLE · ${event.shot.toUpperCase()}`
              : event.natural === "loose"
                ? "LOOSE BALL · SURVIVES"
                : event.out
                  ? event.shot.toUpperCase()
                  : runs >= 4
                    ? `${event.shot} · BOUNDARY`
                    : event.shot
            : ""}
        </span>
      </div>
      {event && bowlerInfo && batterInfo && (
        <div className="st-chip">
          <b>{Number(pace).toFixed(1)} km/h</b>
          {bowlerInfo.name.split(" ").slice(-1)[0]} to {batterInfo.name.split(" ").slice(-1)[0]}
          {style && <em>{style}</em>}
        </div>
      )}
      {!event && (
        <div className="st-idle-note">
          <span className="live-dot" /> Bowler at the top of the mark. Roll to start the over.
        </div>
      )}
    </div>
  );
}
export default Stadium;
