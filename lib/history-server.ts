import {makeRecord,recordListItem} from './records.mjs';
export async function secretHash(secret:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
const valid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9-]{36}$/i.test(s);
export async function ensureCaptain(db:D1Database,body:any){
 const id=valid(body.captainId)?body.captainId:crypto.randomUUID(),secret=valid(body.captainSecret)?body.captainSecret:crypto.randomUUID(),hash=await secretHash(secret);
 const profile=await db.prepare('SELECT secret_hash FROM captain_profiles WHERE id=?').bind(id).first<{secret_hash:string}>();
 if(profile&&profile.secret_hash!==hash)throw new Error('This captain profile could not be verified.');
 if(!profile)await db.prepare('INSERT INTO captain_profiles (id,secret_hash,name,avatar,created_at) VALUES (?,?,?,?,?)').bind(id,hash,String(body.name).trim().slice(0,24),Number.isInteger(body.avatar)?body.avatar:0,Date.now()).run();
 return id;
}
export async function verifyCaptain(db:D1Database,id:unknown,secret:unknown){if(!valid(id)||!valid(secret))return false;const row=await db.prepare('SELECT secret_hash FROM captain_profiles WHERE id=?').bind(id).first<{secret_hash:string}>();return !!row&&row.secret_hash===await secretHash(secret as string)}
export async function persistResult(db:D1Database,game:any,code:string){
 if(game.phase!=='results')return;
 const id=`${code}:${game.round||1}`,exists=await db.prepare('SELECT id FROM saved_matches WHERE id=?').bind(id).first();if(exists)return;
 const record=makeRecord(game,id),statements=[db.prepare('INSERT OR IGNORE INTO saved_matches (id,room_code,mode,completed_at,summary,listing) VALUES (?,?,?,?,?,?)').bind(id,code,game.settings.mode,record.completedAt,JSON.stringify(record),JSON.stringify(recordListItem(record)))];
 for(const seat of record.seats)statements.push(db.prepare('INSERT OR IGNORE INTO match_captains (match_id,captain_id,name,avatar,team,result,runs,wickets,fours,sixes,balls,bowling_balls,runs_conceded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,seat.captainId,seat.name,seat.avatar,seat.team,seat.result,seat.runs,seat.wickets,seat.fours,seat.sixes,seat.balls,seat.bowlingBalls,seat.runsConceded));
 await db.batch(statements);
}
