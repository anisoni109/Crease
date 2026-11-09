import fs from 'node:fs/promises';
const teams=['chennai-super-kings','mumbai-indians','royal-challengers-bengaluru','kolkata-knight-riders','rajasthan-royals','sunrisers-hyderabad','delhi-capitals','punjab-kings','gujarat-titans','lucknow-super-giants'];
await fs.mkdir('research',{recursive:true});
const data=await Promise.all(teams.map(async(slug)=>{
 const response=await fetch(`https://www.iplt20.com/api/bff/cms/teams/${slug}?tab=squad`);
 if(!response.ok)throw new Error(`${slug}: ${response.status}`);
 const {data}=await response.json();
 return {slug,players:data.squad.players};
}));
await fs.writeFile('research/squads.json',JSON.stringify(data,null,2));
console.log(data.map(t=>`${t.slug}: ${t.players.map(p=>p.name).join(', ')}`).join('\n'));
