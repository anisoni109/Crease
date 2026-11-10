import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYERS,createGame,makeSeat,act,start,aiAction,player,price,budget,publicGame,scoreRuns,bowlerLimit,bowlingOptions,squadAdvice,arrangedSquad,minimumBudget} from '../lib/game.mjs';
function rng(seed=81){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function setup(mode='auction',opts={}){let g=createGame({mode,overs:1,squadSize:3,capacity:2,...opts},makeSeat('First',0,'secret-a'));g.seats.push(makeSeat('Second',1,'secret-b'));return g}

function settleToss(g){if(g.phase!=='toss')return g;g=act(g,0,{type:'toss',call:'heads'},()=>0);return act(g,0,{type:'choose',choice:'bat'})}
function complete(g){return settleToss(act(g,0,{type:'complete'}))}
test('200 unique players have real sources, skill tiers and local portraits',()=>{assert.equal(PLAYERS.length,200);assert.equal(new Set(PLAYERS.map(p=>p.id)).size,200);assert.ok(PLAYERS.every(p=>p.source.startsWith('https://www.iplt20.com/')&&p.photo.startsWith('./players/')))});
test('settings and budgets scale with capacity and squad size',()=>{let g=setup('monopoly',{squadSize:11,capacity:4});assert.ok(budget(g.settings)>budget(setup().settings));assert.ok(price(PLAYERS[0],g.settings)>price(PLAYERS[0],setup().settings))});
test('auction resolves winner, debits the correct team and rejects another captain',()=>{let g=start(setup(),rng());const id=g.auction.id,cost=price(player(id),g.settings),bank=g.seats[0].bank;assert.throws(()=>act(g,1,{type:'bid'}),/another captain/);g=act(g,0,{type:'bid'});g=act(g,1,{type:'pass'});assert.ok(g.seats[0].squad.includes(id));assert.equal(g.seats[0].bank,Math.round((bank-cost)*10)/10);assert.equal(g.seats[1].bank,bank)});
test('auction payments preserve nonnegative balances and allow a balanced completion',()=>{let g=start(setup('auction',{squadSize:11}),rng());for(let n=0;n<20&&g.phase==='auction';n++){try{g=act(g,g.active,{type:'bid'})}catch{g=act(g,g.active,{type:'pass'})}}g=complete(g);g=settleToss(g);assert.equal(g.phase,'match');assert.ok(g.seats.every(s=>s.squad.length===11&&s.bank>=0));assert.equal(new Set(g.seats.flatMap(s=>s.squad)).size,22)});
test('all-pass auctions terminate with completed squads',()=>{let g=start(setup(),rng());for(let n=0;n<450&&g.phase==='auction';n++)g=act(g,g.active,{type:'pass'});assert.equal(g.phase,'toss');g=settleToss(g);assert.equal(g.phase,'match');assert.ok(g.seats.every(s=>s.squad.length===3))});
test('draft has a finite fallback even if every player is passed',()=>{let g=start(setup('draft'),rng(21)),r=rng(6);for(let n=0;n<300&&g.phase==='draft';n++)g=act(g,g.active,{type:g.pending?'pass':'roll'},r);assert.equal(g.phase,'toss');g=settleToss(g);assert.equal(g.phase,'match');assert.ok(g.seats.every(s=>s.squad.length===3))});
test('draft purchases debit budget, add to squad and rotate turn',()=>{let g=start(setup('draft'),rng());g=act(g,0,{type:'roll'},()=>0);assert.ok(g.pending);const id=g.board[g.pending.index].id;g=act(g,0,{type:'buy'});assert.ok(g.seats[0].squad.includes(id));assert.equal(g.active,1);assert.equal(g.pending,null)});
test('monopoly owned player pays runs, rival transfers runs, score never negative',()=>{let g=start(setup('monopoly'),rng());g.board[2]={kind:'player',id:PLAYERS[0].id,owner:null};g=act(g,0,{type:'roll'},()=>0);g=act(g,0,{type:'buy'});assert.equal(g.board[2].owner,0);assert.equal(g.seats[0].score,6);g.seats[1].score=4;g=act(g,1,{type:'roll'},()=>0);assert.equal(g.seats[1].score,0);assert.equal(g.seats[0].score,10);g.seats[0].position=0;g=act(g,0,{type:'roll'},()=>0);assert.equal(g.seats[0].score,19)});
test('no ball adds a run and a free roll; wickets deduct runs',()=>{let g=start(setup('monopoly'),rng());g.board[2]={kind:'no-ball',label:'NO BALL'};g=act(g,0,{type:'roll'},()=>0);assert.equal(g.active,0);assert.equal(g.seats[0].score,1);assert.equal(g.seats[0].balls,0);g.board[4]={kind:'out',label:'BOWLED'};g=act(g,0,{type:'roll'},()=>0);assert.equal(g.seats[0].score,0);assert.equal(g.seats[0].wickets,1);assert.equal(g.active,1)});
test('both captains must roll once; lower bat total is a wicket',()=>{let g=start(setup(),rng());g=complete(g);g.seats[0].squad[0]=PLAYERS.find(p=>p.batTier==='gray').id;g.seats[1].squad[0]=PLAYERS.find(p=>p.bowlTier==='gold').id;g.match.bowler=0;g=act(g,0,{type:'roll'},()=>0);assert.equal(g.match.balls,0);assert.throws(()=>act(g,0,{type:'roll'}),/already rolled/);g=act(g,1,{type:'roll'},()=>.999);assert.equal(g.match.balls,1);assert.equal(g.match.wickets,1);assert.equal(g.match.last.out,true);assert.equal(g.match.scores[0],0);assert.deepEqual(g.match.rolls,[null,null])});
test('equal totals give a dot; runs equal the difference of modified totals',()=>{let g=start(setup(),rng());g=complete(g);g.seats[0].squad[0]=PLAYERS.find(p=>p.batTier==='gold').id;g.seats[1].squad[0]=PLAYERS.find(p=>p.bowlTier==='gold').id;g.match.bowler=0;g=act(g,0,{type:'roll'},()=>0);g=act(g,1,{type:'roll'},()=>.34);assert.equal(g.match.last.runs,0);assert.equal(g.match.last.out,false);g=act(g,0,{type:'roll'},()=>.999);g=act(g,1,{type:'roll'},()=>0);assert.equal(g.match.last.runs,6);assert.equal(g.match.balls,2)});
test('dismissed batters and locked dice cannot be changed',()=>{let g=start(setup(),rng());g=complete(g);g.match.dismissed=[0];assert.throws(()=>act(g,0,{type:'select',index:0}),/already out/);g=act(g,0,{type:'roll'},()=>0);assert.throws(()=>act(g,0,{type:'select',index:1}),/already locked/)});
test('public state strips secrets and conceals an opponent die',()=>{let g=start(setup(),rng());g=complete(g);g=act(g,1,{type:'roll'},()=>.9);const p=publicGame(g,0);assert.ok(p.seats.every(s=>!('token'in s)));assert.equal(p.match.rolls[1],null);assert.equal(p.match.submitted[1],true);assert.equal(g.match.rolls[1],6)});
test('seeded full matches finish and highest runs win, across all three modes',()=>{for(const mode of ['auction','draft','monopoly'])for(let seed=1;seed<=15;seed++){const r=rng(seed);let g=setup(mode);g.seats.forEach(s=>s.ai=true);g=start(g,r);let steps=0;while(g.phase!=='results'&&steps++<1500){const next=aiAction(g);assert.ok(next,`AI stalled in ${g.phase}`);g=act(g,next.actor,next.action,r);assert.ok(g.seats.every(s=>s.bank>=0&&s.score>=0));}assert.equal(g.phase,'results',`${mode} seed ${seed} stalled`);const scores=mode==='monopoly'?g.seats.map(s=>s.score):g.match.scores;if(g.winner>=0)assert.equal(scores[g.winner],Math.max(...scores));}});
test('four-captain monopoly ends only when every captain has used all rolls',()=>{let g=setup('monopoly',{capacity:4});g.seats.push(makeSeat('Third',2,'c',true),makeSeat('Fourth',3,'d',true));g.seats.forEach(s=>s.ai=true);const r=rng(9);g=start(g,r);for(let n=0;n<400&&g.phase!=='results';n++){const next=aiAction(g);g=act(g,next.actor,next.action,r)}assert.equal(g.phase,'results');assert.ok(g.seats.every(s=>s.balls===6))});
test('every franchise combination produces a complete Monopoly board',()=>{for(let a=0;a<10;a++)for(let b=a;b<10;b++){const g=setup('monopoly');g.seats[0].team=a;g.seats[1].team=b;start(g,rng());assert.equal(g.board.length,32);const ids=g.board.filter(t=>t.kind==='player').map(t=>t.id);assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);assert.ok(ids.every(id=>player(id)))}});
test('a selected last-slot batter is replaced by an available teammate when out',()=>{let g=start(setup(),rng());g=complete(g);g.seats[0].squad[2]=PLAYERS.find(p=>p.batTier==='gray').id;g.seats[1].squad[0]=PLAYERS.find(p=>p.bowlTier==='gold').id;g.match.bowler=0;g=act(g,0,{type:'select',index:2});g=act(g,0,{type:'roll'},()=>0);g=act(g,1,{type:'roll'},()=>.999);assert.ok(g.match.dismissed.includes(2));assert.notEqual(g.match.batter,2);assert.ok(!g.match.dismissed.includes(g.match.batter))});

