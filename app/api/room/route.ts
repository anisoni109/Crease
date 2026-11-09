import { env } from 'cloudflare:workers';
import { createGame, makeSeat, act, aiAction, publicGame } from '../../../lib/game.mjs';
import {ensureCaptain,persistResult} from '../../../lib/history-server';
export const dynamic='force-dynamic';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
const fail=(message:string,status=400)=>json({error:message},status);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export async function OPTIONS(){return new Response(null,{status:204,headers:cors})}
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin){const caller=new URL(origin);if(!(caller.protocol==='https:'&&caller.hostname.endsWith('.github.io'))&&!(import.meta.env.DEV&&['localhost','127.0.0.1'].includes(caller.hostname)))return fail('This game server accepts the game site and GitHub Pages clients.',403);}
  const raw=await request.text();if(raw.length>4096)return fail('Request too large.',413);
  const body=JSON.parse(raw);if(!env.DB)return fail('Party service is not ready. Solo play is available.',503);
  if(body.op==='create'){
   if(typeof body.name!=='string'||!body.name.trim())return fail('Enter your captain name.');
   const bytes=crypto.getRandomValues(new Uint8Array(8));const code=Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
   const token=crypto.randomUUID();const captainId=await ensureCaptain(env.DB,body);const captain=makeSeat(body.name,body.team,token,false,body.avatar);captain.captainId=captainId;const g=createGame(body.settings,captain);
   await env.DB.prepare('INSERT INTO rooms (code,state,version,updated_at) VALUES (?,?,?,?)').bind(code,JSON.stringify(g),0,Date.now()).run();
   return json({code,token,seat:0,game:publicGame(g,0)});
  }
  const code=String(body.code||'').toUpperCase().replace(/[^A-Z2-9]/g,'');if(code.length!==8)return fail('Enter an 8-character party code.');
  const row=await env.DB.prepare('SELECT state,version,updated_at FROM rooms WHERE code=?').bind(code).first<{state:string;version:number;updated_at:number}>();
  if(!row||Date.now()-row.updated_at>86400000)return fail('Party not found or expired. Ask the host for a new code.',404);
  let game=JSON.parse(row.state),seat=game.seats.findIndex((s:{token:string})=>s.token===body.token),token=body.token;
  if(body.op==='join'&&seat===-1){
   if(typeof body.name!=='string'||!body.name.trim())return fail('Enter your captain name.');
   if(game.phase!=='lobby')return fail('This match has already started.');
   if(game.seats.length>=game.settings.capacity)return fail('This party is full.');
   const captainId=await ensureCaptain(env.DB,body);if(game.seats.some((s:any)=>s.captainId===captainId))return fail('This captain already has a seat. Use another browser profile for a second captain.');token=crypto.randomUUID();seat=game.seats.length;const captain=makeSeat(body.name,body.team,token,false,body.avatar);captain.captainId=captainId;game.seats.push(captain);game.version++;
  }else if(seat===-1)return fail('Rejoin this party to take a seat.',403);
  else if(body.op==='action'){
   if(body.version!==row.version)return json({game:publicGame(game,seat),seat,code,token,conflict:true},409);
   game=act(game,seat,body.action);
  }else if(body.op==='poll'){
   // Any seated captain can tick server-authorized AI/autoplay actions.
   // The version lease ensures concurrent polls cannot resolve a ball twice.
   const next=aiAction(game);if(next)game=act(game,next.actor,next.action);
  }else if(body.op!=='join')return fail('Unknown party action.');
  if(game.version!==row.version){
   const result=await env.DB.prepare('UPDATE rooms SET state=?,version=?,updated_at=? WHERE code=? AND version=?').bind(JSON.stringify(game),game.version,Date.now(),code,row.version).run();
   if(!result.meta.changes)return fail('Another captain acted at the same moment. Please try again.',409);
  }
  await persistResult(env.DB,game,code);
  return json({game:publicGame(game,seat),seat,code,token});
 }catch(error){return fail(error instanceof Error?error.message:'Could not connect to the party. Please try again.');}
}
