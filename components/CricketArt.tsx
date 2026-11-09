import { PLAYERS } from '../lib/game.mjs';
export function BoardArt(){return <div className="board-art" aria-hidden="true">
 <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
 <div className="floating-label"><span className="live-dot"/> YOUR NEXT BIG RIVALRY</div>
 <div className="art-board"><div className="art-board-inner"><div className="art-pitch"><i/><i/><i/><b>CREASE</b><i/><i/><i/></div></div>{Array.from({length:24},(_,i)=>{let x=0,y=0;if(i<7){x=i;y=0}else if(i<13){x=6;y=i-6}else if(i<19){x=18-i;y=6}else{x=0;y=24-i}return <div key={i} className={`art-tile tile-${i%4}`} style={{left:`${x*14.285}%`,top:`${y*14.285}%`}}><span>{[0,6,12,18].includes(i)?['✦','♛','↗','⚡'][i%4]:i%3===0?'6':i%2===0?'•':'♞'}</span></div>})}<div className="art-token token-a"/><div className="art-token token-b"/></div>
 <div className="art-die die-one">⚄</div><div className="art-die die-two">⚂</div>
 <div className="hero-player"><img src={PLAYERS[0].photo} alt=""/><span>VIRAT KOHLI <b>98</b></span></div>
 <div className="mini-ticket"><span>THE DREAM TEAM</span><strong>One roll away.</strong><i>✦</i></div>
 </div>}
export function ModeArt({mode}:{mode:string}){return <div className={`mode-art mode-art-${mode}`} aria-hidden="true">{mode==='auction'?<><div className="tiny-card back-card">♞</div><div className="tiny-card front-card"><img src={PLAYERS[0].photo} alt=""/><span>V. KOHLI</span><b>98</b></div><div className="tiny-bid">SOLD! <span>₹ 3.2 Cr</span></div><div className="gavel">♟</div></>:mode==='draft'?<><div className="draft-route"/><div className="route-dot dot-one"/><div className="route-dot dot-two"/><div className="route-dot dot-three"/><div className="mode-die">⚄</div><div className="draft-player"><img src={PLAYERS[1].photo} alt=""/></div><div className="draft-plus">+</div></>:<><div className="mini-board">{Array.from({length:16},(_,i)=><i key={i} style={{background:['#557352','#a6b98c','#7a8859','#cfb87a'][i%4]}}/>)}<span>♛</span></div><div className="monopoly-badge">+6<span>RUNS</span></div></>}</div>}
function Person({color,helmet=false,bat=false}:{color:string;helmet?:boolean;bat?:boolean}){return <>
 <ellipse cy="3" rx="10" ry="3.5" fill="#07180c" opacity=".4"/>
 <path d="M-3-8-5 0M3-8 5 0" stroke="#e7eee1" strokeWidth="4" strokeLinecap="round"/>
 <path d="M-4-8-5-16Q0-22 5-16L4-8Z" fill={color}/>
 <path d="m-5-16-5 7m15-7 4 6" stroke={color} strokeWidth="4" strokeLinecap="round"/>
 <circle cy="-25" r="5.5" fill="#c9a27e"/>
 {helmet&&<path d="M-6-24a6 6 0 0 1 12 0v3H-6Z" fill="#19354b"/>}
 {helmet&&<path d="M-5-20h10" stroke="#9caeb8" strokeWidth="1"/>}
 {bat&&<path className="batter-bat" d="m-9-10-6 13" stroke="#dec78f" strokeWidth="4.5" strokeLinecap="round"/>}
 </>}