test('every resolved ball counts once and shot directions vary',()=>{const r=rng(110);let g=start(setup('auction',{overs:2,squadSize:11}),r);g=complete(g);const paths=[];for(let n=0;n<8;n++){const before=g.match.history.length;g=act(g,0,{type:'roll'},r);assert.equal(g.match.history.length,before);g=act(g,1,{type:'roll'},r);assert.equal(g.match.history.length,before+1);assert.equal(g.match.balls,n+1);if(!g.match.last.natural)assert.equal(g.match.last.runs,g.match.last.out?0:scoreRuns(g.match.last.batTotal,g.match.last.bowlTotal));paths.push(g.match.last.shotPath)}assert.ok(new Set(paths).size>3)});
test('each lobby captain can change their own name and avatar',()=>{let g=setup();g=act(g,1,{type:'identity',name:'Guest Captain',avatar:6});assert.equal(g.seats[1].name,'Guest Captain');assert.equal(g.seats[1].avatar,6);assert.equal(g.seats[0].name,'First');assert.throws(()=>act(g,1,{type:'identity',name:'',avatar:0}),/name/);g=start(g,rng());assert.throws(()=>act(g,1,{type:'identity',name:'Later',avatar:0}),/locked/)});

test('only the host may adjust overs and squad size in the lobby',()=>{let g=setup();assert.throws(()=>act(g,1,{type:'settings',overs:5,squadSize:7}),/host/);g=act(g,0,{type:'settings',overs:5,squadSize:7});assert.equal(g.settings.overs,5);assert.equal(g.settings.squadSize,7);g=start(g,rng());assert.throws(()=>act(g,0,{type:'settings',overs:1,squadSize:3}),/host/)});

