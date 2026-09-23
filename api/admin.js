const crypto = require('crypto');

const ADMIN_PASSWORD_HASH = 'f7a15aa99a87a340d9d10a881e1033b45f93fdf8056c52a36b29da5caf934c3a';

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return new URLSearchParams(req.body).toString();
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method === 'POST') {
    const body = await readBody(req);
    const password = new URLSearchParams(body).get('password') || '';
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (safeEqual(passwordHash, ADMIN_PASSWORD_HASH)) return res.end(DASHBOARD_HTML);
    res.statusCode = 401;
    return res.end(loginHTML(true));
  }

  return res.end(loginHTML(false));
};

function loginHTML(hasError) {
  return String.raw`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>ورود به ROZNEX Control</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:1.25rem;background:#efe8df;color:#11141b;font-family:Vazirmatn,Manrope,sans-serif}.login{width:min(27rem,100%);background:rgba(255,251,246,.88);border:1px solid #d8cdbf;border-radius:28px;padding:2rem;box-shadow:0 30px 90px rgba(50,38,24,.14);position:relative;overflow:hidden}.login:before{content:"";position:absolute;width:15rem;height:15rem;border:1px solid rgba(184,139,85,.25);border-radius:50%;top:-8rem;left:-6rem;box-shadow:0 0 0 3rem rgba(184,139,85,.05)}.brand{font:700 1rem Manrope;letter-spacing:.2em;position:relative}.kicker{font:600 .65rem Manrope;letter-spacing:.15em;color:#9b7b55;margin-top:3.5rem}.login h1{font-size:2.2rem;letter-spacing:-.05em;margin:.7rem 0 .5rem}.login p{font-size:.8rem;color:#716a62;line-height:1.8;margin:0 0 1.4rem}label{display:block;font-size:.75rem;margin-bottom:.45rem}input{width:100%;border:1px solid #d8cdbf;background:white;border-radius:13px;padding:.85rem 1rem;font:500 1rem Manrope;outline:none;direction:ltr}input:focus{border-color:#b88b55;box-shadow:0 0 0 3px rgba(184,139,85,.12)}button{width:100%;border:0;border-radius:13px;padding:.9rem;margin-top:.8rem;background:#11141b;color:white;font:600 .9rem Vazirmatn;cursor:pointer}.error{background:#f9e3df;color:#923d35;padding:.7rem .8rem;border-radius:11px;font-size:.74rem;margin-bottom:1rem}.back{display:block;text-align:center;color:#746d65;text-decoration:none;font-size:.72rem;margin-top:1.2rem}</style></head><body><main class="login"><div class="brand">ROZNEX</div><div class="kicker">PRIVATE CONTROL DESK</div><h1>ورود به مدیریت</h1><p>برای ورود به داشبورد خصوصی، فقط رمز مدیریت را وارد کن.</p>${hasError?'<div class="error">رمز واردشده درست نیست. دوباره تلاش کن.</div>':''}<form method="post" action="/admin" autocomplete="off"><label for="password">رمز مدیریت</label><input id="password" name="password" type="password" required autofocus autocomplete="current-password"><button type="submit">ورود به داشبورد</button></form><a class="back" href="/">بازگشت به سایت</a></main></body></html>`;
}

