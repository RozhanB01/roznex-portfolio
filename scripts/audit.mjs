import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const failures=[];
const ok=message=>console.log('✓',message);
const fail=message=>{failures.push(message);console.error('✗',message)};

const required=[
  'index.html','styles.css','script.js','manifest.webmanifest','robots.txt','sitemap.xml',
  'vercel.json','server.js','api/admin.js','api/quote.js','api/projects.js',
  'api/requests.js','api/site-content.js','lib/admin-session.js','lib/blob-config.js',
  '.well-known/security.txt',
  'services/index.html','services/services.css',
  'services/fa/ai-agents/index.html','services/en/ai-agents/index.html',
  'services/fa/web-design/index.html','services/en/web-design/index.html',
  'services/fa/3d-web/index.html','services/en/3d-web/index.html',
  'services/fa/technical-seo/index.html','services/en/technical-seo/index.html',
  'insights/index.html','insights/insights.css','insights/rss.xml',
  'insights/fa/ai-agent-business/index.html',
  'insights/en/ai-agents-for-business/index.html',
  'insights/fa/professional-corporate-website/index.html',
  'insights/en/professional-corporate-website/index.html',
  'insights/fa/technical-seo-nextjs/index.html',
  'insights/en/technical-seo-nextjs/index.html'
];
for(const file of required){
  if(fs.existsSync(path.join(root,file)))ok('exists '+file);
  else fail('missing '+file);
}

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','.git'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const all=walk(root);
for(const file of all.filter(f=>f.endsWith('.js')||f.endsWith('.mjs'))){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status===0)ok('syntax '+path.relative(root,file));
  else fail('syntax '+path.relative(root,file)+'\n'+(result.stderr||result.stdout||'').trim());
}

for(const file of all.filter(f=>f.endsWith('.json')||f.endsWith('.webmanifest'))){
  try{JSON.parse(fs.readFileSync(file,'utf8'));ok('json '+path.relative(root,file))}
  catch(error){fail('invalid json '+path.relative(root,file)+': '+error.message)}
}

const blobConfig=fs.readFileSync(path.join(root,'lib/blob-config.js'),'utf8');
if(!blobConfig.includes('ROZNEX_READ_WRITE_TOKEN'))fail('custom-prefix Vercel Blob token is not supported');
else ok('custom-prefix Vercel Blob token supported');
if(!blobConfig.includes('ROZNEX_STORE_ID'))fail('custom-prefix Vercel Blob store id is not supported');
else ok('custom-prefix Vercel Blob store id supported');

const quote=fs.readFileSync(path.join(root,'api/quote.js'),'utf8');
if(quote.includes('const CATALOG={'))fail('SmartQuote catalog must not be committed in public source');
else ok('SmartQuote catalog absent from public source');
if(!quote.includes('ROZNEX_QUOTE_CATALOG_JSON'))fail('SmartQuote private catalog env is not enforced');
else ok('SmartQuote private catalog env enforced');

if(!quote.includes('ROZNEX_QUOTE_SIGNING_SECRET'))fail('SmartQuote server-side signing secret is not enforced');
else ok('server-side SmartQuote signing secret enforced');
if(!quote.includes('v:Number(p.v||0)'))fail('SmartQuote invite payload version is not preserved');
else ok('SmartQuote invite payload version preserved');

const invite=fs.readFileSync(path.join(root,'api/admin-invite.js'),'utf8');
if(invite.includes('roznex_signing_key')||invite.includes('privateKey'))fail('browser-stored SmartQuote signing key detected');
else ok('SmartQuote signing stays server-side');
if(!invite.includes('ROZNEX_PUBLIC_ORIGIN'))fail('canonical SmartQuote invitation origin is not enforced');
else ok('canonical SmartQuote invitation origin enforced');

const requestsApi=fs.readFileSync(path.join(root,'api/requests.js'),'utf8');
if(!requestsApi.includes('REQUEST_RATE_PREFIX')||!requestsApi.includes('REQUEST_RATE_MAX'))fail('public project request rate limiting is missing');
else ok('public project request rate limiting enabled');

