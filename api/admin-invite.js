const crypto = require('crypto');
const { isAdminRequest } = require('../lib/admin-session');

function json(res,status,value){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.end(JSON.stringify(value));
}

function clean(value,max=180){
  return String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
}

function sameOrigin(req){
  const site=String(req.headers['sec-fetch-site']||'').toLowerCase();
  if(site&&!['same-origin','same-site','none'].includes(site))return false;
  const origin=String(req.headers.origin||'');
  if(!origin)return true;
  try{
    const u=new URL(origin);
    const forwardedHost=String(req.headers['x-forwarded-host']||'').split(',')[0].trim();
    const host=forwardedHost||String(req.headers.host||'');
    return u.protocol==='https:'&&u.host===host;
  }catch{return false}
}

async function readBody(req){
  if(req.body&&typeof req.body==='object')return req.body;
  const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
  const raw=Buffer.concat(chunks).toString('utf8');
  return raw?JSON.parse(raw):{};
}

function signingSecret(){
  return String(process.env.ROZNEX_QUOTE_SIGNING_SECRET||'').trim();
}

function makeInvite(body){
  const secret=signingSecret();
  if(secret.length<32)throw new Error('signing_not_configured');
  const allowedTypes=new Set(['personal','corporate','ecommerce','industrial','landing','custom','webapp']);
  const days=Math.min(30,Math.max(1,Number(body.days)||7));
  const type=clean(body.type,40);
  if(!allowedTypes.has(type))throw new Error('bad_type');
  const payload={
    v:2,
    client:clean(body.client,120),
    company:clean(body.company,140),
    project:clean(body.project,180),
    type,
    email:clean(body.email,180),
    mobile:clean(body.mobile,60),
    iat:Date.now(),
    exp:Date.now()+days*86400000,
    nonce:crypto.randomUUID()
  };
  if(!payload.client||!payload.project)throw new Error('required_fields');
  const payload64=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature=crypto.createHmac('sha256',secret).update(payload64).digest('base64url');
  return payload64+'.'+signature;
}

