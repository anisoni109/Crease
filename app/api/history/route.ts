import {env} from 'cloudflare:workers';
import {verifyCaptain} from '../../../lib/history-server';
export const dynamic='force-dynamic';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
export async function OPTIONS(){return new Response(null,{status:204,headers})}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin){const u=new URL(origin);if(!(u.protocol==='https:'&&u.hostname.endsWith('.github.io'))&&!(import.meta.env.DEV&&['localhost','127.0.0.1'].includes(u.hostname)))return json({error:'This origin is not supported.'},403)}
 const raw=await request.text();if(raw.length>4096)return json({error:'Request too large.'},413);const body=JSON.parse(raw);
 if(!env.DB)return json({error:'Online history is unavailable.'},503);
 if(!await verifyCaptain(env.DB,body.captainId,body.captainSecret))return json({matches:[],players:[],unregistered:true});
 if(body.op==='detail'){
  const row=await env.DB.prepare('SELECT m.summary FROM saved_matches m JOIN match_captains p ON p.match_id=m.id WHERE m.id=? AND p.captain_id=?').bind(String(body.id),body.captainId).first<{summary:string}>();return row?json({record:JSON.parse(row.summary)}):json({error:'This scorecard is not in your match history.'},404);
 }
 const offset=Math.max(0,Math.floor(Number(body.offset)||0));
 const rows=await env.DB.prepare('SELECT m.listing FROM saved_matches m JOIN match_captains p ON p.match_id=m.id WHERE p.captain_id=? ORDER BY m.completed_at DESC LIMIT 51 OFFSET ?').bind(body.captainId,offset).all<{listing:string}>();
 const matches=rows.results.slice(0,50).map(r=>JSON.parse(r.listing));
 const players=await env.DB.prepare("SELECT p.captain_id AS captainId,MAX(p.name) AS name,MAX(p.avatar) AS avatar,MAX(p.team) AS team,COUNT(*) AS played,SUM(CASE WHEN p.result='win' THEN 1 ELSE 0 END) AS wins,SUM(CASE WHEN p.result='loss' THEN 1 ELSE 0 END) AS losses,SUM(CASE WHEN p.result='tie' THEN 1 ELSE 0 END) AS ties,SUM(p.runs) AS runs,SUM(p.wickets) AS wickets,SUM(p.fours) AS fours,SUM(p.sixes) AS sixes,SUM(p.balls) AS balls,SUM(p.bowling_balls) AS bowlingBalls,SUM(p.runs_conceded) AS runsConceded FROM match_captains p JOIN match_captains mine ON mine.match_id=p.match_id AND mine.captain_id=? GROUP BY p.captain_id ORDER BY wins DESC,runs DESC").bind(body.captainId).all();
 return json({matches,players:players.results,hasMore:rows.results.length>50});
 }catch(e){return json({error:e instanceof Error?e.message:'Could not load history.'},400)}}
