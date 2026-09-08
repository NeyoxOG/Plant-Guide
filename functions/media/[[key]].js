export async function onRequest({request,env}) {
  if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
  if(!env.DB) return new Response('Media temporarily unavailable',{status:503});
  let key;
  try { key=decodeURIComponent(new URL(request.url).pathname.replace(/^\/media\/?/,'')); }
  catch { return new Response('Invalid URL',{status:400}); }
  if(!/^d1\/[a-f0-9-]+\.(jpg|png|webp|avif|gif)$/.test(key)) return new Response('Not found',{status:404});
  try {
    const row=await env.DB.prepare('SELECT m.content_type,m.size_bytes,f.data FROM media m JOIN media_files f ON f.object_key=m.object_key WHERE m.object_key=?').bind(key).first();
    if(!row) return new Response('Not found',{status:404});
    const headers={'content-type':row.content_type,'content-length':String(row.size_bytes),'cache-control':'public, max-age=3600','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'"};
    const body=Array.isArray(row.data)?new Uint8Array(row.data):row.data;
    return new Response(request.method==='HEAD'?null:body,{headers});
  } catch(error) {
    console.error('Media read failed',error);
    return new Response('Media temporarily unavailable',{status:503,headers:{'cache-control':'no-store'}});
  }
}
