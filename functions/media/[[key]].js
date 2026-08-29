export async function onRequestGet({request,env}){
  if(!env.MEDIA)return new Response('Media binding missing',{status:503});
  const url=new URL(request.url);
  const key=decodeURIComponent(url.pathname.replace(/^\/media\/?/,'')).replace(/^\/+/,"");
  if(!key||key.includes('..'))return new Response('Not found',{status:404});
  const object=await env.MEDIA.get(key);
  if(!object)return new Response('Not found',{status:404});
  const headers=new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag',object.httpEtag);
  headers.set('cache-control','public, max-age=31536000, immutable');
  headers.set('x-content-type-options','nosniff');
  return new Response(object.body,{headers});
}

export async function onRequest(){return new Response('Method not allowed',{status:405,headers:{allow:'GET'}})}
