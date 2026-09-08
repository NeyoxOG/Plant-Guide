// One-command setup and deploy. Requires Node.js 22.13+ and npm.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { emitKeypressEvents } from 'node:readline';
const root=fileURLToPath(new URL('.',import.meta.url));
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'15cb8484effb9847f82b185556bf21a4';
const project='plant-guideeh';
async function hiddenInput(label){
  if(!process.stdin.isTTY)throw new Error(label+' fehlt. Als Umgebungsvariable bereitstellen.');
  emitKeypressEvents(process.stdin);process.stdout.write(label+': ');
  process.stdin.setRawMode(true);process.stdin.resume();
  return new Promise((resolve,reject)=>{
    let value='';
    function finish(error){process.stdin.off('keypress',handler);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');error?reject(error):resolve(value)}
    function handler(text,key={}){
      if(key.ctrl&&key.name==='c')return finish(new Error('Abgebrochen'));
      if(key.name==='return')return finish();
      if(key.name==='backspace'){value=value.slice(0,-1);return}
      if(text&&!key.ctrl&&!key.meta)value+=text;
    }
    process.stdin.on('keypress',handler);
  });
}
async function run(){
  const token=process.env.CLOUDFLARE_API_TOKEN||await hiddenInput('CLOUDFLARE_API_TOKEN');
  const password=process.env.ADMIN_PASSWORD||await hiddenInput('ADMIN_PASSWORD');
  if(!token||!password)throw new Error('API-Token und Admin-Passwort sind erforderlich.');
  const api=async(path,method='GET',body)=>{
    const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    const data=await response.json();
    if(!response.ok||!data.success)throw new Error('Cloudflare '+response.status+': '+(data.errors||[]).map(x=>x.message).join('; '));
    return data.result;
  };
  // Read both resources before changing anything. Never reuse another site's DB.
  await api('/pages/projects/'+project);
  const databases=await api('/d1/database?name=plant-guide-db');
  let db=databases.find(d=>d.name==='plant-guide-db');
  if(!db)db=await api('/d1/database','POST',{name:'plant-guide-db',primary_location_hint:'weur'});
  if(!/^[a-f0-9-]{36}$/.test(db.uuid))throw new Error('Ungültige Datenbank-ID.');
  const config='name = "plant-guideeh"\ncompatibility_date = "2026-09-08"\npages_build_output_dir = "./public"\n\n[vars]\nADMIN_USERNAME = "Nicole"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "plant-guide-db"\ndatabase_id = "'+db.uuid+'"\n\n# Previews must never write production data.\n[env.preview]\nd1_databases = []\n';
  // Keep the binding in the source of truth for future Git deployments.
  writeFileSync(new URL('wrangler.toml',import.meta.url),config);
  await api('/pages/projects/'+project,'PATCH',{deployment_configs:{production:{env_vars:{ADMIN_PASSWORD:{type:'secret_text',value:password}}}}});
  await new Promise((resolve,reject)=>{
    const windows=process.platform==='win32';
    const child=spawn(windows?'npx.cmd':'npx',['--yes','wrangler@4.130.0','pages','deploy','public','--project-name',project,'--branch','main'],{cwd:root,shell:windows,stdio:'inherit',env:{...process.env,CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account}});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Deployment fehlgeschlagen ('+code+').')));
  });
  const health=await fetch('https://plant-guideeh.pages.dev/api/health',{cache:'no-store',signal:AbortSignal.timeout(30000)}).then(r=>r.json());
  if(!health.ready||health.media?.storage!=='D1')throw new Error('Deployment beendet, Live-Prüfung noch nicht erfolgreich. /api/health prüfen.');
  console.log('Bereit: https://plant-guideeh.pages.dev/admin');
  console.log('WICHTIG: Die aktualisierte wrangler.toml in Git übernehmen, damit spätere Git-Deployments das DB-Binding behalten.');
}
run().catch(error=>{console.error(error.message);process.exitCode=1});
