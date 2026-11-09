import {player,TEAMS} from './game.mjs';
export function captainFigures(game,seat){
 if(game.settings.mode==='monopoly')return {runs:game.seats[seat].score,wickets:game.seats[seat].wickets,fours:0,sixes:0,balls:game.seats[seat].balls,bowlingBalls:0,runsConceded:0};
 const history=game.match?.history||[],batting=history.filter(b=>b.batting===seat),bowling=history.filter(b=>b.batting!==seat);
 return {runs:game.match.scores[seat],wickets:bowling.filter(b=>b.out&&b.shot!=='Run out').length,fours:batting.filter(b=>b.runs===4).length,sixes:batting.filter(b=>b.runs===6).length,balls:batting.length,bowlingBalls:bowling.length,runsConceded:bowling.reduce((n,b)=>n+b.runs,0)};
}
export function makeRecord(game,id,completedAt=Date.now()){
 const snapshot=structuredClone(game);snapshot.seats.forEach(s=>{delete s.token;delete s.secret;delete s.captainSecret});
 return {id,completedAt,mode:game.settings.mode,overs:game.settings.overs,squadSize:game.settings.squadSize,winner:game.winner,source:id.startsWith('solo:')?'solo':'online',seats:game.seats.map((s,i)=>({captainId:s.captainId||`${s.ai?'ai':'guest'}:${s.team}:${s.name}`,name:s.name,avatar:s.avatar??0,team:s.team,ai:s.ai,result:game.winner===-1?'tie':game.winner===i?'win':'loss',...captainFigures(game,i)})),game:snapshot};
}
export function recordListItem(record){const {game,...item}=record;return item}
export function aggregateRecords(records){const captains=new Map();for(const record of records)for(const seat of record.seats){const key=seat.captainId,old=captains.get(key)||{captainId:key,name:seat.name,avatar:seat.avatar,team:seat.team,ai:seat.ai,played:0,wins:0,losses:0,ties:0,runs:0,wickets:0,fours:0,sixes:0,balls:0,bowlingBalls:0,runsConceded:0};old.played++;old.wins+=seat.result==='win'?1:0;old.losses+=seat.result==='loss'?1:0;old.ties+=seat.result==='tie'?1:0;for(const k of ['runs','wickets','fours','sixes','balls','bowlingBalls','runsConceded'])old[k]+=seat[k]||0;captains.set(key,old)}return [...captains.values()].sort((a,b)=>b.wins-a.wins||b.runs-a.runs)}
export function scorecard(game,seat){
 if(game.settings.mode==='monopoly')return {batting:[],bowling:[]};
 const history=game.match.history||[],dismissed=new Map();for(const ball of [...history].reverse())if(ball.batting===seat&&ball.out)dismissed.set(ball.batter,ball.shot);
 const batting=game.seats[seat].squad.map(id=>{const balls=history.filter(b=>b.batting===seat&&b.batter===id),runs=balls.reduce((n,b)=>n+b.runs,0);return {id,name:player(id).name,runs,balls:balls.length,fours:balls.filter(b=>b.runs===4).length,sixes:balls.filter(b=>b.runs===6).length,strikeRate:balls.length?(runs/balls.length*100).toFixed(1):'—',dismissal:dismissed.get(id)||(balls.length?'not out':'did not bat')};});
 const bowling=game.seats[seat].squad.map(id=>{const balls=history.filter(b=>b.batting!==seat&&b.bowler===id),runs=balls.reduce((n,b)=>n+b.runs,0);return {id,name:player(id).name,balls:balls.length,overs:`${Math.floor(balls.length/6)}.${balls.length%6}`,runs,wickets:balls.filter(b=>b.out&&b.shot!=='Run out').length,economy:balls.length?(runs/balls.length*6).toFixed(2):'—'};}).filter(b=>b.balls>0);
 return {batting,bowling};
}
