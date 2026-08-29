const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const COOKIE_NAME="pg_admin";
const MAX_UPLOAD=8*1024*1024;
const ALLOWED_IMAGE_TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif","image/gif":"gif"};

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
const nowIso=()=>new Date().toISOString();
const clean=(v,max=500)=>String(v??"").trim().slice(0,max);
const boolInt=v=>v===true||v===1||v==="1"?1:0;
const int=(v,fallback=0)=>Number.isFinite(Number(v))?Math.trunc(Number(v)):fallback;
const nullableIso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()};
const safeUrl=v=>{const s=clean(v,500);if(!s)return"";if(s.startsWith("/")||s.startsWith("#")||/^https?:\/\//i.test(s)||/^mailto:/i.test(s)||/^tel:/i.test(s))return s;return""};

function getCookie(req,name){const raw=req.headers.get("cookie")||"";for(const part of raw.split(";")){const [k,...rest]=part.trim().split("=");if(k===name)return decodeURIComponent(rest.join("="))}return""}
function b64url(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
async function sha256(value){const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sameSecret(a,b){const [ha,hb]=await Promise.all([sha256(a),sha256(b)]);let diff=ha.length^hb.length;for(let i=0;i<Math.min(ha.length,hb.length);i++)diff|=ha.charCodeAt(i)^hb.charCodeAt(i);return diff===0}
function sessionCookie(token,maxAge=604800){return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`}
function noSessionCookie(){return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}

async function requireBindings(env,{media=false}={}){if(!env.DB)return json({ok:false,error:"D1 binding DB fehlt. Bitte deploy.mjs ausführen."},503);if(media&&!env.MEDIA)return json({ok:false,error:"R2 binding MEDIA fehlt. Bitte deploy.mjs ausführen."},503);return null}
async function requireAdmin(context){const miss=await requireBindings(context.env);if(miss)return{response:miss};const token=getCookie(context.request,COOKIE_NAME);if(!token)return{response:json({ok:false,error:"Nicht angemeldet"},401)};const hash=await sha256(token);const row=await context.env.DB.prepare("SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash=?").bind(hash).first();if(!row||new Date(row.expires_at)<=new Date()){if(row)await context.env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(hash).run();return{response:json({ok:false,error:"Sitzung abgelaufen"},401,{"set-cookie":noSessionCookie()})}}return{hash}}
async function requireWriteHeader(req){if(req.headers.get("x-requested-with")!=="plant-guide-admin")return json({ok:false,error:"Ungültige Anfrage"},403);return null}

async function loginRateState(env,req){const ip=req.headers.get("cf-connecting-ip")||"unknown";const ua=req.headers.get("user-agent")||"";const id=await sha256(`${ip}|${ua.slice(0,120)}`);const row=await env.DB.prepare("SELECT attempts, first_attempt_at, blocked_until FROM login_attempts WHERE identity_hash=?").bind(id).first();if(row?.blocked_until&&new Date(row.blocked_until)>new Date())return{id,blocked:true};return{id,blocked:false,row}}
async function recordFailedLogin(env,state){const now=new Date();let attempts=1;let first=now.toISOString();if(state.row){const firstDate=new Date(state.row.first_attempt_at);if(now-firstDate<15*60*1000){attempts=int(state.row.attempts)+1;first=firstDate.toISOString()}}const blocked=attempts>=5?new Date(now.getTime()+15*60*1000).toISOString():null;await env.DB.prepare("INSERT INTO login_attempts(identity_hash,attempts,first_attempt_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(identity_hash) DO UPDATE SET attempts=excluded.attempts,first_attempt_at=excluded.first_attempt_at,blocked_until=excluded.blocked_until").bind(state.id,attempts,first,blocked).run()}
async function clearFailedLogin(env,id){await env.DB.prepare("DELETE FROM login_attempts WHERE identity_hash=?").bind(id).run()}

async function publicState(env){if(!env.DB)return json({ok:true,configured:false,promotions:[],products:[]});const promos=await env.DB.prepare("SELECT id,badge,title,text,button_label,button_url,sort_order FROM promotions WHERE active=1 AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY sort_order ASC,id DESC").bind(nowIso(),nowIso()).all();const products=await env.DB.prepare("SELECT id,title,description,price_cents,compare_at_cents,image_key,image_alt,sort_order FROM shop_products WHERE active=1 ORDER BY sort_order ASC,id DESC").all();return json({ok:true,configured:true,promotions:promos.results||[],products:(products.results||[]).map(p=>({...p,image_url:p.image_key?`/media/${encodeURIComponent(p.image_key).replace(/%2F/g,"/")}`:""}))},{200,"cache-control":"public, max-age=30, stale-while-revalidate=120"})}

async function adminState(env){const [promotions,products,media]=await Promise.all([
 env.DB.prepare("SELECT * FROM promotions ORDER BY sort_order ASC,id DESC").all(),
 env.DB.prepare("SELECT * FROM shop_products ORDER BY sort_order ASC,id DESC").all(),
 env.DB.prepare("SELECT * FROM media ORDER BY id DESC LIMIT 200").all()
]);return json({ok:true,promotions:promotions.results||[],products:(products.results||[]).map(p=>({...p,image_url:p.image_key?`/media/${encodeURIComponent(p.image_key).replace(/%2F/g,"/")}`:""})),media:(media.results||[]).map(m=>({...m,url:`/media/${encodeURIComponent(m.object_key).replace(/%2F/g,"/")}`}))})}

async function bodyJson(req){try{return await req.json()}catch{return{}}}
async function createPromotion(env,req){const b=await bodyJson(req);const title=clean(b.title,140);if(!title)return json({ok:false,error:"Titel fehlt"},400);const row={badge:clean(b.badge||"ANGEBOT",40),title,text:clean(b.text,500),button_label:clean(b.button_label,60),button_url:safeUrl(b.button_url),active:boolInt(b.active??true),sort_order:int(b.sort_order),starts_at:nullableIso(b.starts_at),ends_at:nullableIso(b.ends_at)};const r=await env.DB.prepare("INSERT INTO promotions(badge,title,text,button_label,button_url,active,sort_order,starts_at,ends_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(row.badge,row.title,row.text,row.button_label,row.button_url,row.active,row.sort_order,row.starts_at,row.ends_at,nowIso()).run();return json({ok:true,id:r.meta.last_row_id})}
async function updatePromotion(env,req,id){const b=await bodyJson(req);const title=clean(b.title,140);if(!title)return json({ok:false,error:"Titel fehlt"},400);await env.DB.prepare("UPDATE promotions SET badge=?,title=?,text=?,button_label=?,button_url=?,active=?,sort_order=?,starts_at=?,ends_at=?,updated_at=? WHERE id=?").bind(clean(b.badge||"ANGEBOT",40),title,clean(b.text,500),clean(b.button_label,60),safeUrl(b.button_url),boolInt(b.active),int(b.sort_order),nullableIso(b.starts_at),nullableIso(b.ends_at),nowIso(),id).run();return json({ok:true})}
async function deletePromotion(env,id){await env.DB.prepare("DELETE FROM promotions WHERE id=?").bind(id).run();return json({ok:true})}

function productPayload(b){const title=clean(b.title,160);const price=Math.max(0,int(b.price_cents));const compare=b.compare_at_cents===null||b.compare_at_cents===""?null:Math.max(0,int(b.compare_at_cents));return{title,description:clean(b.description,1200),price_cents:price,compare_at_cents:compare,image_key:clean(b.image_key,500)||null,image_alt:clean(b.image_alt,180),active:boolInt(b.active??true),sort_order:int(b.sort_order)}}
async function createProduct(env,req){const p=productPayload(await bodyJson(req));if(!p.title)return json({ok:false,error:"Produktname fehlt"},400);const r=await env.DB.prepare("INSERT INTO shop_products(title,description,price_cents,compare_at_cents,image_key,image_alt,active,sort_order,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(p.title,p.description,p.price_cents,p.compare_at_cents,p.image_key,p.image_alt,p.active,p.sort_order,nowIso()).run();return json({ok:true,id:r.meta.last_row_id})}
async function updateProduct(env,req,id){const p=productPayload(await bodyJson(req));if(!p.title)return json({ok:false,error:"Produktname fehlt"},400);await env.DB.prepare("UPDATE shop_products SET title=?,description=?,price_cents=?,compare_at_cents=?,image_key=?,image_alt=?,active=?,sort_order=?,updated_at=? WHERE id=?").bind(p.title,p.description,p.price_cents,p.compare_at_cents,p.image_key,p.image_alt,p.active,p.sort_order,nowIso(),id).run();return json({ok:true})}
async function deleteProduct(env,id){await env.DB.prepare("DELETE FROM shop_products WHERE id=?").bind(id).run();return json({ok:true})}

async function uploadMedia(env,req){const miss=await requireBindings(env,{media:true});if(miss)return miss;const form=await req.formData();const file=form.get("file");if(!(file instanceof File))return json({ok:false,error:"Keine Datei gewählt"},400);if(!ALLOWED_IMAGE_TYPES[file.type])return json({ok:false,error:"Nur JPG, PNG, WebP, AVIF oder GIF erlaubt"},415);if(file.size>MAX_UPLOAD)return json({ok:false,error:"Bild ist größer als 8 MB"},413);const ext=ALLOWED_IMAGE_TYPES[file.type];const date=new Date();const prefix=`${date.getUTCFullYear()}/${String(date.getUTCMonth()+1).padStart(2,"0")}`;const key=`${prefix}/${crypto.randomUUID()}.${ext}`;await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"public, max-age=31536000, immutable"},customMetadata:{originalName:clean(file.name,180)}});const r=await env.DB.prepare("INSERT INTO media(object_key,original_name,content_type,size_bytes) VALUES(?,?,?,?)").bind(key,clean(file.name,180),file.type,file.size).run();return json({ok:true,id:r.meta.last_row_id,key,url:`/media/${key}`})}
async function deleteMedia(env,id){const miss=await requireBindings(env,{media:true});if(miss)return miss;const row=await env.DB.prepare("SELECT object_key FROM media WHERE id=?").bind(id).first();if(!row)return json({ok:false,error:"Medium nicht gefunden"},404);const used=await env.DB.prepare("SELECT COUNT(*) AS c FROM shop_products WHERE image_key=?").bind(row.object_key).first();if(int(used?.c)>0)return json({ok:false,error:"Dieses Bild wird noch von einem Shop-Produkt verwendet."},409);await env.MEDIA.delete(row.object_key);await env.DB.prepare("DELETE FROM media WHERE id=?").bind(id).run();return json({ok:true})}

export async function onRequest(context){
 const {request,env}=context;const url=new URL(request.url);const parts=url.pathname.replace(/^\/api\/?/,"").split("/").filter(Boolean);const route=parts[0]||"";const method=request.method.toUpperCase();
 if(method==="OPTIONS")return new Response(null,{status:204});
 if(route==="health"&&method==="GET")return json({ok:true,configured:!!env.DB,media:!!env.MEDIA,adminSecret:!!env.ADMIN_PASSWORD});
 if(route==="public"&&method==="GET")return publicState(env);
 if(route==="login"&&method==="POST"){
   const miss=await requireBindings(env);if(miss)return miss;if(!env.ADMIN_PASSWORD)return json({ok:false,error:"ADMIN_PASSWORD ist noch nicht als Cloudflare Secret gesetzt."},503);
   const rate=await loginRateState(env,request);if(rate.blocked)return json({ok:false,error:"Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen."},429);
   const b=await bodyJson(request);if(!(await sameSecret(clean(b.password,300),env.ADMIN_PASSWORD))){await recordFailedLogin(env,rate);return json({ok:false,error:"Passwort ist nicht korrekt."},401)}
   await clearFailedLogin(env,rate.id);const bytes=crypto.getRandomValues(new Uint8Array(32));const token=b64url(bytes);const hash=await sha256(token);const expires=new Date(Date.now()+7*864e5).toISOString();await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at<=?").bind(nowIso()).run();await env.DB.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)").bind(hash,expires).run();return json({ok:true},200,{"set-cookie":sessionCookie(token)});
 }
 if(route==="logout"&&method==="POST"){
   const token=getCookie(request,COOKIE_NAME);if(env.DB&&token)await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha256(token)).run();return json({ok:true},200,{"set-cookie":noSessionCookie()});
 }
 if(route!=="admin")return json({ok:false,error:"Nicht gefunden"},404);
 const auth=await requireAdmin(context);if(auth.response)return auth.response;
 if(method!=="GET"){const bad=await requireWriteHeader(request);if(bad)return bad}
 const area=parts[1]||"state";const id=int(parts[2],0);
 try{
   if(area==="state"&&method==="GET")return adminState(env);
   if(area==="promotions"&&method==="POST")return createPromotion(env,request);
   if(area==="promotions"&&method==="PUT"&&id)return updatePromotion(env,request,id);
   if(area==="promotions"&&method==="DELETE"&&id)return deletePromotion(env,id);
   if(area==="products"&&method==="POST")return createProduct(env,request);
   if(area==="products"&&method==="PUT"&&id)return updateProduct(env,request,id);
   if(area==="products"&&method==="DELETE"&&id)return deleteProduct(env,id);
   if(area==="media"&&method==="POST")return uploadMedia(env,request);
   if(area==="media"&&method==="DELETE"&&id)return deleteMedia(env,id);
   return json({ok:false,error:"Admin-Endpunkt nicht gefunden"},404);
 }catch(error){console.error(error);return json({ok:false,error:"Serverfehler. Bitte Cloudflare Functions Logs prüfen."},500)}
}