test('cricket run conversion caps at six and turns five into four',()=>{assert.equal(scoreRuns(8,5),3);assert.equal(scoreRuns(8,3),4);assert.equal(scoreRuns(9,2),6);assert.equal(scoreRuns(9,-1),6);assert.equal(scoreRuns(4,5),0);assert.equal(scoreRuns(4,4),0);assert.deepEqual(Array.from({length:11},(_,n)=>scoreRuns(n,0)),[0,1,2,3,4,4,6,6,6,6,6])});
test('the host can kick a guest, while guests cannot kick anyone',()=>{let g=setup();assert.throws(()=>act(g,1,{type:'kick',seat:0}),/host/);assert.throws(()=>act(g,0,{type:'kick',seat:0}),/host cannot/);g=act(g,0,{type:'kick',seat:1});assert.equal(g.seats.length,1);assert.equal(g.seats[0].name,'First')});
test('bowlers finish their over and rotate within the over quota',()=>{let g=start(setup('auction',{overs:5,squadSize:11}),rng());g=complete(g);g.seats[0].squad.fill(PLAYERS.find(p=>p.batTier==='gold').id);g.seats[1].squad.fill(PLAYERS.find(p=>p.bowlTier==='gray').id);g.match.batter=0;g.match.bowler=0;const roll=actor=>{g=act(g,actor,{type:'roll'},actor===0?()=>.999:()=>0)};roll(0);roll(1);assert.throws(()=>act(g,1,{type:'select',index:1}),/completes/);for(let n=1;n<6;n++){roll(0);roll(1)}assert.equal(g.match.balls,6);assert.equal(g.match.bowlerBalls[1][0],6);assert.notEqual(g.match.bowler,0);assert.equal(bowlerLimit(g.settings),1);assert.ok(!bowlingOptions(g,1).includes(0));assert.throws(()=>act(g,1,{type:'select',index:0}),/limit/)});
test('autoplay submits one roll per captain and stops after selected overs',()=>{let g=start(setup('auction',{overs:5,squadSize:11}),rng());g=complete(g);g.seats[0].squad.fill(PLAYERS.find(p=>p.batTier==='gold').id);g.seats[1].squad.fill(PLAYERS.find(p=>p.bowlTier==='gray').id);g.match.batter=0;g.match.bowler=0;g=act(g,0,{type:'autoplay',overs:1});g=act(g,1,{type:'autoplay',overs:1});let n=0;while(aiAction(g)&&n++<30){const next=aiAction(g);g=act(g,next.actor,next.action,next.actor===0?()=>.999:()=>0)}assert.equal(n,12);assert.equal(g.match.balls,6);assert.equal(g.match.history.length,6);assert.equal(g.seats[0].autoBalls,0);assert.equal(g.seats[1].autoBalls,0);assert.equal(aiAction(g),null)});
test('squad advice identifies missing batting and bowling depth',()=>{let g=setup('auction',{overs:5,squadSize:5});g.seats[0].squad=PLAYERS.filter(p=>p.bat>=90&&p.bowl<68).slice(0,5).map(p=>p.id);const advice=squadAdvice(g,0);assert.equal(advice.bowlers,0);assert.ok(advice.messages.some(m=>m.includes('bowling')));assert.ok(advice.batters>0)});