const inviteHtml=String.raw`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive">
<title>ROZNEX — Quote Invitations</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Vazirmatn:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#ece5db;--paper:#f7f2eb;--ink:#11141b;--muted:#706960;--line:rgba(17,20,27,.15);--gold:#a77a45}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Vazirmatn,Manrope,sans-serif}.shell{max-width:980px;margin:auto;padding:0 clamp(1rem,3vw,2.4rem) 4rem}.top{height:5rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.logo{width:12rem}.top a{font-size:.68rem;color:inherit;text-decoration:none}.hero{padding:3rem 0 2rem;display:grid;grid-template-columns:1.2fr .8fr;gap:2rem;align-items:end}.eyebrow{font:600 .6rem Manrope;letter-spacing:.16em;color:#7e7469}.hero h1{font-size:clamp(2.5rem,6vw,5rem);line-height:1;margin:.55rem 0 0;font-weight:500;letter-spacing:-.05em}.hero p{font-size:.76rem;line-height:2;color:var(--muted);margin:0}.card{background:rgba(247,242,235,.94);border:1px solid var(--line);border-radius:1.4rem;padding:clamp(1rem,3vw,1.8rem)}h2{font-size:1rem;margin:0 0 1rem}.fields{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.field{display:flex;flex-direction:column;gap:.35rem}.full{grid-column:1/-1}.field span{font-size:.62rem;font-weight:600;color:#5f5952}input,select,textarea{width:100%;border:1px solid var(--line);background:#fffaf4;border-radius:.8rem;padding:.75rem .8rem;font:inherit;color:inherit;outline:none}input:focus,select:focus{border-color:var(--gold)}button{font:inherit;cursor:pointer}.primary{width:100%;margin-top:1rem;border:0;border-radius:999px;background:#17181a;color:#fff;padding:.82rem 1rem;font-weight:700}.status{font-size:.62rem;line-height:1.8;color:#776c61;margin-top:.65rem;min-height:1rem}.result{margin-top:1rem;padding:1rem;background:#17181a;color:#f7f2eb;border-radius:1rem}.result[hidden]{display:none}.result textarea{direction:ltr;text-align:left;margin-top:.65rem;min-height:7rem;background:#24262a;color:#fff;border-color:#3d3f44;font:500 .62rem Manrope;line-height:1.7}.copy{border:1px solid #56585c;background:transparent;color:#fff;border-radius:999px;padding:.55rem .8rem;font-size:.62rem}.note{margin-top:1rem;border:1px solid var(--line);border-radius:1rem;padding:1rem;background:#f1e6d7}.note strong{display:block;font-size:.72rem}.note p{font-size:.62rem;line-height:1.9;color:var(--muted);margin:.35rem 0 0}@media(max-width:800px){.hero,.fields{grid-template-columns:1fr}.full{grid-column:auto}}
</style>
</head>
<body><main class="shell">
<header class="top"><a href="/"><img class="logo" src="../../assets/roznex-logo.svg" alt="ROZNEX"></a><a href="/admin">داشبورد ←</a></header>
<section class="hero"><div><span class="eyebrow">ROZNEX / PRIVATE ADMIN TOOL</span><h1>دعوت‌نامه مشتری</h1></div><p>برای مشتری لینک اختصاصی و تاریخ‌دار SmartQuote بساز. امضا روی سرور انجام می‌شود و هیچ کلید خصوصی داخل مرورگر نگه‌داری نمی‌شود.</p></section>
<section class="card">
<h2>ساخت لینک اختصاصی SmartQuote</h2>
<div class="fields">
<label class="field"><span>نام مشتری *</span><input id="client" required></label>
<label class="field"><span>شرکت / برند</span><input id="company"></label>
<label class="field full"><span>عنوان پروژه *</span><input id="project" required></label>
<label class="field"><span>نوع پروژه *</span><select id="type"><option value="personal">سایت شخصی / رزومه</option><option value="corporate" selected>سایت شرکتی</option><option value="ecommerce">سایت فروشگاهی</option><option value="industrial">سایت صنعتی</option><option value="landing">لندینگ‌پیج</option><option value="custom">سایت اختصاصی / پریمیوم</option><option value="webapp">پلتفرم / پنل تحت وب</option></select></label>
<label class="field"><span>اعتبار لینک</span><select id="days"><option value="3">۳ روز</option><option value="7" selected>۷ روز</option><option value="14">۱۴ روز</option><option value="30">۳۰ روز</option></select></label>
<label class="field"><span>ایمیل</span><input id="email" type="email"></label><label class="field"><span>موبایل</span><input id="mobile"></label>
</div>
<button class="primary" id="generate">ساخت لینک تأییدشده</button>
<div class="status" id="status"></div>
<div class="result" id="result" hidden><strong>لینک اختصاصی مشتری</strong><textarea id="link" readonly></textarea><button class="copy" id="copy">کپی لینک</button></div>
<div class="note"><strong>امنیت</strong><p>کلید امضا فقط در Environment سرور قرار دارد. لینک مشتری تاریخ انقضا دارد و بدون امضای معتبر SmartQuote باز نمی‌شود.</p></div>
</section>
</main>
<script>
const $=id=>document.getElementById(id);
$('generate').onclick=async()=>{
  const button=$('generate');button.disabled=true;$('status').textContent='در حال ساخت لینک امن…';
  try{
    const response=await fetch('/admin/invite/',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',body:JSON.stringify({
      client:$('client').value.trim(),company:$('company').value.trim(),project:$('project').value.trim(),
      type:$('type').value,days:Number($('days').value),email:$('email').value.trim(),mobile:$('mobile').value.trim()
    })});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'ساخت لینک انجام نشد.');
    $('link').value=data.url;$('result').hidden=false;$('status').textContent='دعوت‌نامه ساخته شد. این لینک را فقط برای همین مشتری ارسال کن.';
  }catch(error){$('status').textContent=error.message||'ساخت لینک انجام نشد.'}
  finally{button.disabled=false}
};
$('copy').onclick=async()=>{await navigator.clipboard.writeText($('link').value);$('copy').textContent='کپی شد';setTimeout(()=>$('copy').textContent='کپی لینک',1200)};
</script></body></html>`;

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');

  if(!(await isAdminRequest(req))){
    if(req.method==='POST')return json(res,401,{error:'unauthorized'});
    res.statusCode=302;res.setHeader('Location','/admin');return res.end();
  }

  if(req.method==='GET'){
    res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(inviteHtml);
  }

  if(req.method==='POST'){
    if(!sameOrigin(req))return json(res,403,{error:'bad_origin'});
    try{
      const body=await readBody(req);
      const token=makeInvite(body);
      const origin='https://'+String(req.headers['x-forwarded-host']||req.headers.host||'roznex-portfolio.vercel.app').split(',')[0].trim();
      return json(res,200,{ok:true,url:origin+'/quote/?invite='+encodeURIComponent(token)});
    }catch(error){
      const code=String(error?.message||'server_error');
      const status=code==='required_fields'||code==='bad_type'?400:503;
      return json(res,status,{error:code});
    }
  }

  res.statusCode=405;return res.end('Method not allowed');
};
