#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';

const PROJECT='plant-guideeh';
const DB_NAME='plant-guide-db';
const BUCKET='plant-guide-media';
const NPX=process.platform==='win32'?'npx.cmd':'npx';

function run(args,{allowFail=false,quiet=false}={}){
  const result=spawnSync(NPX,['--yes','wrangler@latest',...args],{encoding:'utf8',stdio:quiet?['inherit','pipe','pipe']:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0&&!allowFail){if(result.stdout)console.error(result.stdout);if(result.stderr)console.error(result.stderr);throw new Error(`Wrangler fehlgeschlagen: ${args.join(' ')}`)}
  return result;
}
function parseJson(text){const s=String(text||'').trim();const starts=[s.indexOf('{'),s.indexOf('[')].filter(i=>i>=0);if(!starts.length)throw new Error('Kein JSON in Wrangler-Ausgabe gefunden.');const start=Math.min(...starts);const end=Math.max(s.lastIndexOf('}'),s.lastIndexOf(']'));return JSON.parse(s.slice(start,end+1))}
function ensureD1(){
  let info=run(['d1','info',DB_NAME,'--json'],{allowFail:true,quiet:true});
  if(info.status!==0){
    console.log(`\nD1 „${DB_NAME}“ wird angelegt …`);
    let created=run(['d1','create',DB_NAME,'--jurisdiction','eu','--binding','DB','--update-config=false'],{allowFail:true});
    if(created.status!==0){console.log('EU-Jurisdiction konnte nicht gesetzt werden, zweiter Versuch …');run(['d1','create',DB_NAME,'--binding','DB','--update-config=false']);}
    info=run(['d1','info',DB_NAME,'--json'],{quiet:true});
  }
  const data=parseJson(info.stdout);const id=data.uuid||data.id||data.database_id;
  if(!id)throw new Error('D1-Datenbank-ID konnte nicht ermittelt werden.');
  return id;
}
function ensureR2(){
  const info=run(['r2','bucket','info',BUCKET,'--json'],{allowFail:true,quiet:true});
  if(info.status===0)return;
  console.log(`\nR2-Bucket „${BUCKET}“ wird angelegt …`);
  const created=run(['r2','bucket','create',BUCKET,'--jurisdiction','eu'],{allowFail:true});
  if(created.status!==0){console.log('EU-Jurisdiction konnte nicht gesetzt werden, zweiter Versuch …');run(['r2','bucket','create',BUCKET]);}
}
function writeConfig(databaseId){
  const config=`name = "${PROJECT}"\ncompatibility_date = "2026-08-29"\npages_build_output_dir = "./.deploy"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${DB_NAME}"\ndatabase_id = "${databaseId}"\nmigrations_dir = "migrations"\n\n[[r2_buckets]]\nbinding = "MEDIA"\nbucket_name = "${BUCKET}"\n`;
  writeFileSync('wrangler.cms.toml',config);
}
function buildStatic(){
  rmSync('.deploy',{recursive:true,force:true});mkdirSync('.deploy',{recursive:true});
  const files=['index.html','styles.css','effects.css','effects.js','polish.css','mobile-fix.css','app.js','cms-public.js','cms.css','admin.html','admin.css','admin.js','impressum.html','datenschutz.html','_headers'];
  for(const file of files){if(existsSync(file))cpSync(file,`.deploy/${file}`)}
  if(existsSync('assets'))cpSync('assets','.deploy/assets',{recursive:true});
}

try{
  console.log('Plant Guide · Cloudflare CMS Deploy');
  console.log('1/7 Cloudflare-Anmeldung prüfen …');run(['whoami']);
  console.log('2/7 D1 vorbereiten …');const dbId=ensureD1();
  console.log('3/7 R2 vorbereiten …');ensureR2();
  console.log('4/7 Wrangler-Konfiguration erzeugen …');writeConfig(dbId);
  console.log('5/7 Datenbank-Migrationen anwenden …');run(['d1','migrations','apply',DB_NAME,'--remote','--config','wrangler.cms.toml']);
  console.log('\n6/7 Admin-Passwort als Cloudflare Secret setzen …');
  console.log('Wrangler fragt das Passwort sicher ab; es wird nicht im Repository gespeichert.');
  run(['pages','secret','put','ADMIN_PASSWORD','--project-name',PROJECT,'--config','wrangler.cms.toml']);
  console.log('7/7 Website + Pages Functions deployen …');buildStatic();run(['pages','deploy','.deploy','--project-name',PROJECT,'--branch','main','--config','wrangler.cms.toml']);
  console.log('\n✓ Fertig. Admin: https://'+PROJECT+'.pages.dev/admin.html');
  console.log('✓ D1: '+DB_NAME+' · R2: '+BUCKET);
  console.log('Hinweis: wrangler.cms.toml enthält nur die D1-ID, keine Passwörter. Das Passwort liegt ausschließlich als Cloudflare Secret.');
}catch(error){console.error('\n✗ Deploy abgebrochen:',error.message);process.exitCode=1}