test('full-length matches respect bowling capacity for small and full squads',()=>{for(const overs of [2,5,20])for(const squadSize of [3,11]){const r=rng(overs*17+squadSize);let g=setup('auction',{overs,squadSize});g.seats.forEach(s=>s.ai=true);g=start(g,r);g=complete(g);for(let n=0;n<1200&&g.phase!=='results';n++){const next=aiAction(g);assert.ok(next);g=act(g,next.actor,next.action,r)}assert.equal(g.phase,'results');for(const stats of g.match.bowlerBalls)for(const balls of Object.values(stats))assert.ok(balls<=bowlerLimit(g.settings)*6);assert.ok(g.match.history.every(b=>[0,1,2,3,4,6].includes(b.runs)))}});

test('custom purse is shared equally and never below squad completion requirements',()=>{let g=setup('auction',{budget:60,squadSize:5});g=start(g,rng());assert.ok(g.seats.every(s=>s.bank===60));const base=price(PLAYERS[0],g.settings);assert.equal(base,price(PLAYERS[0],setup('auction',{squadSize:5}).settings));let small=setup('auction',{budget:1,squadSize:11});assert.equal(small.settings.budget,minimumBudget(small.settings));small=start(small,rng());small=complete(small);assert.ok(small.seats.every(s=>s.squad.length===11&&s.bank>=0))});
test('batter and bowler selectors group roles while retaining squad indices',()=>{let g=start(setup('auction',{squadSize:5}),rng());g=complete(g);g.seats[0].squad=[PLAYERS.find(p=>p.role==='BOWL').id,PLAYERS.find(p=>p.role==='BAT').id,PLAYERS.find(p=>p.role==='AR').id,PLAYERS.find(p=>p.role==='WK').id,PLAYERS.filter(p=>p.role==='BOWL')[1].id];let arranged=arrangedSquad(g,0);assert.equal(arranged[0].group,'Batters & keepers');assert.equal(arranged.at(-1).group,'Bowlers');assert.ok(arranged.every(e=>g.seats[0].squad[e.index]===e.id));g.match.batting=1;g.match.bowling=0;arranged=arrangedSquad(g,0);assert.equal(arranged[0].group,'Bowlers');assert.equal(arranged.at(-1).group,'Batters & keepers');assert.ok(arranged.every(e=>g.seats[0].squad[e.index]===e.id))});
test('CPU skips a surplus batter when its remaining places need bowlers',()=>{let g=setup('auction',{squadSize:5,overs:2});g.seats[1].ai=true;g=start(g,rng());g.seats[1].squad=PLAYERS.filter(p=>p.bat>=80&&p.bowl<68).slice(0,3).map(p=>p.id);g.active=1;g.auction.id=PLAYERS.find(p=>p.bat>=90&&p.bowl<68&&!g.seats[1].squad.includes(p.id)).id;g.auction.bid=0;g.auction.leader=null;g.auction.passed=[];const decision=aiAction(g);assert.equal(decision.action.type,'pass');assert.match(decision.action.reason,/bowl/);g=act(g,decision.actor,decision.action,rng());assert.equal(g.lastAuctionDecision.kind,'pass');assert.ok(g.log.some(l=>l.text.includes('skips')))});
test('CPU may skip an unwanted player even after the human passes',()=>{let g=setup();g.seats[1].ai=true;g=start(g,rng());g.auction.id=PLAYERS.find(p=>p.rating<68).id;const skipped=g.auction.id;g=act(g,0,{type:'pass'});const ai=aiAction(g);assert.equal(ai.action.type,'pass');g=act(g,ai.actor,ai.action,rng());assert.ok(g.seats.every(s=>!s.squad.includes(skipped)));assert.ok(g.log.some(l=>l.text.includes('goes unsold')))});

