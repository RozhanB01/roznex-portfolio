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
 let item;
 try {
  item=await blob.get(FILE,blobOptions({access:'private',useCache:false}));
 } catch(error) {
  if(error?.name==='BlobNotFoundError'||error?.statusCode===404)return [];
  throw error;
 }
 if(!item||item.statusCode===404)return [];
 if(item.statusCode!==200)throw new Error('unexpected_blob_status');
 const data=JSON.parse(await new Response(item.stream).text());
 return Array.isArray(data.snapshots)?data.snapshots.slice(-20):[];
}
module.exports=async function handler(req,res){
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return reply(res,405,{error:'method_not_allowed'});}
 if(!(await isAdminRequest(req)))return reply(res,401,{error:'unauthorized'});
 if(!hasBlobStorage())return reply(res,503,{error:'storage_not_configured'});
 try{
  const blob=await import('@vercel/blob');
  if(req.method==='GET')return reply(res,200,{snapshots:await read(blob)});
  const origin=String(req.headers.origin||'');
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(origin){
   let originHost='';
   try{originHost=new URL(origin).host.toLowerCase()}catch{return reply(res,403,{error:'origin_mismatch'})}
   if(originHost!==host.toLowerCase())return reply(res,403,{error:'origin_mismatch'});
  }
  const contentType=String(req.headers['content-type']||'').toLowerCase();
  if(!contentType.includes('application/json'))return reply(res,415,{error:'json_required'});
  const contentLength=Number(req.headers['content-length']||0);
  if(contentLength>150000)return reply(res,413,{error:'payload_too_large'});
  const body=typeof req.body==='object'&&req.body?req.body:JSON.parse(String(req.body||'{}'));
  if(!body||Array.isArray(body)||typeof body!=='object')return reply(res,400,{error:'invalid_payload'});
  if(!Array.isArray(body.pages)||!Array.isArray(body.recommendations))return reply(res,400,{error:'invalid_payload'});
  if(JSON.stringify(body).length>150000)return reply(res,413,{error:'payload_too_large'});
  const pages=body.pages;
  const recommendations=body.recommendations;
  if(pages.length>40||recommendations.length>300)return reply(res,400,{error:'too_many_items'});
  if(recommendations.some(r=>!r||typeof r!=='object'||Array.isArray(r)))return reply(res,400,{error:'invalid_recommendations'});
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
  console.error('SEO history error',e?.message);
  return reply(res,500,{error:'storage_failed'});
 }
};
