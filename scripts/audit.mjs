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
  '.well-known/security.txt'
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

const admin=fs.readFileSync(path.join(root,'api/admin.js'),'utf8');
if(/ROZNEX_ADMIN_PASSWORD_HASH\s*\|\|\s*['"][a-f0-9]{64}/i.test(admin))fail('hard-coded admin password hash fallback detected');
else ok('no hard-coded admin password hash fallback');

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

if(failures.length){
  console.error('\nROZNEX audit failed with '+failures.length+' issue(s).');
  process.exit(1);
}
console.log('\nROZNEX audit passed.');