test('only the toss winner chooses whether to bat or bowl',()=>{let g=start(setup(),rng());g=act(g,0,{type:'complete'});assert.equal(g.phase,'toss');assert.throws(()=>act(g,1,{type:'toss',call:'heads'}),/first captain/);g=act(g,0,{type:'toss',call:'heads'},()=>0);assert.equal(g.toss.coin,'heads');assert.equal(g.toss.winner,0);assert.throws(()=>act(g,1,{type:'choose',choice:'bat'}),/winner/);g=act(g,0,{type:'choose',choice:'bowl'});assert.equal(g.match.batting,1);assert.equal(g.match.bowling,0);assert.equal(g.match.firstBatting,1)});
test('a lost coin call gives the other captain the choice',()=>{let g=start(setup(),rng());g=act(g,0,{type:'complete'});g=act(g,0,{type:'toss',call:'tails'},()=>0);assert.equal(g.toss.winner,1);g=act(g,1,{type:'choose',choice:'bat'});assert.equal(g.match.batting,1);assert.equal(g.toss.choice,'bat')});
test('the chase and result work when seat one bats first',()=>{let g=start(setup(),rng());g=act(g,0,{type:'complete'});g=act(g,0,{type:'toss',call:'heads'},()=>0);g=act(g,0,{type:'choose',choice:'bowl'});g.seats.forEach(s=>s.squad.fill(PLAYERS.find(p=>p.batTier==='gold').id));for(let n=0;n<30&&g.phase==='match';n++){const batting=g.match.batting,bowling=g.match.bowling;g=act(g,batting,{type:'roll'},()=>.999);g=act(g,bowling,{type:'roll'},()=>0)}assert.equal(g.phase,'results');assert.equal(g.winner,-1);assert.deepEqual(g.match.scores,[36,36]);assert.ok(g.match.history.filter(b=>b.innings===0).every(b=>b.batting===1));assert.ok(g.match.history.filter(b=>b.innings===1).every(b=>b.batting===0))});
import {makeRecord,aggregateRecords,scorecard} from '../lib/records.mjs';
test('human auction bids use the actual purse even with many empty slots',()=>{let g=start(setup('auction',{squadSize:11,budget:20}),rng());g.seats[0].bank=20;g.auction.bid=2.8;g.auction.leader=1;g.active=0;g=act(g,0,{type:'bid'});assert.equal(g.auction.bid,3);assert.equal(g.auction.leader,0);g.active=0;g.auction.bid=20;g.auction.leader=1;assert.throws(()=>act(g,0,{type:'bid'}),/actually remaining/)});
test('CPU competes for Gold, declines excessive bids and passes early Blue lots',()=>{let g=start(setup('auction',{squadSize:5,budget:20}),rng());g.seats[1].ai=true;g.active=1;g.auction.id=PLAYERS.find(p=>p.tier==='gold').id;g.auction.bid=0;g.auction.leader=null;assert.equal(aiAction(g).action.type,'bid');g.auction.bid=15;g.auction.leader=0;assert.equal(aiAction(g).action.type,'pass');g.auction.id=PLAYERS.find(p=>p.tier==='blue').id;g.auction.bid=0;g.auction.leader=null;g.auction.cursor=1;assert.equal(aiAction(g).action.type,'pass')});
test('cheap pool supports complete squads at the minimum purse',()=>{assert.ok(PLAYERS.filter(p=>p.base<=.5).length>=30);for(const squadSize of [3,5,7,11]){let g=setup('auction',{squadSize,budget:1});g.seats.forEach(s=>s.ai=true);g=start(g,rng(squadSize));for(let n=0;n<1100&&g.phase==='auction';n++){const next=aiAction(g);g=act(g,next.actor,next.action,rng(n+1))}assert.equal(g.phase,'toss');assert.ok(g.seats.every(s=>s.squad.length===squadSize&&s.bank>=0))}});
test('records total boundaries and bowling correctly, with complete scorecards',()=>{let g=complete(start(setup(),rng()));g.seats.forEach(s=>s.ai=true);const r=rng(167);for(let n=0;n<60&&g.phase!=='results';n++){const next=aiAction(g);g=act(g,next.actor,next.action,r)}assert.equal(g.phase,'results');const record=makeRecord(g,'party:1',1234);assert.ok(record.game.seats.every(s=>!s.token));for(let i=0;i<2;i++){const card=scorecard(g,i),fig=record.seats[i];assert.equal(card.batting.reduce((n,p)=>n+p.runs,0),g.match.scores[i]);assert.equal(card.batting.reduce((n,p)=>n+p.fours,0),fig.fours);assert.equal(card.bowling.reduce((n,p)=>n+p.wickets,0),fig.wickets)}const stats=aggregateRecords([record,makeRecord(g,'party:2')]);assert.ok(stats.every(s=>s.played===2));assert.equal(stats.reduce((n,s)=>n+s.runs,0),2*g.match.scores.reduce((a,b)=>a+b,0))});
test('rematches preserve squads, reset cricket and increment the saved round',()=>{let g=complete(start(setup(),rng()));g.phase='results';g.winner=0;const squads=g.seats.map(s=>[...s.squad]);assert.throws(()=>act(g,1,{type:'rematch'}),/host/);g=act(g,1,{type:'requestRematch'});assert.ok(g.seats[1].rematchRequested);g=act(g,0,{type:'rematch'});assert.equal(g.phase,'toss');assert.equal(g.round,2);assert.equal(g.match,null);assert.equal(g.winner,null);assert.deepEqual(g.seats.map(s=>s.squad),squads);assert.ok(g.seats.every(s=>!s.rematchRequested&&s.autoBalls===0))});

