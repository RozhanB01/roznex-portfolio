const { isAdminRequest, hasBlobStorage } = require('../lib/admin-session');
const { blobOptions } = require('../lib/blob-config');
const FILE = 'roznex/private/seo-history.json';
function reply(res,status,value){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(value));
}
async function read(blob){
 const item=await blob.get(FILE,blobOptions({access:'private',useCache:false}));
 if(!item||item.statusCode!==200)return [];
 const data=JSON.parse(await new Response(item.stream).text());
 return Array.isArray(data.snapshots)?data.snapshots.slice(-20):[];
}
module.exports=async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return reply(res,405,{error:'method_not_allowed'});
 if(!(await isAdminRequest(req)))return reply(res,401,{error:'unauthorized'});
 if(!hasBlobStorage())return reply(res,503,{error:'storage_not_configured'});
 try{
  const blob=await import('@vercel/blob');
  if(req.method==='GET')return reply(res,200,{snapshots:await read(blob)});
  const origin=String(req.headers.origin||'');
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(origin&&new URL(origin).host!==host)return reply(res,403,{error:'origin_mismatch'});
  const body=typeof req.body==='object'&&req.body?req.body:JSON.parse(String(req.body||'{}'));
  const pages=Array.isArray(body.pages)?body.pages:[];
  const recommendations=Array.isArray(body.recommendations)?body.recommendations:[];
  if(pages.length>40||recommendations.length>300)return reply(res,400,{error:'too_many_items'});
  const cleaned=recommendations.map(r=>({
   path:String(r.path||'').slice(0,160),
   issue:String(r.issue||'').slice(0,300),
   priority:String(r.priority||'').slice(0,30),
   action:String(r.action||'').slice(0,500)
  }));
  const snapshot={generatedAt:new Date().toISOString(),pageCount:pages.length,recommendations:cleaned};
  const snapshots=(await read(blob)).concat(snapshot).slice(-20);
  await blob.put(FILE,JSON.stringify({version:1,snapshots}),blobOptions({
   access:'private',addRandomSuffix:false,allowOverwrite:true,
   contentType:'application/json',cacheControlMaxAge:60
  }));
  return reply(res,200,{saved:true,snapshotCount:snapshots.length});
 }catch(e){
  if(e?.name==='BlobNotFoundError')return reply(res,200,{snapshots:[]});
  console.error('SEO history error',e?.message);
  return reply(res,500,{error:'storage_failed'});
 }
};