const DASHBOARD_HTML = String.raw`<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>ROZNEX Control — مدیریت سایت</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--ink:#10131a;--muted:#77716a;--paper:#f3ede5;--panel:#fffaf4;--line:#ded4c8;--gold:#b88b55;--green:#2e7455;--amber:#a86616;--red:#a0443d;--shadow:0 24px 70px rgba(50,38,24,.1)}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Vazirmatn,Manrope,sans-serif;min-height:100vh}button,input,textarea,select{font:inherit}.shell{display:grid;grid-template-columns:17rem 1fr;min-height:100vh}.sidebar{background:#11141b;color:#fff;padding:1.6rem;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}.brand{font-family:Manrope,sans-serif;font-weight:700;letter-spacing:.18em;font-size:1.1rem}.brand small{display:block;color:#9d968d;font-size:.58rem;letter-spacing:.14em;margin-top:.45rem}.nav{display:grid;gap:.45rem;margin-top:3.5rem}.nav button{border:0;background:transparent;color:#aaaeb6;text-align:right;padding:.85rem 1rem;border-radius:12px;cursor:pointer;display:flex;gap:.75rem;align-items:center}.nav button.active,.nav button:hover{background:#252932;color:#fff}.nav i{font-style:normal;width:1.5rem;text-align:center}.side-foot{margin-top:auto;border-top:1px solid #2b2f37;padding-top:1.2rem}.side-foot a{color:#fff;text-decoration:none;font-size:.8rem}.side-foot p{color:#878c95;font-size:.68rem;line-height:1.7;margin:.7rem 0 0}.main{padding:clamp(1.2rem,3vw,3rem)}.top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:2.5rem}.top h1{font-size:clamp(1.8rem,3vw,3.2rem);letter-spacing:-.045em;margin:0}.top p{color:var(--muted);margin:.4rem 0 0;font-size:.84rem}.owner{display:flex;align-items:center;gap:.7rem;background:rgba(255,255,255,.55);border:1px solid var(--line);padding:.55rem .75rem;border-radius:999px;font-size:.75rem}.avatar{width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;background:#11141b;color:#fff;font:600 .72rem Manrope}.view{display:none}.view.active{display:block}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1rem}.stat,.card{background:rgba(255,250,244,.82);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow)}.stat{padding:1.2rem}.stat span{font-size:.7rem;color:var(--muted)}.stat strong{display:block;font:600 2rem Manrope;margin-top:.6rem}.card{padding:clamp(1.2rem,2.2vw,2rem)}.toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}.toolbar h2{margin:0;font-size:1.25rem}.actions{display:flex;gap:.6rem;flex-wrap:wrap}.btn{border:1px solid var(--line);background:#fffaf4;color:var(--ink);padding:.7rem 1rem;border-radius:12px;cursor:pointer}.btn.primary{background:#11141b;color:white;border-color:#11141b}.btn.danger{color:var(--red)}.empty{min-height:22rem;display:grid;place-items:center;text-align:center;border:1px dashed #cabdad;border-radius:16px;padding:2rem}.empty .icon{width:4.5rem;height:4.5rem;border-radius:50%;background:#ece1d4;display:grid;place-items:center;margin:0 auto 1rem;font-size:1.5rem}.empty h3{margin:0 0 .5rem}.empty p{max-width:27rem;color:var(--muted);font-size:.8rem;line-height:1.8;margin:0 auto 1.4rem}.project-list{display:grid;gap:.7rem}.project-row{display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;border:1px solid var(--line);border-radius:15px;padding:1rem;background:#fff}.project-row h3{margin:0 0 .25rem;font-size:1rem}.project-row p{margin:0;color:var(--muted);font-size:.72rem}.badge{display:inline-flex;padding:.3rem .6rem;border-radius:999px;font-size:.65rem;margin-right:.5rem}.badge.draft{background:#eee7df;color:#665f58}.badge.review{background:#fff0d5;color:var(--amber)}.badge.approved{background:#dff2e8;color:var(--green)}.row-actions{display:flex;gap:.4rem}.row-actions button{border:0;background:#eee7df;border-radius:9px;padding:.5rem .65rem;cursor:pointer}.note{background:#fffaf4;border:1px solid var(--line);border-radius:18px;padding:1.2rem;margin-bottom:1rem}.note h3{margin:0 0 .4rem;font-size:1rem}.note p{margin:0;color:var(--muted);font-size:.78rem;line-height:1.8}.section-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}.section-card{background:#fffaf4;border:1px solid var(--line);border-radius:18px;padding:1.25rem}.section-card header{display:flex;justify-content:space-between;gap:1rem}.section-card h3{margin:0;font-size:1rem}.section-card p{color:var(--muted);font-size:.75rem;line-height:1.8;margin:.75rem 0 0}.status{font-size:.64rem;color:var(--green);white-space:nowrap}.modal{position:fixed;inset:0;background:rgba(7,9,13,.55);display:none;place-items:center;padding:1rem;z-index:10}.modal.open{display:grid}.dialog{width:min(43rem,100%);max-height:90vh;overflow:auto;background:var(--panel);border-radius:24px;padding:clamp(1.25rem,3vw,2.2rem);box-shadow:0 30px 90px rgba(0,0,0,.3)}.dialog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.4rem}.dialog h2{margin:0}.close{border:0;background:#e9dfd4;width:2.3rem;height:2.3rem;border-radius:50%;cursor:pointer}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.field{display:grid;gap:.4rem}.field.full{grid-column:1/-1}.field label{font-size:.72rem;color:#5f5952}.field input,.field textarea,.field select{width:100%;border:1px solid var(--line);background:#fff;padding:.75rem;border-radius:11px;outline:none}.field textarea{min-height:7rem;resize:vertical}.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--gold)}.dialog-actions{display:flex;justify-content:flex-start;gap:.6rem;margin-top:1.4rem}.toast{position:fixed;left:1.2rem;bottom:1.2rem;background:#11141b;color:#fff;padding:.8rem 1rem;border-radius:12px;font-size:.75rem;opacity:0;transform:translateY(10px);transition:.25s;pointer-events:none}.toast.show{opacity:1;transform:none}.hidden{display:none!important}
    @media(max-width:900px){.shell{grid-template-columns:1fr}.sidebar{position:static;height:auto;padding:1rem}.brand small,.side-foot{display:none}.nav{display:flex;overflow:auto;margin-top:1rem}.nav button{white-space:nowrap}.stats{grid-template-columns:1fr 1fr}.main{padding-bottom:5rem}}
    @media(max-width:560px){.top{align-items:flex-start}.owner{display:none}.stats,.section-grid,.form-grid{grid-template-columns:1fr}.toolbar{align-items:flex-start;flex-direction:column}.project-row{grid-template-columns:1fr}.row-actions{justify-content:flex-start}}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">ROZNEX<small>PRIVATE CONTROL DESK</small></div>
      <nav class="nav" aria-label="مدیریت">
        <button class="active" data-view="overview"><i>⌂</i> نمای کلی</button>
        <button data-view="projects"><i>◇</i> پروژه‌ها</button>
        <button data-view="sections"><i>▦</i> بخش‌های سایت</button>
      </nav>
      <div class="side-foot"><a href="/" target="_blank">مشاهده سایت ↗</a><p>این پنل خصوصی برای بررسی و آماده‌سازی محتوای سایت ROZNEX است.</p></div>
    </aside>
    <main class="main">
      <header class="top"><div><h1 id="page-title">داشبورد مدیریت</h1><p id="page-subtitle">پروژه را ثبت کن، بررسی کن و با وضعیت «تأییدشده» روی سایت نمایش بده.</p></div><div class="owner"><span class="avatar">RB</span><span>روژان بهروزی</span></div></header>

      <section class="view active" id="overview">
        <div class="stats">
          <div class="stat"><span>همه پروژه‌ها</span><strong id="stat-all">۰</strong></div>
          <div class="stat"><span>پیش‌نویس</span><strong id="stat-draft">۰</strong></div>
          <div class="stat"><span>در حال بررسی</span><strong id="stat-review">۰</strong></div>
          <div class="stat"><span>تأییدشده</span><strong id="stat-approved">۰</strong></div>
        </div>
        <div class="note"><h3>نمونه‌کارهای نمایشی حذف شدند</h3><p>فقط پروژه‌هایی که وضعیتشان «تأییدشده» باشد در بخش نمونه‌کارهای صفحه اصلی نمایش داده می‌شوند. بعد از تأیید، صفحه اصلی را Refresh کن.</p></div>
        <div class="card"><div class="toolbar"><h2>آخرین پروژه‌ها</h2><button class="btn primary" data-add>+ پروژه جدید</button></div><div id="recent-projects"></div></div>
      </section>

      <section class="view" id="projects">
        <div class="card"><div class="toolbar"><h2>مدیریت پروژه‌ها</h2><div class="actions"><button class="btn" id="export-projects">خروجی پشتیبان</button><button class="btn" id="import-projects">ورود پشتیبان</button><input class="hidden" type="file" id="import-file" accept="application/json"><button class="btn primary" data-add>+ پروژه جدید</button></div></div><div id="all-projects"></div></div>
      </section>

      <section class="view" id="sections">
        <div class="note"><h3>وضعیت بخش‌های سایت</h3><p>ساختار اصلی سایت فعال است و بخش نمونه‌کارها تا زمان تأیید اولین پروژه در حالت «در حال بررسی» نمایش داده می‌شود.</p></div>
        <div class="section-grid">
          <article class="section-card"><header><h3>Hero</h3><span class="status">فعال</span></header><p>تصویر ربات ثابت، عنوان اصلی و دکمه‌های شروع همکاری.</p></article>
          <article class="section-card"><header><h3>خدمات</h3><span class="status">فعال</span></header><p>هوش مصنوعی، طراحی وب، تجربه سه‌بعدی و سئوی مهندسی‌شده.</p></article>
          <article class="section-card"><header><h3>نمونه‌کارها</h3><span class="status" style="color:var(--amber)">در انتظار پروژه</span></header><p>پروژه‌های آزمایشی حذف شده‌اند و فقط پروژه‌های تأییدشده منتشر خواهند شد.</p></article>
          <article class="section-card"><header><h3>درباره و تماس</h3><span class="status">فعال</span></header><p>معرفی روژان بهروزی، ارزش‌های ROZNEX و فرم شروع پروژه.</p></article>
          <article class="section-card"><header><h3>SmartQuote</h3><span class="status">فعال</span></header><p>صدور پیش‌فاکتور حرفه‌ای با تاریخ شمسی و مدل‌های پرداخت.</p></article>
          <article class="section-card"><header><h3>SEO پایه</h3><span class="status">فعال</span></header><p>متادیتا، داده ساختاریافته، سایت‌مپ و فایل راهنمای موتورهای جست‌وجو.</p></article>
        </div>
      </section>
    </main>
  </div>

  <div class="modal" id="project-modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <form class="dialog" id="project-form">
      <div class="dialog-head"><h2 id="dialog-title">پروژه جدید</h2><button class="close" type="button" data-close aria-label="بستن">×</button></div>
      <input type="hidden" name="id">
      <div class="form-grid">
        <div class="field"><label for="title">نام پروژه</label><input id="title" name="title" required placeholder="مثلاً وب‌سایت صنعتی"></div>
        <div class="field"><label for="client">نام مشتری / برند</label><input id="client" name="client" placeholder="نام برند"></div>
        <div class="field"><label for="category">دسته‌بندی</label><select id="category" name="category"><option>طراحی وب</option><option>هوش مصنوعی</option><option>سه‌بعدی</option><option>سئو</option><option>محصول دیجیتال</option></select></div>
        <div class="field"><label for="status">وضعیت بررسی</label><select id="status" name="status"><option value="draft">پیش‌نویس</option><option value="review">در حال بررسی</option><option value="approved">تأییدشده</option></select></div>
        <div class="field full"><label for="summary">خلاصه پروژه</label><textarea id="summary" name="summary" placeholder="هدف، مسئله و نتیجه پروژه را بنویس..."></textarea></div>
        <div class="field"><label for="url">لینک پروژه</label><input id="url" name="url" type="url" placeholder="https://"></div>
        <div class="field"><label for="date">تاریخ پروژه</label><input id="date" name="date" placeholder="مثلاً شهریور ۱۴۰۵"></div>
        <div class="field full"><label for="notes">یادداشت خصوصی بررسی</label><textarea id="notes" name="notes" placeholder="چه چیزهایی باید قبل از انتشار اصلاح شوند؟"></textarea></div>
      </div>
      <div class="dialog-actions"><button class="btn primary" type="submit">ذخیره پروژه</button><button class="btn" type="button" data-close>انصراف</button></div>
    </form>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    const STORAGE_KEY='roznex_admin_projects_v1';
    const labels={draft:'پیش‌نویس',review:'در حال بررسی',approved:'تأییدشده'};
    let projects=readProjects();
    const modal=document.getElementById('project-modal');
    const form=document.getElementById('project-form');
    const toast=document.getElementById('toast');
    function readProjects(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}}
    function saveProjects(){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));render();showToast('تغییرات ذخیره شد')}
    function fa(n){return new Intl.NumberFormat('fa-IR').format(n)}
    function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
    function listHTML(items){if(!items.length)return '<div class="empty"><div><div class="icon">◇</div><h3>هنوز پروژه‌ای ثبت نشده</h3><p>اولین پروژه را اضافه کن، جزئیاتش را بررسی کن و فقط وقتی کامل شد آن را تأیید کن.</p><button class="btn primary" data-add>ثبت اولین پروژه</button></div></div>';return '<div class="project-list">'+items.map(p=>'<article class="project-row"><div><h3>'+escapeHTML(p.title)+' <span class="badge '+p.status+'">'+labels[p.status]+'</span></h3><p>'+escapeHTML([p.client,p.category,p.date].filter(Boolean).join(' · ')||'بدون جزئیات تکمیلی')+'</p></div><div class="row-actions"><button data-edit="'+p.id+'">ویرایش</button><button data-delete="'+p.id+'">حذف</button></div></article>').join('')+'</div>'}
    function render(){document.getElementById('stat-all').textContent=fa(projects.length);['draft','review','approved'].forEach(s=>document.getElementById('stat-'+s).textContent=fa(projects.filter(p=>p.status===s).length));document.getElementById('recent-projects').innerHTML=listHTML(projects.slice(0,4));document.getElementById('all-projects').innerHTML=listHTML(projects)}
    function openForm(id){form.reset();form.elements.id.value='';document.getElementById('dialog-title').textContent='پروژه جدید';if(id){const p=projects.find(item=>item.id===id);if(!p)return;Object.entries(p).forEach(([key,value])=>{if(form.elements[key])form.elements[key].value=value});document.getElementById('dialog-title').textContent='ویرایش پروژه'}modal.classList.add('open');setTimeout(()=>form.elements.title.focus(),50)}
    function closeForm(){modal.classList.remove('open')}
    function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}
    document.addEventListener('click',e=>{const add=e.target.closest('[data-add]');const edit=e.target.closest('[data-edit]');const del=e.target.closest('[data-delete]');const publish=e.target.closest('[data-publish]');if(add)openForm();if(edit)openForm(edit.dataset.edit);if(publish){const p=projects.find(item=>item.id===publish.dataset.publish);if(p){p.status='approved';p.updatedAt=new Date().toISOString();saveProjects();showToast('پروژه برای نمایش در سایت تأیید شد')}}if(del&&confirm('این پروژه حذف شود؟')){projects=projects.filter(p=>p.id!==del.dataset.delete);saveProjects()}if(e.target.closest('[data-close]'))closeForm()});
    modal.addEventListener('click',e=>{if(e.target===modal)closeForm()});
    form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));const project={...data,id:data.id||crypto.randomUUID(),updatedAt:new Date().toISOString()};const index=projects.findIndex(p=>p.id===project.id);if(index>=0)projects[index]=project;else projects.unshift(project);saveProjects();closeForm()});
    document.querySelectorAll('.nav button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.nav button,.view').forEach(el=>el.classList.remove('active'));button.classList.add('active');document.getElementById(button.dataset.view).classList.add('active');const copy={overview:['داشبورد مدیریت','همه چیز برای بررسی منظم پروژه‌ها، قبل از انتشار.'],projects:['مدیریت پروژه‌ها','ثبت، ویرایش و تأیید نمونه‌کارهای واقعی.'],sections:['بخش‌های سایت','وضعیت محتوای اصلی ROZNEX.']}[button.dataset.view];document.getElementById('page-title').textContent=copy[0];document.getElementById('page-subtitle').textContent=copy[1]}));
    document.getElementById('export-projects').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),projects},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='roznex-projects-backup.json';a.click();URL.revokeObjectURL(a.href);showToast('فایل پشتیبان آماده شد')});
    document.getElementById('import-projects').addEventListener('click',()=>document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.projects))throw new Error();projects=data.projects;saveProjects()}catch{alert('فایل پشتیبان معتبر نیست')}e.target.value=''});
    addEventListener('keydown',e=>{if(e.key==='Escape')closeForm()});render();
  </script>
</body>
</html>`;