test('auction order is random, logs every lot and alternates the opening bid', async () => {
  const a = start(setup('auction', { squadSize: 3 }), rng(4)), b = start(setup('auction', { squadSize: 3 }), rng(5));
  assert.notDeepEqual(a.auction.pool, b.auction.pool);
  assert.ok(new Set(a.auction.pool.slice(0, 40).map((id) => player(id).tier)).size >= 3, 'tiers are mixed');
  let g = a;
  const first = g.auction.id, opener = g.active;
  g = act(g, g.active, { type: 'pass' });
  g = act(g, g.active, { type: 'pass' });
  assert.equal(g.lastUnsold.player, first);
  assert.deepEqual(g.auction.results[0], { lot: 1, id: first, status: 'unsold', seat: null, amount: 0 });
  assert.notEqual(g.active, opener);
  const second = g.auction.id;
  g = act(g, g.active, { type: 'bid' });
  g = act(g, g.active, { type: 'pass' });
  assert.equal(g.auction.results[1].status, 'sold');
  assert.equal(g.auction.results[1].id, second);
  g = act(g, 0, { type: 'complete' });
  assert.ok(g.auction.results.filter((r) => r.status === 'auto').length >= 4);
});
test('captains can call a player up to the block and sign unsold players directly', async () => {
  const { scoutList, scoutLimit, upcomingLots } = await import('../lib/game.mjs');
  let g = start(setup('auction', { squadSize: 5 }), rng(8));
  const target = g.auction.pool[g.auction.pool.length - 1];
  g = act(g, 1, { type: 'callUp', id: target });
  assert.equal(upcomingLots(g, 1)[0], target);
  assert.throws(() => act(g, 1, { type: 'callUp', id: target }), /already on the way/);
  for (let n = 1; n < scoutLimit(g.settings); n++) g = act(g, 1, { type: 'callUp', id: g.auction.pool[g.auction.pool.length - 1] });
  assert.throws(() => act(g, 1, { type: 'callUp', id: g.auction.pool[g.auction.pool.length - 1] }), /used all/);
  const gone = g.auction.id, bank = g.seats[0].bank;
  g = act(g, g.active, { type: 'pass' });
  g = act(g, g.active, { type: 'pass' });
  assert.ok(scoutList(g).some((r) => r.id === gone && r.status === 'unsold'));
  assert.throws(() => act(g, 0, { type: 'buyUnsold', id: g.auction.id }), /no longer available/);
  g = act(g, 0, { type: 'buyUnsold', id: gone });
  assert.ok(g.seats[0].squad.includes(gone));
  assert.equal(g.seats[0].bank, Math.round((bank - price(player(gone), g.settings)) * 10) / 10);
  assert.equal(g.auction.results.at(-1).direct, true);
});
test('lots nobody can afford are withdrawn, and an overspent captain still gets a full squad', () => {
  let g = start(setup('auction', { squadSize: 3 }), rng(12));
  g.seats.forEach((s) => (s.bank = 1.5));
  g = act(g, g.active, { type: 'pass' });
  g = act(g, g.active, { type: 'pass' });
  for (let n = 0; n < 30 && g.phase === 'auction'; n++) {
    assert.ok(g.seats.some((s) => price(player(g.auction.id), g.settings) <= s.bank), 'every lot shown is affordable');
    g = act(g, g.active, { type: 'pass' });
  }
  assert.ok(g.auction.withdrawn > 0);
  g.seats[0].bank = 0;
  g = act(g, 0, { type: 'complete' });
  assert.ok(g.seats.every((s) => s.squad.length === 3 && s.bank >= 0));
});
test('CPU builds a balanced squad within its purse instead of buying every lot', () => {
  for (const squadSize of [5, 11]) for (const seed of [3, 9]) {
    const r = rng(seed);
    let g = setup('auction', { squadSize, overs: 5 });
    g.seats.forEach((s) => (s.ai = true));
    g = start(g, r);
    let bought = 0, lots = 0;
    for (let n = 0; n < 2500 && g.phase === 'auction'; n++) { const next = aiAction(g); g = act(g, next.actor, next.action, r); }
    assert.equal(g.phase, 'toss');
    lots = g.auction.results.length; bought = g.auction.results.filter((x) => x.status === 'sold').length;
    assert.ok(g.auction.results.some((x) => x.status === 'unsold'), 'the CPU lets players go');
    for (let i = 0; i < 2; i++) { const advice = squadAdvice(g, i); assert.ok(squadSize < 11 || advice.batters >= advice.batTarget - 1 && advice.bowlers >= advice.bowlTarget - 1, `seat ${i} balance ${JSON.stringify(advice)}`); assert.ok(g.seats[i].bank >= 0); }
  }
});
test('natural rolls: a 1 against a 5 or 6 is always out, and a bowler rolling 1 never takes a wicket', () => {
  let g = start(setup(), rng()); g = complete(g);
  g.seats[0].squad[0] = PLAYERS.find((p) => p.batTier === 'gold').id; g.seats[1].squad[0] = PLAYERS.find((p) => p.bowlTier === 'gray').id; g.match.bowler = 0; g.match.batter = 0;
  g = act(g, 0, { type: 'roll' }, () => 0); g = act(g, 1, { type: 'roll' }, () => 0.7);
  assert.equal(g.match.last.out, true); assert.equal(g.match.last.natural, 'jaffa');
  g.seats[0].squad[g.match.batter] = PLAYERS.find((p) => p.batTier === 'gray').id; g.seats[1].squad[0] = PLAYERS.find((p) => p.bowlTier === 'gold').id;
  g = act(g, 0, { type: 'roll' }, () => 0); g = act(g, 1, { type: 'roll' }, () => 0);
  assert.equal(g.match.last.out, false); assert.equal(g.match.last.runs, 0); assert.equal(g.match.last.natural, 'loose');
});
test('monopoly has seven wicket squares and ten wickets ends a captain\'s innings', async () => {
  const { MONOPOLY_WICKETS } = await import('../lib/game.mjs');
  let g = start(setup('monopoly', { overs: 5 }), rng());
  assert.equal(g.board.filter((t) => t.kind === 'out').length, 7);
  g.seats[0].wickets = MONOPOLY_WICKETS - 1; g.board[2] = { kind: 'out', label: 'BOWLED' };
  g = act(g, 0, { type: 'roll' }, () => 0);
  assert.equal(g.seats[0].wickets, MONOPOLY_WICKETS);
  for (let n = 0; n < 80 && g.phase !== 'results'; n++) { assert.equal(g.active, 1); g = act(g, 1, { type: g.pending ? 'pass' : 'roll' }, rng(n)); }
  assert.equal(g.phase, 'results');
});