export function Field({event,batColor='#caff55',bowlColor='#79a9f5'}:{event?:any;batColor?:string;bowlColor?:string}){
 const runnable=!!event&&!event.out&&[1,2,3].includes(event.runs);
 const shotPath=event?.shotPath||'M304 286 Q310 240 301 187 Q200 140 100 85';
 const fielders=[[347,145],[219,165],[132,208],[465,177],[107,300],[487,301],[181,371],[420,369],[389,239]];
 const runs=event?.runs||0;
 return <div className={`field-scene ${runnable?'has-runs':''} ${event?.out?'has-wicket':''} ${runs>=4?'has-boundary':''}`} key={event?.id||'field'}>
  <div className="stadium-lights"><i/><i/><i/><i/></div><div className="stadium-stands"><span>CREASE CRICKET CLUB</span></div>
  <svg viewBox="0 0 600 470" role="img" aria-label={event?`${event.shot}: ${event.out?'wicket':runs+' runs'}${runnable?', batters running':runs>=4?', boundary, no running':''}`:'Cricket field with striker, non-striker, bowler and wicketkeeper'}>
   <defs><radialGradient id="grass"><stop stopColor="#466b49"/><stop offset="1" stopColor="#1c392b"/></radialGradient><pattern id="stripes" width="600" height="60" patternUnits="userSpaceOnUse"><rect width="600" height="30" fill="#fff" opacity=".035"/></pattern></defs>
   <ellipse cx="300" cy="240" rx="279" ry="207" fill="#10221a" stroke="#4d6046" strokeWidth="10"/><ellipse cx="300" cy="240" rx="265" ry="195" fill="url(#grass)"/><ellipse cx="300" cy="240" rx="265" ry="195" fill="url(#stripes)"/><ellipse cx="300" cy="240" rx="247" ry="180" fill="none" stroke="#b1c5a6" strokeWidth="2" opacity=".65"/><ellipse cx="300" cy="240" rx="110" ry="88" fill="none" stroke="#a3b99b" strokeDasharray="4 7" opacity=".4"/>
   <rect x="275" y="154" width="50" height="176" rx="3" fill="#ae996d"/><rect x="280" y="154" width="40" height="176" fill="#cdb989"/>
   <path d="M274 171h52M267 187h66M281 171v30m38-30v30M274 314h52M267 296h66M281 284v30m38-30v30" stroke="#fcf5db" strokeWidth="1.8" fill="none"/>
   <path d="M289 187h22M289 296h22" stroke="#f8f3dd" strokeWidth="3"/>
   {[171,314].map((y,end)=><g key={y} aria-label={end===0?'Striker stumps':'Bowler stumps'}>{[294,300,306].map((x,i)=><line key={x} className={event?.shot==='Bowled'&&end===0||event?.shot==='Run out'&&end===1?'broken-stump':''} style={{transformOrigin:`${x}px ${y}px`,animationDelay:`${1.15+i*.025}s`}} x1={x} x2={x} y1={y} y2={y-14} stroke="#f5e8c7" strokeWidth="2.8" strokeLinecap="round"/>)}<path className={event?.shot==='Bowled'&&end===0||event?.shot==='Run out'&&end===1?'broken-bails':''} d={`M292 ${y-15}h16`} stroke="#f5e8c7" strokeWidth="2"/></g>)}
   {fielders.map(([x,y],i)=><g key={i} transform={`translate(${x},${y})`}><Person color={bowlColor}/></g>)}
   <g transform="translate(300,132)" aria-label="Wicketkeeper behind the striker"><Person color={bowlColor}/><path d="m-9-9 4 1m14-1-4 1" stroke="#d5e6bd" strokeWidth="5" strokeLinecap="round"/></g>
   <g className={event?'bowler-delivery':''} transform="translate(315,360)" aria-label="Bowler approaching the bowling crease"><Person color={bowlColor}/><path className={event?'bowling-arm':''} d="M-4-16-11-30" stroke={bowlColor} strokeWidth="4" strokeLinecap="round"/></g>
   <g className={runnable?'crease-runner striker-runner':event&&!event.out?'striker-swing':''} style={runnable?{animationIterationCount:runs}:undefined} transform="translate(319,187)" aria-label="Striker at the popping crease"><Person color={batColor} helmet bat/></g>
   <g className={runnable?'crease-runner nonstriker-runner':''} style={runnable?{animationIterationCount:runs}:undefined} transform="translate(335,296)" aria-label="Non-striker beside the pitch"><Person color={batColor} helmet bat/></g>
   {event&&<><path className="ball-trail revised-trail" d={shotPath} fill="none" stroke="#edf2b8" strokeWidth="1.8" strokeDasharray="4 7"/><circle className="cricket-ball delivered-ball" style={{offsetPath:`path('${shotPath}')`}} r="4" fill="#fff9dc" stroke="#ddf0a8" strokeWidth=".7"/></>}
   <text x="300" y="425" textAnchor="middle" fill="#b7c9a3" fontSize="11" letterSpacing="5" opacity=".65">THE CREASE ARENA</text>
  </svg>
  <div className={`field-result ${event?'visible':''}`}><strong>{event?.out?'WICKET':runs===6?'SIX!':runs===4?'FOUR!':runs===0?'DOT BALL':`+${runs}`}</strong><span>{event?.shot||'Waiting for the first ball'}{runs>=4?' · BOUNDARY':''}</span></div>
 </div>
}
