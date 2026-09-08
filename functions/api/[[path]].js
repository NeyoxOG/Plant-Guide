import { MAX_IMAGE_BYTES, imageType } from "../_lib/media.js";
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const COOKIE_NAME="pg_admin";
const MAX_UPLOAD=MAX_IMAGE_BYTES;
const ALLOWED_IMAGE_TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif","image/gif":"gif"};
const encoder=new TextEncoder();
const readyDatabases=new WeakSet();

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
const nowIso=()=>new Date().toISOString();
const clean=(v,max=500)=>String(v??"").trim().slice(0,max);
const boolInt=v=>v===true||v===1||v==="1"?1:0;
const int=(v,fallback=0)=>Number.isFinite(Number(v))?Math.trunc(Number(v)):fallback;
const nullableIso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()};
const safeUrl=v=>{const s=clean(v,500);if(!s)return"";return s.startsWith("/")||s.startsWith("#")||/^https?:\/\//i.test(s)||/^mailto:/i.test(s)||/^tel:/i.test(s)?s:""};
const DEFAULT_CONTENT={
  hero_eyebrow:"GANZHEITLICH. NATÜRLICH. INDIVIDUELL.",hero_title:"Deine Gesundheit.",hero_accent:"Mein Herzensweg.",hero_text:"Ganzheitliche Unterstützung für Körper, Geist und Seele – natürlich, individuell und mit einem offenen Ohr für dich.",
  offers_title:"Individuelle Unterstützung für deinen Alltag",offers_text:"Ein klarer Einstieg, transparente Preise und persönliche Begleitung.",
  about_title:"Hallo, ich bin Nicole Seufert.",about_text:"Ich begleite dich mit Herz, Fachwissen und natürlichen Impulsen auf deinem Weg zu mehr Wohlbefinden. Mein Ziel ist es, dich individuell, ehrlich und ganzheitlich zu unterstützen – mit einem offenen Ohr, fundiertem Wissen und Vertrauen in die Kraft der Natur.",
  contact_title:"Bereit für den ersten Schritt?",contact_text:"Lass uns gemeinsam etwas verändern. Für dich. Für morgen. Für dein Leben."
};
const DEFAULT_SERVICES=[
  ["Schulter- & Nackenproblematik","Sanfte Impulse bei Verspannungen im Schulter- und Nackenbereich.","Ein sanfter, persönlicher Termin mit Fokus auf Entspannung, Wahrnehmung und alltagstaugliche Impulse für Schulter und Nacken.",2500,3500,"/assets/offer-stones.webp","Schwarze Wellness-Steine",10],
  ["Analyse von Nahrungsergänzungsmitteln","Individuelle Einordnung und Orientierung zur Einnahme und Optimierung.","Wir schauen gemeinsam auf deine vorhandenen Präparate, Ziele und Fragen. Bei medizinischen Indikationen oder Wechselwirkungen ist eine ärztliche beziehungsweise pharmazeutische Rücksprache wichtig.",2500,4000,"/assets/offer-supplements.webp","Nahrungsergänzungsmittel",20],
  ["Fußreflexzonenmassage","Auszeit vom Alltag und entspannende Unterstützung bei verschiedenen Beschwerden.","Eine ruhige Auszeit mit Fokus auf Entspannung und Wohlbefinden. Die Anwendung ist als ergänzendes Wellness-Angebot gedacht und ersetzt keine medizinische Behandlung.",2500,4000,"/assets/offer-reflexology.webp","Ruhige Wellness-Szene",30],
  ["Ernährungsberatung / Umstellung","Individuelle Begleitung bei Ernährungsfragen und einer alltagstauglichen Umstellung.","Persönliche Orientierung für eine alltagstaugliche Ernährung. Bei diagnostizierten Erkrankungen erfolgt die Begleitung ergänzend und sollte mit medizinischem Fachpersonal abgestimmt werden.",3000,7000,"/assets/offer-nutrition.webp","Frischer grüner Salat",40]
];

function getCookie(req,name){for(const part of (req.headers.get("cookie")||"").split(";")){const [k,...rest]=part.trim().split("=");if(k===name)return decodeURIComponent(rest.join("="))}return""}
function b64url(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
async function sha256(value){const buf=await crypto.subtle.digest("SHA-256",encoder.encode(String(value)));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sameSecret(a,b){const [ha,hb]=await Promise.all([sha256(a),sha256(b)]);let diff=ha.length^hb.length;for(let i=0;i<Math.min(ha.length,hb.length);i++)diff|=ha.charCodeAt(i)^hb.charCodeAt(i);return diff===0}
function sessionCookie(token,maxAge=604800){return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`}
function noSessionCookie(){return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}

async function ensureSchema(env){
  if(!env.DB||readyDatabases.has(env.DB))return;
  await env.DB.batch(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,badge TEXT NOT NULL DEFAULT 'ANGEBOT',title TEXT NOT NULL,text TEXT NOT NULL DEFAULT '',button_label TEXT NOT NULL DEFAULT '',button_url TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),sort_order INTEGER NOT NULL DEFAULT 0,starts_at TEXT,ends_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,object_key TEXT NOT NULL UNIQUE,original_name TEXT NOT NULL,content_type TEXT NOT NULL,size_bytes INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS media_files (object_key TEXT PRIMARY KEY, data BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS shop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',price_cents INTEGER NOT NULL DEFAULT 0 CHECK(price_cents>=0),compare_at_cents INTEGER CHECK(compare_at_cents IS NULL OR compare_at_cents>=0),image_key TEXT,image_alt TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',detail_text TEXT NOT NULL DEFAULT '',price_cents INTEGER NOT NULL DEFAULT 0 CHECK(price_cents>=0),compare_at_cents INTEGER CHECK(compare_at_cents IS NULL OR compare_at_cents>=0),image_key TEXT,image_url TEXT NOT NULL DEFAULT '',image_alt TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS site_content (key TEXT PRIMARY KEY,value TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,username TEXT NOT NULL DEFAULT 'Nicole',expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      identity_hash TEXT PRIMARY KEY,attempts INTEGER NOT NULL DEFAULT 0,first_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,blocked_until TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_promotions_public ON promotions(active,sort_order,id);
    CREATE INDEX IF NOT EXISTS idx_products_public ON shop_products(active,sort_order,id);
    CREATE INDEX IF NOT EXISTS idx_services_public ON services(active,sort_order,id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON admin_sessions(expires_at);
  `.split(";").map(sql=>sql.trim()).filter(Boolean).map(sql=>env.DB.prepare(sql)));
  try{await env.DB.prepare("SELECT username FROM admin_sessions LIMIT 1").first()}catch{try{await env.DB.exec("ALTER TABLE admin_sessions ADD COLUMN username TEXT NOT NULL DEFAULT 'Nicole';")}catch{}}
  const seeded=await env.DB.prepare("SELECT value FROM app_meta WHERE key='cms_seeded_v1'").first();
  if(!seeded){
    const statements=DEFAULT_SERVICES.map(s=>env.DB.prepare("INSERT INTO services(title,description,detail_text,price_cents,compare_at_cents,image_url,image_alt,sort_order) VALUES(?,?,?,?,?,?,?,?)").bind(...s));
    for(const [key,value] of Object.entries(DEFAULT_CONTENT))statements.push(env.DB.prepare("INSERT OR IGNORE INTO site_content(key,value) VALUES(?,?)").bind(key,value));
    statements.push(env.DB.prepare("INSERT INTO app_meta(key,value) VALUES('cms_seeded_v1','1')"));
    await env.DB.batch(statements);
  }
  readyDatabases.add(env.DB);
}

async function bindingStatus(env){
  const status={db:{bound:!!env.DB,ready:false},media:{bound:!!env.DB,ready:false,storage:"D1"},auth:{ready:!!env.ADMIN_PASSWORD},username:clean(env.ADMIN_USERNAME||"Nicole",80)};
  if(env.DB){try{await ensureSchema(env);await env.DB.prepare("SELECT 1 AS ok").first();status.db.ready=true}catch(error){status.db.error="D1 ist gebunden, aber nicht erreichbar."}}
  status.media.ready=status.db.ready;
  status.ready=status.db.ready&&status.media.ready&&status.auth.ready;
  return status;
}

async function requireDb(env){if(!env.DB)return json({ok:false,error:"Cloudflare D1 ist noch nicht gebunden. Binding-Name: DB."},503);try{await ensureSchema(env);return null}catch(error){console.error("D1 schema error",error);return json({ok:false,error:"D1 ist gebunden, konnte aber nicht initialisiert werden."},503)}}
async function requireMedia(env){return requireDb(env)}
async function requireWriteHeader(req){return req.headers.get("x-requested-with")==="plant-guide-admin"?null:json({ok:false,error:"Ungültige Anfrage"},403)}
async function requireAdmin(context){const miss=await requireDb(context.env);if(miss)return{response:miss};const token=getCookie(context.request,COOKIE_NAME);if(!token)return{response:json({ok:false,error:"Nicht angemeldet"},401)};const hash=await sha256(token);const row=await context.env.DB.prepare("SELECT token_hash,username,expires_at FROM admin_sessions WHERE token_hash=?").bind(hash).first();if(!row||new Date(row.expires_at)<=new Date()){if(row)await context.env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(hash).run();return{response:json({ok:false,error:"Sitzung abgelaufen"},401,{"set-cookie":noSessionCookie()})}}return{hash,username:row.username}}

async function loginRateState(env,req){const ip=req.headers.get("cf-connecting-ip")||"unknown";const id=await sha256(ip);const row=await env.DB.prepare("SELECT attempts,first_attempt_at,blocked_until FROM login_attempts WHERE identity_hash=?").bind(id).first();return{id,blocked:!!(row?.blocked_until&&new Date(row.blocked_until)>new Date()),row}}
async function recordFailedLogin(env,state){const now=new Date();let attempts=1,first=now.toISOString();if(state.row){const firstDate=new Date(state.row.first_attempt_at);if(now-firstDate<15*60*1000){attempts=int(state.row.attempts)+1;first=firstDate.toISOString()}}const blocked=attempts>=5?new Date(now.getTime()+15*60*1000).toISOString():null;await env.DB.prepare("INSERT INTO login_attempts(identity_hash,attempts,first_attempt_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(identity_hash) DO UPDATE SET attempts=excluded.attempts,first_attempt_at=excluded.first_attempt_at,blocked_until=excluded.blocked_until").bind(state.id,attempts,first,blocked).run()}
async function clearFailedLogin(env,id){await env.DB.prepare("DELETE FROM login_attempts WHERE identity_hash=?").bind(id).run()}
async function bodyJson(req){try{return await req.json()}catch{return{}}}

const withImage=item=>({...item,image_url:item.image_key?`/media/${encodeURIComponent(item.image_key).replace(/%2F/g,"/")}`:(item.image_url||"")});
const contentObject=rows=>Object.fromEntries((rows||[]).map(row=>[row.key,row.value]));
async function publicState(env){if(!env.DB)return json({ok:true,configured:false,promotions:[],products:[],services:[],content:{}},200,{"cache-control":"public, max-age=15"});await ensureSchema(env);const [promos,products,services,content]=await Promise.all([env.DB.prepare("SELECT id,badge,title,text,button_label,button_url,sort_order FROM promotions WHERE active=1 AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY sort_order ASC,id DESC").bind(nowIso(),nowIso()).all(),env.DB.prepare("SELECT id,title,description,price_cents,compare_at_cents,image_key,image_alt,sort_order FROM shop_products WHERE active=1 ORDER BY sort_order ASC,id DESC").all(),env.DB.prepare("SELECT id,title,description,detail_text,price_cents,compare_at_cents,image_key,image_url,image_alt,sort_order FROM services WHERE active=1 ORDER BY sort_order ASC,id ASC").all(),env.DB.prepare("SELECT key,value FROM site_content").all()]);return json({ok:true,configured:true,promotions:promos.results||[],products:(products.results||[]).map(withImage),services:(services.results||[]).map(withImage),content:contentObject(content.results)},200,{"cache-control":"public, max-age=30, stale-while-revalidate=120"})}
async function adminState(env,username){const [promotions,products,services,content,media,status]=await Promise.all([env.DB.prepare("SELECT * FROM promotions ORDER BY sort_order ASC,id DESC").all(),env.DB.prepare("SELECT * FROM shop_products ORDER BY sort_order ASC,id DESC").all(),env.DB.prepare("SELECT * FROM services ORDER BY sort_order ASC,id ASC").all(),env.DB.prepare("SELECT key,value FROM site_content").all(),env.DB.prepare("SELECT * FROM media ORDER BY id DESC LIMIT 200").all(),bindingStatus(env)]);return json({ok:true,user:username,system:status,promotions:promotions.results||[],products:(products.results||[]).map(withImage),services:(services.results||[]).map(withImage),content:contentObject(content.results),media:(media.results||[]).map(m=>({...m,url:`/media/${encodeURIComponent(m.object_key).replace(/%2F/g,"/")}`}))})}

async function createPromotion(env,req){const b=await bodyJson(req),title=clean(b.title,140);if(!title)return json({ok:false,error:"Titel fehlt"},400);const r=await env.DB.prepare("INSERT INTO promotions(badge,title,text,button_label,button_url,active,sort_order,starts_at,ends_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(clean(b.badge||"ANGEBOT",40),title,clean(b.text,500),clean(b.button_label,60),safeUrl(b.button_url),boolInt(b.active??true),int(b.sort_order),nullableIso(b.starts_at),nullableIso(b.ends_at),nowIso()).run();return json({ok:true,id:r.meta.last_row_id})}
async function updatePromotion(env,req,id){const b=await bodyJson(req),title=clean(b.title,140);if(!title)return json({ok:false,error:"Titel fehlt"},400);await env.DB.prepare("UPDATE promotions SET badge=?,title=?,text=?,button_label=?,button_url=?,active=?,sort_order=?,starts_at=?,ends_at=?,updated_at=? WHERE id=?").bind(clean(b.badge||"ANGEBOT",40),title,clean(b.text,500),clean(b.button_label,60),safeUrl(b.button_url),boolInt(b.active),int(b.sort_order),nullableIso(b.starts_at),nullableIso(b.ends_at),nowIso(),id).run();return json({ok:true})}
async function deletePromotion(env,id){await env.DB.prepare("DELETE FROM promotions WHERE id=?").bind(id).run();return json({ok:true})}
function productPayload(b){return{title:clean(b.title,160),description:clean(b.description,1200),price_cents:Math.max(0,int(b.price_cents)),compare_at_cents:b.compare_at_cents===null||b.compare_at_cents===""?null:Math.max(0,int(b.compare_at_cents)),image_key:clean(b.image_key,500)||null,image_alt:clean(b.image_alt,180),active:boolInt(b.active??true),sort_order:int(b.sort_order)}}
async function createProduct(env,req){const p=productPayload(await bodyJson(req));if(!p.title)return json({ok:false,error:"Produktname fehlt"},400);const r=await env.DB.prepare("INSERT INTO shop_products(title,description,price_cents,compare_at_cents,image_key,image_alt,active,sort_order,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(p.title,p.description,p.price_cents,p.compare_at_cents,p.image_key,p.image_alt,p.active,p.sort_order,nowIso()).run();return json({ok:true,id:r.meta.last_row_id})}
async function updateProduct(env,req,id){const p=productPayload(await bodyJson(req));if(!p.title)return json({ok:false,error:"Produktname fehlt"},400);await env.DB.prepare("UPDATE shop_products SET title=?,description=?,price_cents=?,compare_at_cents=?,image_key=?,image_alt=?,active=?,sort_order=?,updated_at=? WHERE id=?").bind(p.title,p.description,p.price_cents,p.compare_at_cents,p.image_key,p.image_alt,p.active,p.sort_order,nowIso(),id).run();return json({ok:true})}
async function deleteProduct(env,id){await env.DB.prepare("DELETE FROM shop_products WHERE id=?").bind(id).run();return json({ok:true})}
function servicePayload(b){return{title:clean(b.title,160),description:clean(b.description,1200),detail_text:clean(b.detail_text,2400),price_cents:Math.max(0,int(b.price_cents)),compare_at_cents:b.compare_at_cents===null||b.compare_at_cents===""?null:Math.max(0,int(b.compare_at_cents)),image_key:clean(b.image_key,500)||null,image_url:safeUrl(b.image_url),image_alt:clean(b.image_alt,180),active:boolInt(b.active??true),sort_order:int(b.sort_order)}}
async function createService(env,req){const p=servicePayload(await bodyJson(req));if(!p.title)return json({ok:false,error:"Name der Leistung fehlt"},400);const r=await env.DB.prepare("INSERT INTO services(title,description,detail_text,price_cents,compare_at_cents,image_key,image_url,image_alt,active,sort_order,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(p.title,p.description,p.detail_text,p.price_cents,p.compare_at_cents,p.image_key,p.image_url,p.image_alt,p.active,p.sort_order,nowIso()).run();return json({ok:true,id:r.meta.last_row_id})}
async function updateService(env,req,id){const p=servicePayload(await bodyJson(req));if(!p.title)return json({ok:false,error:"Name der Leistung fehlt"},400);await env.DB.prepare("UPDATE services SET title=?,description=?,detail_text=?,price_cents=?,compare_at_cents=?,image_key=?,image_url=?,image_alt=?,active=?,sort_order=?,updated_at=? WHERE id=?").bind(p.title,p.description,p.detail_text,p.price_cents,p.compare_at_cents,p.image_key,p.image_url,p.image_alt,p.active,p.sort_order,nowIso(),id).run();return json({ok:true})}
async function deleteService(env,id){await env.DB.prepare("DELETE FROM services WHERE id=?").bind(id).run();return json({ok:true})}
async function updateContent(env,req){const body=await bodyJson(req),statements=[];for(const key of Object.keys(DEFAULT_CONTENT)){if(Object.hasOwn(body,key))statements.push(env.DB.prepare("INSERT INTO site_content(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,clean(body[key],key.endsWith('_text')?2400:220),nowIso()))}if(statements.length)await env.DB.batch(statements);return json({ok:true})}
async function uploadMedia(env,req){
  const miss=await requireMedia(env);if(miss)return miss;
  if(Number(req.headers.get("content-length"))>MAX_UPLOAD+65536)return json({ok:false,error:"Das optimierte Bild darf maximal 1 MB groß sein."},413);
  const form=await req.formData(),file=form.get("file");
  if(!(file instanceof File)||!file.size)return json({ok:false,error:"Keine Bilddatei gewählt"},400);
  if(file.size>MAX_UPLOAD)return json({ok:false,error:"Das optimierte Bild darf maximal 1 MB groß sein."},413);
  const bytes=new Uint8Array(await file.arrayBuffer()),type=imageType(bytes);
  if(!type||type!==file.type)return json({ok:false,error:"Ungültige Bilddatei. JPG, PNG, WebP, AVIF oder GIF verwenden."},415);
  const key=`d1/${crypto.randomUUID()}.${ALLOWED_IMAGE_TYPES[type]}`;
  const results=await env.DB.batch([
    env.DB.prepare("INSERT INTO media(object_key,original_name,content_type,size_bytes) VALUES(?,?,?,?)").bind(key,clean(file.name,180),type,file.size),
    env.DB.prepare("INSERT INTO media_files(object_key,data) VALUES(?,?)").bind(key,bytes)
  ]);
  return json({ok:true,id:results[0].meta.last_row_id,key,url:`/media/${key}`});
}
async function deleteMedia(env,id){
  const miss=await requireMedia(env);if(miss)return miss;
  const row=await env.DB.prepare("SELECT object_key FROM media WHERE id=?").bind(id).first();
  if(!row)return json({ok:false,error:"Medium nicht gefunden"},404);
  const [usedProducts,usedServices]=await Promise.all([env.DB.prepare("SELECT COUNT(*) AS c FROM shop_products WHERE image_key=?").bind(row.object_key).first(),env.DB.prepare("SELECT COUNT(*) AS c FROM services WHERE image_key=?").bind(row.object_key).first()]);
  if(int(usedProducts?.c)+int(usedServices?.c)>0)return json({ok:false,error:"Dieses Bild wird noch von einem Produkt oder einer Leistung verwendet."},409);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM media_files WHERE object_key=?").bind(row.object_key),
    env.DB.prepare("DELETE FROM media WHERE id=?").bind(id)
  ]);
  return json({ok:true});
}

export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url),parts=url.pathname.replace(/^\/api\/?/,"").split("/").filter(Boolean),route=parts[0]||"",method=request.method.toUpperCase();
  if(method==="OPTIONS")return new Response(null,{status:204});
  try{
    if(route==="health"&&method==="GET")return json({ok:true,...await bindingStatus(env)});
    if(route==="public"&&method==="GET")return await publicState(env);
    if(route==="login"&&method==="POST"){
      const miss=await requireDb(env);if(miss)return miss;
      if(!env.ADMIN_PASSWORD)return json({ok:false,error:"Cloudflare Secret ADMIN_PASSWORD fehlt."},503);
      const rate=await loginRateState(env,request);if(rate.blocked)return json({ok:false,error:"Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen."},429);
      const b=await bodyJson(request),username=clean(b.username,80),password=clean(b.password,300),expectedUser=clean(env.ADMIN_USERNAME||"Nicole",80);
      const validUser=username.localeCompare(expectedUser,"de",{sensitivity:"accent"})===0;
      const validPassword=validUser?await sameSecret(password,env.ADMIN_PASSWORD):false;
      if(!validUser||!validPassword){await recordFailedLogin(env,rate);return json({ok:false,error:"Benutzername oder Passwort ist nicht korrekt."},401)}
      await clearFailedLogin(env,rate.id);const token=b64url(crypto.getRandomValues(new Uint8Array(32))),hash=await sha256(token),expires=new Date(Date.now()+7*864e5).toISOString();await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at<=?").bind(nowIso()).run();await env.DB.prepare("INSERT INTO admin_sessions(token_hash,username,expires_at) VALUES(?,?,?)").bind(hash,expectedUser,expires).run();return json({ok:true,user:expectedUser},200,{"set-cookie":sessionCookie(token)});
    }
    if(route==="logout"&&method==="POST"){const token=getCookie(request,COOKIE_NAME);if(env.DB&&token){await ensureSchema(env);await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha256(token)).run()}return json({ok:true},200,{"set-cookie":noSessionCookie()})}
    if(route!=="admin")return json({ok:false,error:"Nicht gefunden"},404);
    const auth=await requireAdmin(context);if(auth.response)return auth.response;
    if(method!=="GET"){const bad=await requireWriteHeader(request);if(bad)return bad}
    const area=parts[1]||"state",id=int(parts[2],0);
    if(area==="state"&&method==="GET")return await adminState(env,auth.username);
    if(area==="promotions"&&method==="POST")return await createPromotion(env,request);
    if(area==="promotions"&&method==="PUT"&&id)return await updatePromotion(env,request,id);
    if(area==="promotions"&&method==="DELETE"&&id)return await deletePromotion(env,id);
    if(area==="products"&&method==="POST")return await createProduct(env,request);
    if(area==="products"&&method==="PUT"&&id)return await updateProduct(env,request,id);
    if(area==="products"&&method==="DELETE"&&id)return await deleteProduct(env,id);
    if(area==="services"&&method==="POST")return await createService(env,request);
    if(area==="services"&&method==="PUT"&&id)return await updateService(env,request,id);
    if(area==="services"&&method==="DELETE"&&id)return await deleteService(env,id);
    if(area==="content"&&method==="PUT")return await updateContent(env,request);
    if(area==="media"&&method==="POST")return await uploadMedia(env,request);
    if(area==="media"&&method==="DELETE"&&id)return await deleteMedia(env,id);
    return json({ok:false,error:"Admin-Endpunkt nicht gefunden"},404);
  }catch(error){console.error("Plant Guide API",error);return json({ok:false,error:"Cloudflare-Verbindung fehlgeschlagen. Bitte Systemstatus prüfen."},500)}
}

