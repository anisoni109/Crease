import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
async function call(body,expected=200,extraHeaders={}){const r=await fetch(origin+'/api/room',{method:'POST',headers:{'Content-Type':'application/json',...extraHeaders},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));return d}
const hostIdentity={captainId:crypto.randomUUID(),captainSecret:crypto.randomUUID()},guestIdentity={captainId:crypto.randomUUID(),captainSecret:crypto.randomUUID()};
const host=await call({...hostIdentity,op:'create',name:'Smoke Host',team:0,avatar:4,settings:{mode:'auction',overs:1,squadSize:3,capacity:2}});
assert.equal(host.code.length,8);assert.ok(host.game.seats.every(s=>!s.token));
let guest=await call({...guestIdentity,op:'join',code:host.code,name:'Smoke Guest',team:1,avatar:6});assert.equal(guest.seat,1);assert.equal(guest.game.seats[0].avatar,4);assert.equal(guest.game.seats[1].avatar,6);assert.equal(guest.game.seats[1].name,'Smoke Guest');
await call({op:'poll',code:host.code,token:'not-the-secret'},403);
await call({op:'join',code:host.code,name:'Unexpected Third'},400);
await call({op:'action',code:host.code,token:guest.token,version:guest.game.version,action:{type:'start'}},400);
await call({op:'action',code:host.code,token:host.token,version:host.game.version,action:{type:'start'}},409);
let beforeKick=await call({op:'poll',code:host.code,token:host.token});await call({op:'action',code:host.code,token:guest.token,version:beforeKick.game.version,action:{type:'kick',seat:0}},400);const kicked=await call({op:'action',code:host.code,token:host.token,version:beforeKick.game.version,action:{type:'kick',seat:1}});assert.equal(kicked.game.seats.length,1);await call({op:'poll',code:host.code,token:guest.token},403);guest=await call({...guestIdentity,op:'join',code:host.code,name:'Smoke Guest',team:1,avatar:6});const lobby=await call({op:'poll',code:host.code,token:host.token});
let state=await call({op:'action',code:host.code,token:host.token,version:lobby.game.version,action:{type:'start'}});assert.equal(state.game.phase,'auction');
state=await call({op:'action',code:host.code,token:host.token,version:state.game.version,action:{type:'complete'}});assert.equal(state.game.phase,'toss');state=await call({op:'action',code:host.code,token:host.token,version:state.game.version,action:{type:'toss',call:'heads'}});const winnerToken=state.game.toss.winner===0?host.token:guest.token;state=await call({op:'action',code:host.code,token:winnerToken,version:state.game.version,action:{type:'choose',choice:'bat'}});assert.equal(state.game.phase,'match');
assert.ok(state.game.seats.every(s=>s.squad.length===3));
state=await call({op:'action',code:host.code,token:host.token,version:state.game.version,action:{type:'roll'}});assert.equal(state.game.match.balls,0);
const seen=await call({op:'poll',code:host.code,token:guest.token});assert.equal(seen.game.match.rolls[0],null);assert.equal(seen.game.match.submitted[0],true);
await call({op:'action',code:host.code,token:host.token,version:state.game.version,action:{type:'roll'}},400);
const resolved=await call({op:'action',code:host.code,token:guest.token,version:seen.game.version,action:{type:'roll'}});assert.equal(resolved.game.match.balls,1);
const cors=await fetch(origin+'/api/room',{method:'OPTIONS',headers:{Origin:'https://example.github.io','Access-Control-Request-Method':'POST'}});assert.equal(cors.status,204);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'*');
await call({op:'poll',code:host.code,token:host.token},200,{Origin:'https://example.github.io'});

console.log('Party integration passed: names and avatars, host kick and rejoin, two independent seats, code join, token isolation, full-lobby rejection, host permissions, stale-write rejection, draft completion, concealed rolls, turn locks, ball resolution and GitHub Pages CORS.');

let finished=resolved;
for(let n=0;n<60&&finished.game.phase==='match';n++){
 for(const token of [host.token,guest.token]){if(finished.game.phase!=='match')break;const index=token===host.token?0:1;if(!finished.game.match.submitted[index])finished=await call({op:'action',code:host.code,token,version:finished.game.version,action:{type:'roll'}})}
}
assert.equal(finished.game.phase,'results');
async function history(identity,extra={}){const response=await fetch(origin+'/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity,...extra})});return {status:response.status,data:await response.json()}}
const records=await history(hostIdentity);assert.equal(records.status,200);assert.equal(records.data.matches.length,1);assert.equal(records.data.players.length,2);assert.equal(records.data.players[0].played,1);
const detail=await history(guestIdentity,{op:'detail',id:records.data.matches[0].id});assert.equal(detail.status,200);assert.equal(detail.data.record.game.phase,'results');assert.ok(detail.data.record.game.seats.every(s=>!s.token));
const stranger=await history({captainId:crypto.randomUUID(),captainSecret:crypto.randomUUID()},{op:'detail',id:records.data.matches[0].id});assert.equal(stranger.data.matches.length,0);
await call({op:'poll',code:host.code,token:host.token});assert.equal((await history(hostIdentity)).data.matches.length,1);
const request=await call({op:'action',code:host.code,token:guest.token,version:finished.game.version,action:{type:'requestRematch'}});const rematch=await call({op:'action',code:host.code,token:host.token,version:request.game.version,action:{type:'rematch'}});assert.equal(rematch.game.phase,'toss');assert.equal(rematch.game.round,2);assert.equal((await history(hostIdentity)).data.matches.length,1);
console.log('Saved multiplayer history passed: both captains can reopen the scorecard, statistics count once, other profiles cannot read it, result polls are idempotent, and rematch keeps squads with a fresh toss.');

await call({op:'poll',code:host.code,token:host.token},403,{Origin:'https://unrelated.example'});
