import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Preserve the original curated stars. Additional candidates come from the same
// official directory, with established internationals and IPL players first.
const squads=JSON.parse(await fs.readFile('research/squads.json','utf8'));
const existing=JSON.parse(await fs.readFile('lib/players.json','utf8')).slice(0,100);
if(existing.length!==100)throw new Error('The original 100-player roster is required.');
const originalIds=new Set(existing.map(p=>p.id));
const all=squads.flatMap((s,team)=>s.players.map(p=>({...p,team})));
const priority=`Riyan Parag|Noor Ahmad|Nathan Ellis|Matt Henry|Akeal Hosein|Sherfane Rutherford|Finn Allen|Rovman Powell|Shardul Thakur|Azmatullah Omarzai|Jason Holder|Pathum Nissanka|Ben Duckett|Gerald Coetzee|Brydon Carse|Kyle Jamieson|Thangarasu Natarajan|Nitish Rana|Prithvi Shaw|Manish Pandey|Karun Nair|Sarfaraz Khan|Rahul Chahar|Suyash Sharma|Vaibhav Arora|Akash Deep|Rasikh Dar|Ramandeep Singh|Angkrish Raghuvanshi|Spencer Johnson|Nandre Burger|Jacob Duffy|Nuwan Thushara|Dushmantha Chameera|Dilshan Madushanka|Adam Milne|Blessing Muzarabani|Dasun Shanaka|Kamindu Mendis|Rehan Ahmed|Keshav Maharaj|Jamie Overton|Matt Short|Tim Seifert|Tom Banton|Jordan Cox|Matthew Breetzke|Xavier Bartlett|Cooper Connolly|Mitch Owen|Ben Dwarshuis|Luke Wood|George Linde|Kwena Maphaka|Donovan Ferreira|AM Ghazanfar|Abishek Porel|Sameer Rizvi|Abdul Samad|Shahbaz Ahmed|Mohsin Khan|Anshul Kamboj|Akash Madhwal|Mayank Markande|Umran Malik|Kartik Tyagi|Navdeep Saini|Jaydev Unadkat|Ishant Sharma|Shreyas Gopal|Jayant Yadav|Mahipal Lomror|Tushar Deshpande|Harpreet Brar|Shahrukh Khan|Aniket Verma|Urvil Patel|Vipraj Nigam|Digvesh Singh Rathi|Musheer Khan|Vijaykumar Vyshak|Yash Thakur|Kuldeep Sen|Mukesh Choudhary|Ashwani Kumar|Raj Bawa|Arshad Khan|Kumar Kushagra|Anuj Rawat|Vishnu Vinod|Robin Minz|Nishant Sindhu|Manav Suthar|Gurjapneet Singh|Arjun Tendulkar|Anukul Roy|Shivam Mavi|Eshan Malinga|David Payne|Zak Foulkes|Jack Edwards|Connor Esterhuizen`.split('|');
const rank=new Map(priority.map((n,i)=>[n,i]));
const candidates=all.filter(p=>!originalIds.has(p.externalId)).sort((a,b)=>(rank.get(a.name)??500)-(rank.get(b.name)??500)||Number(b.isInternational)-Number(a.isInternational)||Number(b.isCaptain)-Number(a.isCaptain)||a.name.localeCompare(b.name));
const seen=new Set(originalIds);
const unique=candidates.filter(p=>{if(seen.has(p.externalId))return false;seen.add(p.externalId);return true;});
const tier=n=>n>=90?'gold':n>=80?'red':n>=68?'blue':'gray';
const overrides={
 'Rehan Ahmed':'AR','Kamindu Mendis':'AR','Ramandeep Singh':'AR',
 'Matt Short':'AR','Mitch Owen':'AR','Cooper Connolly':'AR','Donovan Ferreira':'WK',
 'Jordan Cox':'WK','Finn Allen':'WK','Tom Banton':'WK','Matthew Breetzke':'WK',
 'Shahbaz Ahmed':'AR','Shahrukh Khan':'BAT','Harpreet Brar':'AR',
};
function record(p,i){
 const role=overrides[p.name]||(p.isWicketKeeper||p.role==='wicketkeeper'?'WK':p.role==='bowler'?'BOWL':p.role==='allrounder'?'AR':'BAT');
 const rating=Math.max(60,84-Math.floor(i/4));
 const bat=role==='BOWL'?Math.max(40,rating-34):rating;
 const bowl=role==='BAT'||role==='WK'?Math.max(34,rating-39):rating;
 return {id:p.externalId,name:p.name,role,country:p.country,team:p.team,rating,bat,bowl,tier:tier(rating),batTier:tier(bat),bowlTier:tier(bowl),base:rating<68?Math.max(.3,Math.round((.3+(rating-60)*.012)*10)/10):rating<80?Math.max(.5,Math.round((.5+(rating-68)*.055)*10)/10):Math.round((.5+(rating-60)*.065)*10)/10,photo:`./players/${p.externalId}.webp`,source:p.imageUrl};
}
function imageType(b){
 if(b.length>12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'webp';
 if(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(b.length>3&&b[0]===255&&b[1]===216&&b[2]===255)return 'jpeg';
 return null;
}
await fs.mkdir('public/players',{recursive:true});
// These players' IPL endpoints currently return an SVG fallback. Use their
// official franchise/BCCI portraits and ESPN's identified player headshot.
const alternatePortraits={
 21837:'https://www.punjabkingsipl.in/static-assets/images/players/65584.png?v=6.69',
 77153:'https://www.bcci.tv/_next/image?q=75&url=%2Fapi%2Fteam-assets%3Fpathname%3Dsquad%252F77153.png%26brand%3Dbcci%26fallback%3Dfallback-player-men&w=384',
 19402:'https://a.espncdn.com/i/headshots/cricket/players/full/330902.png',
};
let repaired=0;
for(const p of existing){
 const file=`public/players/${p.id}.webp`;
 const bytes=await fs.readFile(file);
 if(!imageType(bytes)){
  const source=alternatePortraits[p.id];if(!source)throw new Error(`Missing real baseline portrait: ${p.name}`);
  const response=await fetch(source,{signal:AbortSignal.timeout(25000)});
  const replacement=Buffer.from(await response.arrayBuffer());
  if(!response.ok||!imageType(replacement))throw new Error(`Could not repair baseline portrait: ${p.name}`);
  await fs.writeFile(file,replacement);repaired++;
 }
}
const extras=new Array(100);let slotCursor=0,candidateCursor=0,downloaded=0,reused=0;const failures=[];
await Promise.all(Array.from({length:6},async()=>{
 while(slotCursor<100){
  const slot=slotCursor++;
  while(!extras[slot]){
   const p=unique[candidateCursor++];if(!p)throw new Error('Not enough valid portraits to complete 200 players.');
   const output=`public/players/${p.externalId}.webp`;
   try{
    let bytes;try{const cached=await fs.readFile(output);if(imageType(cached))bytes=cached;}catch{}
    if(bytes)reused++;
    else{
     for(const url of [p.imageUrlSet?.small,p.imageUrl].filter(Boolean)){
      try{const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)continue;const content=Buffer.from(await response.arrayBuffer());if(imageType(content)){bytes=content;break;}}catch{}
     }
     if(!bytes)throw new Error('No valid portrait response');
     await fs.writeFile(output,bytes);downloaded++;
    }
    extras[slot]=record(p,slot);
   }catch(error){failures.push({name:p.name,error:error.message});}
  }
 }
}));
const players=[...existing,...extras];
if(players.length!==200||new Set(players.map(p=>p.id)).size!==200)throw new Error('Expected exactly 200 unique players.');
let totalBytes=0;const imageHashes=new Set();
for(const p of players){const bytes=await fs.readFile(`public/players/${p.id}.webp`);if(!imageType(bytes))throw new Error(`Invalid image: ${p.name}`);totalBytes+=bytes.length;imageHashes.add(createHash('sha256').update(bytes).digest('hex'));}
if(imageHashes.size!==200)throw new Error(`Portrait uniqueness check failed: ${imageHashes.size}/200 unique images.`);
await fs.writeFile('lib/players.json',JSON.stringify(players,null,2)+'\n');
console.log(JSON.stringify({players:players.length,uniqueIds:new Set(players.map(p=>p.id)).size,originalPlayersPreserved:100,repaired,downloaded,reused,validUniquePortraits:imageHashes.size,totalBytes,failures},null,2));