const storageHealth=fs.readFileSync(path.join(root,'api/storage-health.js'),'utf8');
const publicLeakCount=(storageHealth.match(/detectedTokenKey:/g)||[]).length;
if(publicLeakCount>2)fail('storage health may expose environment key names publicly');
else ok('public storage health does not expose environment key names');
const admin=fs.readFileSync(path.join(root,'api/admin.js'),'utf8');
if(/ROZNEX_ADMIN_PASSWORD_HASH\s*\|\|\s*['"][a-f0-9]{64}/i.test(admin))fail('hard-coded admin password hash fallback detected');
else ok('no hard-coded admin password hash fallback');
if(!admin.includes('LOGIN_RATE_PREFIX')||!admin.includes('LOGIN_MAX_FAILURES'))fail('admin brute-force rate limiting is missing');
else ok('admin brute-force rate limiting enabled');

const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
const rewrites=vercel.rewrites||[];
for(const source of ['/admin','/quote','/quote/']){
  if(rewrites.some(r=>r.source===source))ok('rewrite '+source);
  else fail('missing rewrite '+source);
}

const htmlFiles=['index.html','start/index.html','404.html'].filter(f=>fs.existsSync(path.join(root,f)));
for(const rel of htmlFiles){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  const dir=path.dirname(path.join(root,rel));
  const refs=[...html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)].map(m=>m[1]);
  for(const ref of refs){
    if(/^(?:https?:|mailto:|tel:|data:|\/)/.test(ref))continue;
    const resolved=path.resolve(dir,ref);
    if(fs.existsSync(resolved))continue;
    if(ref.endsWith('/'))continue;
    fail(rel+' references missing local file '+ref);
  }
}


/* Case study SEO checks */
const caseStudyPages=[
  'work/fa/industrial-intelligence/index.html','work/en/industrial-intelligence/index.html',
  'work/fa/familyos/index.html','work/en/familyos/index.html',
  'work/fa/vilara/index.html','work/en/vilara/index.html',
  'work/fa/lilium/index.html','work/en/lilium/index.html'
];
for(const rel of ['work/index.html','work/work.css',...caseStudyPages]){
  if(!fs.existsSync(path.join(root,rel)))fail('missing '+rel);
}
const workSitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const rel of caseStudyPages){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1]||'';
  if(!canonical)fail(rel+' missing canonical'); else ok('canonical '+rel);
  if(!html.includes('hreflang='))fail(rel+' missing hreflang'); else ok('hreflang '+rel);
  if(!html.includes('"@type":"CreativeWork"'))fail(rel+' missing CreativeWork schema'); else ok('CreativeWork schema '+rel);
  if(!html.includes('"@type":"BreadcrumbList"'))fail(rel+' missing breadcrumb schema'); else ok('breadcrumb '+rel);
  if(canonical&&!workSitemap.includes('<loc>'+canonical+'</loc>'))fail(rel+' canonical missing from sitemap'); else if(canonical)ok('sitemap '+rel);
}
if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/work/'))fail('Homepage does not link to case studies'); else ok('Homepage links to case studies');

/* Commercial service SEO checks */
const servicePages=[
  'services/fa/ai-agents/index.html','services/en/ai-agents/index.html',
  'services/fa/web-design/index.html','services/en/web-design/index.html',
  'services/fa/3d-web/index.html','services/en/3d-web/index.html',
  'services/fa/technical-seo/index.html','services/en/technical-seo/index.html'
];
const serviceSitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const rel of servicePages){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1]||'';
  if(!canonical)fail(rel+' missing canonical');
  else ok('canonical '+rel);
  if(!html.includes('hreflang='))fail(rel+' missing hreflang');
  else ok('hreflang '+rel);
  if(!html.includes('"@type":"Service"'))fail(rel+' missing Service schema');
  else ok('Service schema '+rel);
  if(!html.includes('"@type":"BreadcrumbList"'))fail(rel+' missing breadcrumb schema');
  else ok('breadcrumb schema '+rel);
  if(canonical&&!serviceSitemap.includes('<loc>'+canonical+'</loc>'))fail(rel+' canonical missing from sitemap');
  else if(canonical)ok('sitemap '+rel);
}
if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/services/'))fail('Homepage does not link to service pages');
else ok('Homepage links to service pages');

/* SEO article checks */
const seoArticles=[
  'insights/fa/ai-agent-business/index.html',
  'insights/en/ai-agents-for-business/index.html',
  'insights/fa/professional-corporate-website/index.html',
  'insights/en/professional-corporate-website/index.html',
  'insights/fa/technical-seo-nextjs/index.html',
  'insights/en/technical-seo-nextjs/index.html'
];
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const rel of seoArticles){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1]||'';
  if(!canonical)fail(rel+' missing canonical');
  else ok('canonical '+rel);
  if(!html.includes('hreflang='))fail(rel+' missing hreflang');
  else ok('hreflang '+rel);
  if(!html.includes('"@type":"BlogPosting"'))fail(rel+' missing BlogPosting schema');
  else ok('BlogPosting schema '+rel);
  if(!html.includes('"@type":"BreadcrumbList"'))fail(rel+' missing breadcrumb schema');
  else ok('breadcrumb schema '+rel);
  if(!html.includes('<meta name="description"'))fail(rel+' missing meta description');
  if(canonical&&!sitemap.includes('<loc>'+canonical+'</loc>'))fail(rel+' canonical missing from sitemap');
  else if(canonical)ok('sitemap '+rel);
}
const insightsIndex=fs.readFileSync(path.join(root,'insights/index.html'),'utf8');
if(!insightsIndex.includes('application/rss+xml'))fail('Insights index missing RSS discovery');
else ok('Insights RSS discovery');
if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/insights/'))fail('Homepage does not link to Insights');
else ok('Homepage links to Insights');

if(failures.length){
  console.error('\nROZNEX audit failed with '+failures.length+' issue(s).');
  process.exit(1);
}
console.log('\nROZNEX audit passed.');
