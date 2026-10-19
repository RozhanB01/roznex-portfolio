#!/usr/bin/env node
/**
 * ROZNEX SEO Agent / Technical Monitor v1.
 * Read-only, domain-scoped crawl. No auto-content, backlinks, or production edits.
 * All opportunities are evidence based; no ranking/traffic forecasts.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const ORIGIN='https://roznexstudio.ir';
const OUTPUT=process.env.SEO_REPORT_DIR || 'reports/seo-agent';
const MAX_PAGES=65;
const CONCURRENCY=4;
const issues=[];
const summary={timestamp:new Date().toISOString(),origin:ORIGIN,source:'live HTML and sitemap',pages:0,httpFailures:0,critical:0,warning:0,notice:0,issues,opportunities:[]};

const plain=(s='')=>String(s).replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|lt|gt|quot|#39);/g,' ').replace(/\s+/g,' ').trim();
const escapeMd=(s='')=>String(s).replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');
const tag=(html,name)=>html.match(new RegExp('<'+name+'\\b[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';
const meta=(html,key,mode='name')=>{
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
   const node=m[0],k=node.match(new RegExp('\\b'+mode+'\\s*=\\s*"([^"]+)"','i'))?.[1];
  if(k?.toLowerCase()===key.toLowerCase())return node.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]||'';
 }
 return '';
};
const rel=(html,name)=>{
 for(const m of html.matchAll(/<link\b[^>]*>/gi)){
  if(m[0].match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase().split(/\s+/).includes(name)){
   return m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]||'';
  }
 }
 return '';
};
function issue(level,code,url,detail,remedy){
 issues.push({level,code,url,detail,remedy});
 summary[level]=(summary[level]||0)+1;
}
const cleanUrl=(u)=>{try{const url=new URL(u);url.hash='';url.search='';return url.href;}catch{return u;}};
const pageCategory=u=>u.includes('/services/')?'commercial':u.includes('/insights/')?'editorial':u.includes('/work/')?'proof':'identity';
const impactFor=u=>pageCategory(u)==='commercial'?'high':pageCategory(u)==='identity'?'high':'medium';
const checkedPages=new Map();

async function get(url){
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),14000);
  try{
   const res=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'User-Agent':'ROZNEX-SEO-Agent/1.0 (+https://roznexstudio.ir/)','Accept':'text/html,application/xml,text/xml;q=0.9,*/*;q=0.5'}});
   const body=await res.text();
   return {status:res.status,url:res.url,body,contentType:res.headers.get('content-type')||''};
  }catch(err){
   if(attempt===1)throw err;
   await new Promise(resolve=>setTimeout(resolve,750));
  }finally{clearTimeout(timeout);}
 }
}
async function main(){
 const sitemap=await get(ORIGIN+'/sitemap.xml');
 if(sitemap.status!==200||!/<urlset\b/.test(sitemap.body))throw Error('Primary sitemap is inaccessible or invalid');
 let urls=[...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(x=>x[1].replace(/&amp;/g,'&'));
 if(urls.length===0||urls.length>MAX_PAGES)throw Error('Unexpected sitemap length: '+urls.length);
 urls=[...new Set(urls.map(cleanUrl))];
 const sitemapSet=new Set(urls);
 const titleMap=new Map(), inbound=new Map();
 for(const u of urls){
  if(!u.startsWith(ORIGIN+'/'))issue('critical','off_domain_sitemap',u,'Sitemap contains unexpected host','Keep canonical URLs on roznexstudio.ir');
  inbound.set(u,0);
 }
 let index=0;
 async function worker(){
  while(index<urls.length){
   const url=urls[index++];
   if(!url.startsWith(ORIGIN+'/'))continue;
   let result;
   try{result=await get(url);}catch(e){
    issue('critical','fetch_failed',url,String(e),'Review HTTPS and site availability');summary.httpFailures++;continue;
   }
   if(result.status!==200){
    issue('critical','http_status',url,'HTTP '+result.status,'Fix URL, redirect or sitemap entry');
    summary.httpFailures++;continue;
   }
   if(!result.contentType.includes('html')){
    issue('critical','unexpected_type',url,'Content-Type '+result.contentType,'Ensure sitemap pages serve HTML');continue;
   }
   const html=result.body,htmlTag=html.match(/<html\b[^>]*>/i)?.[0]||'';
   const lang=htmlTag.match(/\blang\s*=\s*["']([^"']+)["']/i)?.[1]||'';
   const title=plain(tag(html,'title'));
   const description=meta(html,'description');
   const canonical=cleanUrl(rel(html,'canonical'));
   const h1Count=[...html.matchAll(/<h1\b/gi)].length;
   const robots=meta(html,'robots').toLowerCase();
   const ogImage=meta(html,'og:image','property');
   const internalLinks=new Set();
   for(const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)){
    try{
     const linked=new URL(m[1],url);
     if(linked.origin===ORIGIN&&linked.pathname&&!linked.pathname.startsWith('/api/')&&!linked.pathname.startsWith('/admin/')){
       linked.hash='';linked.search='';
       internalLinks.add(linked.href);
     }
    }catch{}
   }
   for(const dest of internalLinks)if(inbound.has(dest))inbound.set(dest,inbound.get(dest)+1);
   const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]);
   let schemaValid=0;
   for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
     try{JSON.parse(m[1]);schemaValid++;}catch{issue('critical','invalid_jsonld',url,'Malformed structured data','Fix JSON-LD syntax using real page facts');}
   }
   const service=pageCategory(url)==='commercial';
   const next={title,description,canonical,h1Count,lang,ogImage,schemaValid,internalLinks:[...internalLinks],imageCount:images.length,service};
   checkedPages.set(url,next);
   summary.pages++;
   const key=lang.toLowerCase()+'|'+title.toLowerCase();
   if(!title)issue('critical','missing_title',url,'No HTML title','Add specific title matching page purpose');
   else{
    if(title.length<18||title.length>85)issue('warning','title_length',url,'Title has '+title.length+' chars','Write clear descriptive title rather than repeating keywords');
    const group=titleMap.get(key)||[];group.push(url);titleMap.set(key,group);
   }
   if(!description)issue('warning','missing_description',url,'No meta description','Write useful non-promotional page summary');
   if(!canonical||canonical!==url)issue('critical','canonical_mismatch',url,'Canonical is '+canonical,'Make canonical exactly match the chosen sitemap URL');
   if(robots.includes('noindex'))issue('critical','sitemap_noindex',url,'Sitemap page has noindex','Remove noindex or remove the URL from sitemap');
   if(h1Count!==1)issue('warning','heading_structure',url,'H1 count: '+h1Count,'Keep one descriptive visible H1');
   if(!lang||!['fa','en'].includes(lang.split('-')[0]))issue('warning','html_language',url,'HTML lang: '+lang,'Declare the correct page language');
   if(!ogImage)issue('notice','social_image',url,'OG image not specified','Use a relevant, licensed visual for shared links');
   if(schemaValid===0)issue('notice','structured_data',url,'No valid JSON-LD found','Add accurate schema if it describes visible content');
   if(images.some(img=>!/\balt\s*=/i.test(img)))issue('warning','image_alt',url,'Some images lack an alt attribute','Add meaningful alt or alt="" for decorative images');
   if(service&&!internalLinks.has(ORIGIN+'/start/')){
     issue('warning','missing_conversion_path',url,'No direct link to project request form','Provide a clear next step to request a project');
   }
   if(service&&description.length>0&&plain(tag(html,'main')).length<420){
     issue('warning','thin_service_content',url,'Service page may lack distinct explanatory copy','Explain customer need, deliverables and process with first-hand detail');
   }
   const hreflang=[...html.matchAll(/<link\b[^>]*hreflang\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(x=>x[1]);
   if(lang==='fa'&&!hreflang.includes('fa'))issue('notice','missing_hreflang',url,'No explicit fa alternate','Use self-referencing hreflang where language versions exist');
 }
 }
 await Promise.all(Array.from({length:CONCURRENCY},worker));
 for(const [key,list] of titleMap)if(list.length>1){
  for(const u of list)issue('warning','duplicate_title',u,'Shares the same title with '+list.filter(x=>x!==u).join(', '),'Differentiate search intent and page title');
 }
 for(const [u,count] of inbound)if(count===0&&pageCategory(u)!=='identity'){
  issue('warning','weak_internal_discovery',u,'No links from other sitemap pages found','Link this page naturally from a related service or article');
 }
 for(const [u,data] of checkedPages){
  if(data.service){
   summary.opportunities.push({page:u,intent:'commercial',priority:'high',nextAction:'Verify real case studies, prominent request CTA, sector-specific product language and mobile UX'});
  }
 }
 summary.opportunities.push({page:ORIGIN+'/about/fa/rozhan-behrouzi/',intent:'founder brand',priority:'high',nextAction:'Maintain verified bio, authentic projects and consistent identity'});
 summary.opportunities.push({page:ORIGIN+'/insights/fa/',intent:'topic authority',priority:'medium',nextAction:'Publish firsthand case evidence and original guides only after editorial review'});
 summary.opportunities.push({page:ORIGIN,intent:'measurement',priority:'blocking',nextAction:'Connect and verify Google Search Console; impressions, keyword volumes, clicks and conversions cannot be inferred by this crawler'});
 summary.issues.sort((a,b)=>({critical:0,warning:1,notice:2}[a.level]-({critical:0,warning:1,notice:2}[b.level])));
 const md=[
 '# ROZNEX SEO Agent — weekly audit',
 '',
 'Generated: '+summary.timestamp,
 'Public site: '+ORIGIN,
 '',
 '| Metric | Value |',
 '| --- | ---: |',
 '| Successfully audited pages | '+summary.pages+' |',
 '| Critical | '+summary.critical+' |',
 '| Warnings | '+summary.warning+' |',
 '| Notes | '+summary.notice+' |',
 '',
 '## Priority issues (top 30)',
 '',
 '| Severity | Code | Page | Finding / next step |',
 '| --- | --- | --- | --- |',
 ...summary.issues.slice(0,30).map(x=>'| '+x.level+' | '+escapeMd(x.code)+' | '+escapeMd(x.url)+' | '+escapeMd(x.detail+' — '+x.remedy)+' |'),
 '',
 '## Commercial content opportunities',
 '',
 ...summary.opportunities.map(x=>'- **'+x.priority+'** '+x.page+': '+x.nextAction),
 '',
 '## Limits / guardrails',
 '',
 '- Read-only: this agent makes no site edits, SEO promises, or autogenerated backlink/content submissions.',
 '- Google Search Console and analytics data are not connected here; this is not evidence of rankings, search demand, impressions, or customer conversion.',
 '- Report issues are heuristics; validate contextual exceptions with a human before changes.',
 ''
 ].join('\n');
 await mkdir(OUTPUT,{recursive:true});
 await writeFile(path.join(OUTPUT,'audit.json'),JSON.stringify(summary,null,2));
 await writeFile(path.join(OUTPUT,'audit.md'),md);
 console.log('ROZNEX SEO Agent:',JSON.stringify({audited:summary.pages,critical:summary.critical,warning:summary.warning,notice:summary.notice}));
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,md,{flag:'a'});
 if(process.env.SEO_STRICT==='1'&&summary.critical>0)process.exitCode=2;
}
main().catch(e=>{console.error('SEO Agent failed:',e);process.exitCode=1;});
