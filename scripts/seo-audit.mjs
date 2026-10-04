import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const origin='https://roznex-portfolio.vercel.app';
const failures=[];
const warnings=[];
const fail=m=>{failures.push(m);console.error('✗',m)};
const warn=m=>{warnings.push(m);console.warn('!',m)};

function localFileForUrl(url){
  const u=new URL(url);
  if(u.origin!==origin)return null;
  const pathname=decodeURIComponent(u.pathname);
  if(pathname==='/')return path.join(root,'index.html');
  if(pathname.endsWith('/'))return path.join(root,pathname.slice(1),'index.html');
  return path.join(root,pathname.slice(1));
}

function meta(html,name){
  const tags=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  for(const tag of tags){
    const n=(tag.match(/\bname=["']([^"']+)["']/i)||[])[1]||'';
    if(n.toLowerCase()!==name.toLowerCase())continue;
    return (tag.match(/\bcontent=["']([^"']*)["']/i)||[])[1]||'';
  }
  return '';
}

function canonical(html){
  for(const m of html.matchAll(/<link\b[^>]*>/gi)){
    const tag=m[0];
    const rel=(tag.match(/\brel=["']([^"']+)["']/i)||[])[1]||'';
    if(rel.toLowerCase()!=='canonical')continue;
    return (tag.match(/\bhref=["']([^"']+)["']/i)||[])[1]||'';
  }
  return '';
}

function internalTargets(html){
  const out=[];
  for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){
    const href=m[1];
    if(/^(mailto:|tel:|javascript:|data:)/i.test(href))continue;
    if(/^https?:\/\//i.test(href)){
      if(href.startsWith(origin))out.push(new URL(href).pathname);
      continue;
    }
    if(href.startsWith('/'))out.push(href.split('?')[0]);
  }
  return out;
}

const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(new Set(urls).size!==urls.length)fail('sitemap contains duplicate URLs');
for(const forbidden of ['/admin','/quote','/api/','/start/']){
  if(urls.some(u=>new URL(u).pathname.startsWith(forbidden)))fail('private/noindex route present in sitemap: '+forbidden);
}

const titles=new Map();
const pages=[];
for(const url of urls){
  const file=localFileForUrl(url);
  if(!file||!fs.existsSync(file)){fail('sitemap URL has no local page: '+url);continue}
  if(!file.endsWith('.html'))continue;
  const html=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file);
  pages.push({url,file,rel,html});
  const title=((html.match(/<title>([^<]+)<\/title>/i)||[])[1]||'').trim();
  if(!title)fail(rel+' missing title');
  else { const key=title.toLowerCase(); if(titles.has(key))warn('duplicate title: '+title); else titles.set(key,rel); }
  const description=meta(html,'description');
  if(!description)fail(rel+' missing meta description');
  const can=canonical(html);
  if(!can)fail(rel+' missing canonical');
  else if(can!==url)fail(rel+' canonical mismatch: '+can+' != '+url);
  if(meta(html,'robots').toLowerCase().includes('noindex'))fail(rel+' is in sitemap but noindex');
  const h1s=[...html.matchAll(/<h1\b/gi)].length;
  if(h1s!==1)fail(rel+' should have exactly one h1, found '+h1s);
  const htmlTag=(html.match(/<html\b[^>]*>/i)||[])[0]||'';
  if(!/\blang=["'][^"']+["']/i.test(htmlTag))fail(rel+' missing html lang');
  for(const m of html.matchAll(/<img\b[^>]*>/gi)){ if(!/\balt=["'][^"']*["']/i.test(m[0]))fail(rel+' image missing alt attribute'); }
  for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{JSON.parse(m[1]);}catch(e){fail(rel+' invalid JSON-LD: '+e.message)}
  }
}

const allowedDynamic=['/start/','/admin','/admin/','/quote/','/quote'];
for(const page of pages){
  for(const target of internalTargets(page.html)){
    if(allowedDynamic.includes(target)||target.startsWith('/api/'))continue;
    if(target==='/')continue;
    const file=localFileForUrl(origin+target);
    if(!file||!fs.existsSync(file))fail(page.rel+' links to missing internal target '+target);
  }
}

const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
if(!robots.includes('Sitemap: '+origin+'/sitemap.xml'))fail('robots.txt missing canonical sitemap URL');
for(const rule of ['Disallow: /admin','Disallow: /quote/','Disallow: /api/'])if(!robots.includes(rule))fail('robots.txt missing '+rule);

for(const page of pages.filter(p=>p.rel.startsWith('insights/')&&p.rel!=='insights/index.html')){
  if(!page.html.includes('BlogPosting'))fail(page.rel+' missing BlogPosting schema');
  const lang=page.rel.includes('/fa/')?'fa':'en';
  if(!page.html.includes('/about/'+lang+'/rozhan-behrouzi/'))fail(page.rel+' missing dedicated author link');
}

console.log('\nSEO crawl checked '+pages.length+' public HTML pages.');
if(warnings.length)console.log('SEO crawl warnings: '+warnings.length);
if(failures.length){console.error('SEO crawl failed with '+failures.length+' issue(s).');process.exit(1)}
console.log('SEO crawl passed.');
