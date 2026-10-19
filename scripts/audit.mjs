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
  'insights/en/technical-seo-nextjs/index.html',
  'insights/fa/industrial-website-design/index.html','insights/en/industrial-website-design/index.html',
  'insights/fa/multilingual-seo-hreflang/index.html','insights/en/multilingual-seo-hreflang/index.html',
  'insights/fa/3d-web-performance/index.html','insights/en/3d-web-performance/index.html',
  'insights/fa/ai-agent-security/index.html','insights/en/ai-agent-security/index.html',
  'about/about.css','about/fa/rozhan-behrouzi/index.html','about/en/rozhan-behrouzi/index.html'
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

/* Author profile SEO */
for(const rel of ['about/fa/rozhan-behrouzi/index.html','about/en/rozhan-behrouzi/index.html']){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  if(!html.includes('"@type":"ProfilePage"'))fail(rel+' missing ProfilePage schema');
  if(!html.includes('"@type":"Person"'))fail(rel+' missing Person entity');
  if(!html.includes('rel="canonical"'))fail(rel+' missing canonical');
  if(!html.includes('hreflang='))fail(rel+' missing hreflang');
}
ok('author profile SEO');

/* SEO article checks */
const seoArticles=[
  'insights/fa/ai-agent-business/index.html',
  'insights/en/ai-agents-for-business/index.html',
  'insights/fa/professional-corporate-website/index.html',
  'insights/en/professional-corporate-website/index.html',
  'insights/fa/technical-seo-nextjs/index.html',
  'insights/en/technical-seo-nextjs/index.html',
  'insights/fa/industrial-website-design/index.html','insights/en/industrial-website-design/index.html',
  'insights/fa/multilingual-seo-hreflang/index.html','insights/en/multilingual-seo-hreflang/index.html',
  'insights/fa/3d-web-performance/index.html','insights/en/3d-web-performance/index.html',
  'insights/fa/ai-agent-security/index.html','insights/en/ai-agent-security/index.html'
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


/* Performance regression checks for the visitor-facing hero and mobile motion. */
const runtime=fs.readFileSync(path.join(root,'script.js'),'utf8');
const presentation=fs.readFileSync(path.join(root,'styles.css'),'utf8');
if(!runtime.includes("matchMedia('(min-width:901px)')"))fail('desktop-only pointer motion guard is missing');
if(!runtime.includes('lastServicePointerEvent<32')||!runtime.includes('lastDepthPointerEvent<32'))fail('pointer motion throttling missing');
if(!runtime.includes("el.textContent!==text")||!runtime.includes("el.getAttribute('href')!==href"))fail('localized homepage still invalidates unchanged DOM');
if(!runtime.includes("if(scrollY>0)requestAnimationFrame(updateScroll);"))fail('script forces whole-document layout on first paint');
if(!runtime.includes('currentHomepageLanguage')||!runtime.includes('html.lang===currentHomepageLanguage'))fail('server-rendered localized homepage is unnecessarily rebuilt on startup');
const persianLanding=fs.readFileSync(path.join(root,'fa/index.html'),'utf8');
if(!persianLanding.includes('aria-label="تغییر زبان به انگلیسی"><span class="selected">FA</span>')||!persianLanding.includes('aria-label="باز کردن منو"'))fail('Persian home navigation must be localized in initial HTML');
for(const img of ['service-ai.svg','service-seo.svg','service-3d.svg','service-web.svg'])if(!runtime.includes("return '/assets/"+img+"'"))fail('dynamic project fallback image must use root absolute URL: '+img);
if(!presentation.includes('.reveal{filter:none!important;transition-property:opacity,transform!important}'))fail('mobile reveal effect is not optimized');
for(const landing of ['index.html','fa/index.html']){
  const h=fs.readFileSync(path.join(root,landing),'utf8');
  // Confirm versioned asset URLs without freezing a historic query string.
  // Persian approved design revisions intentionally have their own CSS cache key.
  const prefix=landing==='fa/index.html'?'../':'./';
  if(!h.includes('href="'+prefix+'styles.css?v=')||!h.includes('src="'+prefix+'script.js?v=')){
    fail(landing+' must reference versioned shared CSS and JavaScript assets');
  }
  const stylesVersion=(h.match(/href="(?:\.\.\/|\.\/)styles\.css\?v=([^"]+)"/)||[])[1];
  const scriptVersion=(h.match(/src="(?:\.\.\/|\.\/)script\.js\?v=([^"]+)"/)||[])[1];
  if(!stylesVersion||!scriptVersion||!/^[\w.-]+$/.test(stylesVersion)||!/^[\w.-]+$/.test(scriptVersion)){
    fail(landing+' has a malformed static asset cache key');
  }
  if(!h.includes('fetchpriority="high"'))fail(landing+' is missing hero image priority');
  if(landing==='fa/index.html'&&!h.includes('rel="stylesheet" media="print" onload="this.media=\'all\'"'))fail('Persian homepage lacks nonblocking Google Fonts CSS');
  if(h.includes('class="hero-copy reveal"')||h.includes('class="glass-panels reveal"'))fail(landing+' delays first-screen content behind scroll reveal');
}
const heroBytes=fs.statSync(path.join(root,'assets/roznex-hero-reference.webp')).size;
if(heroBytes>260000)fail('hero image exceeds 260 KB budget');
else ok('hero image budget ('+Math.round(heroBytes/1024)+' KiB)');


/* Responsive hero is non-negotiable: mobile should not download the 1920px hero. */
for(const homepage of ['index.html','fa/index.html']){
  const page=fs.readFileSync(path.join(root,homepage),'utf8');
  const prefix=homepage==='fa/index.html'?'../':'./';
  if(!page.includes(prefix+'assets/roznex-hero-960.webp 960w')||
     !page.includes(prefix+'assets/roznex-hero-1280.webp 1280w')||
     !page.includes('imagesizes="100vw"')||
     !page.includes('sizes="100vw"'))fail(homepage+' missing responsive hero image and matching preload');
}
for(const [name,budget] of [['roznex-hero-960.webp',75000],['roznex-hero-1280.webp',100000]]){
  const size=fs.statSync(path.join(root,'assets',name)).size;
  if(size>budget)fail(name+' exceeds responsive hero image budget: '+size);
  else ok(name+' is '+Math.round(size/1024)+' KiB');
}


/* Portfolio image budget and responsive markup checks. */
for(const homePath of ['index.html','fa/index.html']){
  const markup=fs.readFileSync(path.join(root,homePath),'utf8');
  for(const stem of ['industrial','familyos','studymed']){
    const tags=[...markup.matchAll(/<img[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes('project-'+stem+'.webp"'));
    if(tags.length!==2||tags.some(tag=>!tag.includes(' srcset=')||!tag.includes('project-'+stem+'-480.webp 480w')||!tag.includes('loading="lazy"')))fail(homePath+' missing responsive project previews: '+stem);
  }
}
for(const stem of ['industrial','familyos','studymed']){
  for(const width of [480,768,960]){
    const filename='project-'+stem+'-'+width+'.webp';
    const bytes=fs.statSync(path.join(root,'assets',filename)).size;
    if(bytes>100000)fail(filename+' is too large for preview');
    else ok(filename+' '+Math.round(bytes/1024)+' KiB');
  }
}


/* Editorial photos must stay small and be used as service illustrations, not client proof. */
const hub=fs.readFileSync(path.join(root,'services/fa/index.html'),'utf8');
for(const name of ['service-industrial-luxe.webp','service-web-luxe.webp']){
  const stat=fs.statSync(path.join(root,'assets',name));
  if(stat.size>220000)fail(name+' exceeds premium service image budget');
  if(!hub.includes('src="/assets/'+name+'"'))fail('Service hub does not use approved licensed image '+name);
}
for(const service of ['services/fa/web-design/index.html','services/fa/industrial-web-design/index.html']){
  const page=fs.readFileSync(path.join(root,service),'utf8');
  if(!page.includes('تصویر آرشیوی / Unsplash'))fail(service+' must disclose illustrative third-party photo');
}


/* Visual identity: reserve the hero robot image for the actual homepage hero only. */
for(const page of ["services/index.html","services/fa/index.html","services/fa/3d-web/index.html","services/en/3d-web/index.html","services/fa/ai-agents/index.html","services/en/ai-agents/index.html","services/fa/technical-seo/index.html","services/en/technical-seo/index.html","insights/fa/index.html","insights/index.html","insights/fa/3d-web-performance/index.html","insights/en/3d-web-performance/index.html","insights/fa/ai-agent-security/index.html","insights/en/ai-agent-security/index.html","insights/fa/ai-agent-business/index.html","insights/en/ai-agents-for-business/index.html","insights/fa/multilingual-seo-hreflang/index.html","insights/en/multilingual-seo-hreflang/index.html","insights/fa/technical-seo-nextjs/index.html","insights/en/technical-seo-nextjs/index.html"]){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  if(/roznex-hero-(?:reference|960|1280)\.webp|roznex-robot-poster(?:-hd|-fullhd)?\.webp/i.test(html))
    fail(page+' reuses the flagship hero robot image outside the hero');
}
for(const home of ['index.html','fa/index.html','en/index.html']){
  const html=fs.readFileSync(path.join(root,home),'utf8');
  const tile=html.split('class="project-tile reveal project-tile-roznex"')[1]?.split('</article>')[0]||'';
  if(!tile.includes('roznex-studio-editorial.svg')||tile.includes('roznex-hero-reference.webp'))
    fail(home+' studio project card must not repeat the hero image');
  if(!html.includes('roznex-hero-reference.webp" srcset='))
    fail(home+' flagship hero image must be preserved');
}
if(!fs.existsSync(path.join(root,'assets/roznex-studio-editorial.svg')))
  fail('Distinct studio identity graphic is missing');


/* Each article type gets its own editorial illustration, not repeated hero/robot or service catalog image. */
for(const [stem,asset] of [
 ['3d-web-performance','article-3d-architecture.svg'],
 ['ai-agent-security','article-ai-security.svg'],
 ['multilingual-seo-hreflang','article-multilingual.svg'],
 ['technical-seo-nextjs','article-seo-performance.svg']
]){
 for(const locale of ['fa','en']){
  const filename='insights/'+locale+'/'+stem+'/index.html';
  const html=fs.readFileSync(path.join(root,filename),'utf8');
  if(!html.includes('/assets/'+asset))fail(filename+' must use editorial topic artwork');
 }
}
for(const [filename,art] of [
 ['insights/fa/ai-agent-business/index.html','article-ai-workflow.svg'],
 ['insights/en/ai-agents-for-business/index.html','article-ai-workflow.svg']
]){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 if(!html.includes('/assets/'+art))fail(filename+' must use workflow illustration');
}
for(const name of [
 'article-ai-workflow.svg','article-ai-security.svg','article-seo-performance.svg',
 'article-multilingual.svg','article-3d-architecture.svg'
]){
 const full=path.join(root,'assets',name);
 const bytes=fs.statSync(full).size;
 if(bytes>20000)fail(name+' exceeds 20KB editorial asset budget');
 const svg=fs.readFileSync(full,'utf8');
 if(!svg.startsWith('<svg ')||!svg.includes('viewBox="0 0 1200 900"')||!svg.includes('</svg>'))
  fail(name+' is malformed');
}


/* A personal portrait belongs only to a genuine About section or About profile page. */
const permittedPortraitPages=new Set([
 'index.html','fa/index.html','en/index.html',
 'about/fa/rozhan-behrouzi/index.html','about/en/rozhan-behrouzi/index.html'
]);
for(const file of all.filter(p=>p.endsWith('.html'))){
 const relative=path.relative(root,file).replaceAll('\\','/');
 const html=fs.readFileSync(file,'utf8');
 const portraitImages=[...html.matchAll(/<img\b[^>]*\brozhan-about-original\.png[^>]*>/gi)];
 if(portraitImages.length && !permittedPortraitPages.has(relative))
   fail(relative+' reuses the founder portrait outside About');
 if(['index.html','fa/index.html','en/index.html'].includes(relative)){
   const about=html.split('<section class="about section"')[1]?.split('</section>')[0]||'';
   if(portraitImages.length!==1||!about.includes('rozhan-about-original.png'))
     fail(relative+' founder photo must appear once, inside About only');
   if(!about.includes('<figcaption class="about-visual-overlay">'))
     fail(relative+' founder photo caption must be outside the photo');
 }
 if(relative.startsWith('about/')&&relative.endsWith('/index.html')){
   if(!html.includes('class="visual founder-portrait"')||!html.includes('width="1254" height="1254"'))
     fail(relative+' About photo must preserve full square proportions');
 }
}
const portfolioGuide=fs.readFileSync(path.join(root,'insights/fa/personal-portfolio-website/index.html'),'utf8');
const portfolioIndex=fs.readFileSync(path.join(root,'insights/fa/index.html'),'utf8');
for(const [name,markup] of [['portfolio guide',portfolioGuide],['Persian insights hub',portfolioIndex]]){
 if(markup.includes('rozhan-about-original.png'))fail(name+' must not show the owner portrait');
 if(!markup.includes('/assets/article-personal-portfolio.svg'))fail(name+' is missing its separate editorial graphic');
}
const portfolioCover=fs.readFileSync(path.join(root,'assets/article-personal-portfolio.svg'),'utf8');
if(!portfolioCover.startsWith('<svg ')||!portfolioCover.includes('viewBox="0 0 1200 900"')||!portfolioCover.endsWith('</svg>'))
 fail('Portfolio editorial cover has invalid markup');

if(failures.length){
  console.error('\nROZNEX audit failed with '+failures.length+' issue(s).');
  process.exit(1);
}
console.log('\nROZNEX audit passed.');
