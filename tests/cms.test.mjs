import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequest } from '../functions/api/[[path]].js';
import { onRequest as mediaRequest } from '../functions/media/[[key]].js';
export function database() {
  const sql=new DatabaseSync(':memory:');
  const db={
    prepare(query) {
      let args=[];
      return {
        bind(...values){args=values;return this},
        async first(){return sql.prepare(query).get(...args)||null},
        async all(){return {results:sql.prepare(query).all(...args)}},
        async run(){const r=sql.prepare(query).run(...args);return {success:true,meta:{last_row_id:Number(r.lastInsertRowid),changes:Number(r.changes)}}}
      };
    },
    async exec(query){sql.exec(query)},
    async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}},
    close(){sql.close()}
  };return db;
}
const call=(env,path,method='GET',body,cookie='',headers={})=>onRequest({env,request:new Request('https://plant-guide.test/api/'+path,{method,headers:{cookie,'cf-connecting-ip':'127.0.0.1','x-requested-with':'plant-guide-admin',...headers},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)})});
async function setup(){
  const env={DB:database(),ADMIN_USERNAME:'Nicole',ADMIN_PASSWORD:'test-only-password'};
  const r=await call(env,'login','POST',{username:'Nicole',password:env.ADMIN_PASSWORD});
  assert.equal(r.status,200);
  return {env,cookie:r.headers.get('set-cookie').split(';')[0]};
}
test('D1-only health, authenticated CRUD and public visibility',async()=>{
  const {env,cookie}=await setup();
  try{
    const health=await (await call(env,'health')).json();assert.equal(health.ready,true);assert.equal(health.media.storage,'D1');
    assert.equal((await call(env,'admin/state')).status,401);
    let admin=await (await call(env,'admin/state','GET',undefined,cookie)).json();
    assert.equal(admin.services.length,4);
    assert.equal(admin.services[0].title,'Schulter- & Nackenproblematik');
    assert.equal(admin.content.hero_title,'Deine Gesundheit.');
    const promo=await (await call(env,'admin/promotions','POST',{title:'Testangebot',active:true},cookie)).json();
    const product=await (await call(env,'admin/products','POST',{title:'Testprodukt',price_cents:1990,active:true},cookie)).json();
    const service=await (await call(env,'admin/services','POST',{title:'Neue Leistung',description:'Kurz',detail_text:'Lang',price_cents:1990,active:true,sort_order:-1},cookie)).json();
    await call(env,'admin/content','PUT',{hero_title:'Neue Botschaft',contact_text:'Jetzt Termin anfragen.'},cookie);
    let pub=await (await call(env,'public')).json();assert.equal(pub.promotions[0].title,'Testangebot');assert.equal(pub.products[0].price_cents,1990);assert.equal(pub.services[0].title,'Neue Leistung');assert.equal(pub.content.hero_title,'Neue Botschaft');
    await call(env,'admin/services/'+service.id,'PUT',{title:'Bearbeitete Leistung',price_cents:2490,active:false},cookie);
    await call(env,'admin/products/'+product.id,'PUT',{title:'Bearbeitet',price_cents:2490,active:false},cookie);
    await call(env,'admin/promotions/'+promo.id,'PUT',{title:'Entwurf',active:false},cookie);
    pub=await (await call(env,'public')).json();assert.equal(pub.products.length,0);assert.equal(pub.promotions.length,0);
    await call(env,'admin/products/'+product.id,'DELETE',undefined,cookie);
    await call(env,'admin/promotions/'+promo.id,'DELETE',undefined,cookie);
    await call(env,'admin/services/'+service.id,'DELETE',undefined,cookie);
    assert.equal((await (await call(env,'admin/state','GET',undefined,cookie)).json()).products.length,0);
    await call(env,'logout','POST',undefined,cookie);
    assert.equal((await call(env,'admin/state','GET',undefined,cookie)).status,401);
  }finally{env.DB.close()}
});
test('D1 binary uploads, retrieval, in-use protection and removal',async()=>{
  const {env,cookie}=await setup();
  try{
    const bytes=Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3,4]);
    const form=new FormData();form.set('file',new File([bytes],'test.png',{type:'image/png'}));
    const uploaded=await call(env,'admin/media','POST',form,cookie);assert.equal(uploaded.status,200);
    const data=await uploaded.json();
    const get=()=>mediaRequest({env,request:new Request('https://plant-guide.test'+data.url)});
    assert.deepEqual(new Uint8Array(await (await get()).arrayBuffer()),bytes);
    const product=await (await call(env,'admin/products','POST',{title:'Foto',image_key:data.key,price_cents:10},cookie)).json();
    assert.equal((await call(env,'admin/media/'+data.id,'DELETE',undefined,cookie)).status,409);
    await call(env,'admin/products/'+product.id,'DELETE',undefined,cookie);
    const service=await (await call(env,'admin/services','POST',{title:'Foto-Leistung',image_key:data.key,price_cents:10},cookie)).json();
    assert.equal((await call(env,'admin/media/'+data.id,'DELETE',undefined,cookie)).status,409);
    await call(env,'admin/services/'+service.id,'DELETE',undefined,cookie);
    assert.equal((await call(env,'admin/media/'+data.id,'DELETE',undefined,cookie)).status,200);
    assert.equal((await get()).status,404);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM media_files').first()).n,0);
  }finally{env.DB.close()}
});
test('Reject disguised and oversized files; rate limit ignores User-Agent changes',async()=>{
  const {env,cookie}=await setup();
  try{
    for(const [bytes,status] of [[new TextEncoder().encode('<script>bad</script>'),415],[new Uint8Array(1024*1024+1),413]]){
      const form=new FormData();form.set('file',new File([bytes],'fake.png',{type:'image/png'}));
      assert.equal((await call(env,'admin/media','POST',form,cookie)).status,status);
    }
    for(let i=0;i<5;i++)assert.equal((await call(env,'login','POST',{username:'Nicole',password:'wrong'},'',{'user-agent':String(i)})).status,401);
    assert.equal((await call(env,'login','POST',{username:'Nicole',password:'wrong'},'',{'user-agent':'another'})).status,429);
  }finally{env.DB.close()}
});
test('Missing bindings and asynchronous query failures return controlled errors',async()=>{
  assert.equal((await call({},'login','POST',{})).status,503);
  const {env}=await setup();
  try{
    const orig=env.DB.prepare;env.DB.prepare=q=>q.startsWith('SELECT id,')?{bind(){return this},async all(){throw new Error('simulated outage')}}:orig(q);
    assert.equal((await call(env,'public')).status,500);
    assert.equal((await mediaRequest({env:{},request:new Request('https://plant-guide.test/media/d1/a.png')})).status,503);
  }finally{env.DB.close()}
});

