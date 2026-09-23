const crypto = require('crypto');

const ADMIN_PASSWORD_HASH = process.env.ROZNEX_ADMIN_PASSWORD_HASH || 'f7a15aa99a87a340d9d10a881e1033b45f93fdf8056c52a36b29da5caf934c3a';
const SESSION_COOKIE = 'roznex_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getSessionSecret() {
  const source = process.env.ROZNEX_ADMIN_SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || '';
  if (!source) return '';
  return crypto.createHash('sha256').update('roznex-admin-session:v1:' + source).digest();
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(Boolean).map(v => {
      const i = v.indexOf('=');
      return i < 0 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
    })
  );
}

function createSessionToken() {
  const secret = getSessionSecret();
  if (!secret) return '';
  const exp = Date.now() + SESSION_TTL_MS;
  const expText = String(exp);
  const sig = crypto.createHmac('sha256', secret).update(expText).digest('base64url');
  return expText + '.' + sig;
}

function hasValidSession(req) {
  const secret = getSessionSecret();
  if (!secret) return false;
  const token = parseCookies(req)[SESSION_COOKIE] || '';
  const [expText, sig] = token.split('.');
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp < Date.now() || exp > Date.now() + SESSION_TTL_MS + 60_000) return false;
  const expected = crypto.createHmac('sha256', secret).update(expText).digest('base64url');
  return safeEqual(sig, expected);
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method === 'POST') {
    const body = await readBody(req);
    const password = new URLSearchParams(body).get('password') || '';
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (safeEqual(passwordHash, ADMIN_PASSWORD_HASH)) {
      const token = createSessionToken();
      if (token) {
        res.setHeader('Set-Cookie', SESSION_COOKIE + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200');
      }
      return res.end(DASHBOARD_HTML);
    }
    res.statusCode = 401;
    return res.end(loginHTML(true));
  }

  if (req.method === 'GET' && hasValidSession(req)) return res.end(DASHBOARD_HTML);
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
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Vazirmatn,Manrope,sans-serif;min-height:100vh}button,input,textarea,select{font:inherit}.shell{display:grid;grid-template-columns:17rem 1fr;min-height:100vh}.sidebar{background:#11141b;color:#fff;padding:1.6rem;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}.brand{font-family:Manrope,sans-serif;font-weight:700;letter-spacing:.18em;font-size:1.1rem}.brand small{display:block;color:#9d968d;font-size:.58rem;letter-spacing:.14em;margin-top:.45rem}.nav{display:grid;gap:.45rem;margin-top:3.5rem}.nav button{border:0;background:transparent;color:#aaaeb6;text-align:right;padding:.85rem 1rem;border-radius:12px;cursor:pointer;display:flex;gap:.75rem;align-items:center}.nav button.active,.nav button:hover{background:#252932;color:#fff}.nav i{font-style:normal;width:1.5rem;text-align:center}.side-foot{margin-top:auto;border-top:1px solid #2b2f37;padding-top:1.2rem}.side-foot a{color:#fff;text-decoration:none;font-size:.8rem}.side-foot p{color:#878c95;font-size:.68rem;line-height:1.7;margin:.7rem 0 0}.main{padding:clamp(1.2rem,3vw,3rem)}.top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:2.5rem}.top h1{font-size:clamp(1.8rem,3vw,3.2rem);letter-spacing:-.045em;margin:0}.top p{color:var(--muted);margin:.4rem 0 0;font-size:.84rem}.owner{display:flex;align-items:center;gap:.7rem;background:rgba(255,255,255,.55);border:1px solid var(--line);padding:.55rem .75rem;border-radius:999px;font-size:.75rem}.avatar{width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;background:#11141b;color:#fff;font:600 .72rem Manrope}.view{display:none}.view.active{display:block}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1rem}.stat,.card{background:rgba(255,250,244,.82);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow)}.stat{padding:1.2rem}.stat span{font-size:.7rem;color:var(--muted)}.stat strong{display:block;font:600 2rem Manrope;margin-top:.6rem}.card{padding:clamp(1.2rem,2.2vw,2rem)}.toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}.toolbar h2{margin:0;font-size:1.25rem}.actions{display:flex;gap:.6rem;flex-wrap:wrap}.btn{border:1px solid var(--line);background:#fffaf4;color:var(--ink);padding:.7rem 1rem;border-radius:12px;cursor:pointer}.btn.primary{background:#11141b;color:white;border-color:#11141b}.btn.danger{color:var(--red)}.empty{min-height:22rem;display:grid;place-items:center;text-align:center;border:1px dashed #cabdad;border-radius:16px;padding:2rem}.empty .icon{width:4.5rem;height:4.5rem;border-radius:50%;background:#ece1d4;display:grid;place-items:center;margin:0 auto 1rem;font-size:1.5rem}.empty h3{margin:0 0 .5rem}.empty p{max-width:27rem;color:var(--muted);font-size:.8rem;line-height:1.8;margin:0 auto 1.4rem}.project-list{display:grid;gap:.7rem}.project-row{display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;border:1px solid var(--line);border-radius:15px;padding:1rem;background:#fff}.project-row h3{margin:0 0 .25rem;font-size:1rem}.project-row p{margin:0;color:var(--muted);font-size:.72rem}.badge{display:inline-flex;padding:.3rem .6rem;border-radius:999px;font-size:.65rem;margin-right:.5rem}.badge.draft{background:#eee7df;color:#665f58}.badge.review{background:#fff0d5;color:var(--amber)}.badge.approved{background:#dff2e8;color:var(--green)}.row-actions{display:flex;gap:.4rem}.row-actions button{border:0;background:#eee7df;border-radius:9px;padding:.5rem .65rem;cursor:pointer}.note{background:#fffaf4;border:1px solid var(--line);border-radius:18px;padding:1.2rem;margin-bottom:1rem}.note h3{margin:0 0 .4rem;font-size:1rem}.note p{margin:0;color:var(--muted);font-size:.78rem;line-height:1.8}.section-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}.section-card{background:#fffaf4;border:1px solid var(--line);border-radius:18px;padding:1.25rem}.section-card header{display:flex;justify-content:space-between;gap:1rem}.section-card h3{margin:0;font-size:1rem}.section-card p{color:var(--muted);font-size:.75rem;line-height:1.8;margin:.75rem 0 0}.status{font-size:.64rem;color:var(--green);white-space:nowrap}.modal{position:fixed;inset:0;background:rgba(7,9,13,.55);display:none;place-items:center;padding:1rem;z-index:10}.modal.open{display:grid}.dialog{width:min(43rem,100%);max-height:90vh;overflow:auto;background:var(--panel);border-radius:24px;padding:clamp(1.25rem,3vw,2.2rem);box-shadow:0 30px 90px rgba(0,0,0,.3)}.dialog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.4rem}.dialog h2{margin:0}.close{border:0;background:#e9dfd4;width:2.3rem;height:2.3rem;border-radius:50%;cursor:pointer}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.field{display:grid;gap:.4rem}.field.full{grid-column:1/-1}.field label{font-size:.72rem;color:#5f5952}.field input,.field textarea,.field select{width:100%;border:1px solid var(--line);background:#fff;padding:.75rem;border-radius:11px;outline:none}.field textarea{min-height:7rem;resize:vertical}.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--gold)}.dialog-actions{display:flex;justify-content:flex-start;gap:.6rem;margin-top:1.4rem}.toast{position:fixed;left:1.2rem;bottom:1.2rem;background:#11141b;color:#fff;padding:.8rem 1rem;border-radius:12px;font-size:.75rem;opacity:0;transform:translateY(10px);transition:.25s;pointer-events:none}.toast.show{opacity:1;transform:none}.image-uploader{border:1px dashed #c8b7a3;border-radius:16px;padding:1rem;background:#fffdf9}.image-uploader-top{display:grid;grid-template-columns:9rem 1fr;gap:1rem;align-items:center}.image-preview{aspect-ratio:4/3;border-radius:13px;overflow:hidden;background:#eee5db;display:grid;place-items:center;color:#9b8d7d;border:1px solid var(--line)}.image-preview img{width:100%;height:100%;object-fit:cover;display:block}.image-preview span{font-size:1.6rem}.image-controls{display:grid;gap:.55rem}.image-controls input[type=file]{font-size:.72rem;padding:.65rem;background:#fff}.image-help{font-size:.65rem;color:var(--muted);line-height:1.8;margin:0}.upload-state{font-size:.64rem;color:var(--gold);min-height:1.2rem}.project-row-main{display:grid;grid-template-columns:4.6rem 1fr;gap:.85rem;align-items:center}.project-thumb{width:4.6rem;aspect-ratio:4/3;border-radius:10px;overflow:hidden;background:#eee7df;display:grid;place-items:center;border:1px solid var(--line);color:#9d9184}.project-thumb img{width:100%;height:100%;object-fit:cover;display:block}.storage-banner{display:none;margin-bottom:1rem;padding:.85rem 1rem;border:1px solid #e7c89d;border-radius:14px;background:#fff3df;color:#82541b;font-size:.72rem;line-height:1.8}.storage-banner.show{display:block}.btn[disabled]{opacity:.55;cursor:not-allowed}.hidden{display:none!important}
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
      <header class="top"><div><h1 id="page-title">داشبورد مدیریت</h1><p id="page-subtitle">پروژه را ثبت کن، بررسی کن و با وضعیت «تأییدشده» روی سایت نمایش بده.</p></div><div class="owner"><span class="avatar">RB</span><span>روژان بهروزی</span><b id="storage-indicator" style="font-size:.58rem;color:#a86616">MEDIA v2</b></div></header>
      <div class="storage-banner" id="storage-banner"></div>

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
        <div class="field full"><label for="image">تصویر اصلی پروژه <strong style="color:var(--gold)">— آپلود مستقیم</strong></label><div class="image-uploader"><div class="image-uploader-top"><div class="image-preview" id="image-preview"><span>◇</span></div><div class="image-controls"><input id="image" type="file" accept="image/jpeg,image/png,image/webp"><input id="imagePath" name="imagePath" type="hidden"><p class="image-help">JPG، PNG یا WebP. تصویر قبل از آپلود برای وب بهینه می‌شود و روی فضای ذخیره‌سازی سایت قرار می‌گیرد.</p><div class="upload-state" id="upload-state"></div><button class="btn" id="remove-image" type="button">حذف تصویر انتخاب‌شده</button></div></div></div></div>
        <div class="field full"><label for="notes">یادداشت خصوصی بررسی</label><textarea id="notes" name="notes" placeholder="چه چیزهایی باید قبل از انتشار اصلاح شوند؟"></textarea></div>
      </div>
      <div class="dialog-actions"><button class="btn primary" type="submit">ذخیره پروژه</button><button class="btn" type="button" data-close>انصراف</button></div>
    </form>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    const LEGACY_STORAGE_KEY='roznex_admin_projects_v1';
    const labels={draft:'پیش‌نویس',review:'در حال بررسی',approved:'تأییدشده'};
    let projects=[];
    let storageReady=false;
    let selectedImageFile=null;
    const modal=document.getElementById('project-modal');
    const form=document.getElementById('project-form');
    const toast=document.getElementById('toast');
    const imageInput=document.getElementById('image');
    const imagePathInput=document.getElementById('imagePath');
    const imagePreview=document.getElementById('image-preview');
    const uploadState=document.getElementById('upload-state');
    const storageBanner=document.getElementById('storage-banner');
    const storageIndicator=document.getElementById('storage-indicator');

    function fa(n){return new Intl.NumberFormat('fa-IR').format(n)}
    function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]})}
    function safeImage(value=''){try{const u=new URL(String(value),location.origin);if(u.origin===location.origin)return u.pathname+u.search;return u.protocol==='https:'?u.href:''}catch{return ''}}
    function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(function(){toast.classList.remove('show')},1900)}
    function showStorageMessage(message){storageBanner.textContent=message||'';storageBanner.classList.toggle('show',!!message)}
    function setPreview(url){
      const safe=safeImage(url);
      imagePreview.innerHTML=safe?'<img src="'+escapeHTML(safe)+'" alt="پیش‌نمایش تصویر پروژه">':'<span>◇</span>';
    }

    async function requestJSON(url,options){
      const response=await fetch(url,Object.assign({credentials:'same-origin'},options||{}));
      let data={};try{data=await response.json()}catch{}
      if(response.status===401){showStorageMessage('نشست مدیریت منقضی شده است. صفحه را تازه کن و دوباره وارد شو.');throw new Error('نشست مدیریت منقضی شده است.')}
      if(response.status===503&&data.error==='storage_not_configured'){showStorageMessage('برای فعال‌شدن ذخیره‌سازی دائمی تصاویر و پروژه‌ها، باید یک Vercel Blob Store به پروژه وصل شود. رابط کاربری آماده است و بعد از اتصال بدون تغییر کد فعال می‌شود.');throw new Error('فضای ذخیره‌سازی هنوز متصل نشده است.')}
      if(!response.ok)throw new Error(data.error||'درخواست انجام نشد.');
      return data;
    }

    async function api(action,payload){
      return requestJSON('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    }

    function listHTML(items){
      if(!items.length)return '<div class="empty"><div><div class="icon">◇</div><h3>هنوز پروژه‌ای ثبت نشده</h3><p>اولین پروژه را اضافه کن، تصویرش را بارگذاری کن و فقط وقتی کامل شد آن را تأیید کن.</p><button class="btn primary" data-add>ثبت اولین پروژه</button></div></div>';
      return '<div class="project-list">'+items.map(function(p){
        const image=safeImage(p.imageUrl);
        const thumb=image?'<img src="'+escapeHTML(image)+'" alt="">':'◇';
        return '<article class="project-row"><div class="project-row-main"><div class="project-thumb">'+thumb+'</div><div><h3>'+escapeHTML(p.title)+' <span class="badge '+escapeHTML(p.status)+'">'+(labels[p.status]||'')+'</span></h3><p>'+escapeHTML([p.client,p.category,p.date].filter(Boolean).join(' · ')||'بدون جزئیات تکمیلی')+'</p></div></div><div class="row-actions"><button data-edit="'+escapeHTML(p.id)+'">ویرایش</button><button data-delete="'+escapeHTML(p.id)+'">حذف</button></div></article>';
      }).join('')+'</div>';
    }

    function render(){
      document.getElementById('stat-all').textContent=fa(projects.length);
      ['draft','review','approved'].forEach(function(s){document.getElementById('stat-'+s).textContent=fa(projects.filter(function(p){return p.status===s}).length)});
      document.getElementById('recent-projects').innerHTML=listHTML(projects.slice(0,4));
      document.getElementById('all-projects').innerHTML=listHTML(projects);
    }

    async function loadProjects(){
      try{
        const data=await requestJSON('/api/projects?admin=1');
        storageReady=!!data.storageReady;
        if(storageIndicator){storageIndicator.textContent=storageReady?'MEDIA READY':'MEDIA SETUP';storageIndicator.style.color=storageReady?'#2e7455':'#a86616'}
        projects=Array.isArray(data.projects)?data.projects:[];
        if(storageReady&&projects.length===0){
          let legacy=[];try{legacy=JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)||'[]')}catch{}
          if(Array.isArray(legacy)&&legacy.length){
            const migrated=await api('import',{projects:legacy});
            projects=migrated.projects||[];
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            showToast('پروژه‌های قبلی به فضای دائمی منتقل شدند');
          }
        }
        showStorageMessage('');
      }catch(error){
        storageReady=false;
        if(storageIndicator){storageIndicator.textContent='MEDIA SETUP';storageIndicator.style.color='#a86616'}
        let legacy=[];try{legacy=JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)||'[]')}catch{}
        projects=Array.isArray(legacy)?legacy:[];
      }
      render();
    }

    function openForm(id){
      form.reset();
      selectedImageFile=null;
      uploadState.textContent='';
      imagePathInput.value='';
      setPreview('');
      form.elements.id.value='';
      document.getElementById('dialog-title').textContent='پروژه جدید';
      if(id){
        const p=projects.find(function(item){return item.id===id});
        if(!p)return;
        Object.entries(p).forEach(function(entry){const key=entry[0],value=entry[1];if(form.elements[key])form.elements[key].value=value==null?'':value});
        imagePathInput.value=p.imagePath||'';
        setPreview(p.imageUrl||'');
        document.getElementById('dialog-title').textContent='ویرایش پروژه';
      }
      modal.classList.add('open');
      setTimeout(function(){form.elements.title.focus()},50);
    }

    function closeForm(){modal.classList.remove('open');selectedImageFile=null}

    async function optimizeImage(file){
      if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('فقط تصویر JPG، PNG یا WebP انتخاب کن.');
      if(file.size>12*1024*1024)throw new Error('حجم فایل اولیه خیلی زیاد است؛ تصویر کوچک‌تری انتخاب کن.');
      const objectUrl=URL.createObjectURL(file);
      try{
        const img=await new Promise(function(resolve,reject){
          const el=new Image();el.onload=function(){resolve(el)};el.onerror=function(){reject(new Error('تصویر قابل خواندن نیست.'))};el.src=objectUrl;
        });
        const maxSide=1800;
        const ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
        const ctx=canvas.getContext('2d',{alpha:false});
        ctx.fillStyle='#f1ece5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let quality=.84;
        let blob=null;
        for(let i=0;i<4;i++){
          blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/webp',quality)});
          if(blob&&blob.size<=2.9*1024*1024)break;
          quality-=.12;
        }
        if(!blob)throw new Error('بهینه‌سازی تصویر انجام نشد.');
        if(blob.size>3.2*1024*1024)throw new Error('تصویر بعد از بهینه‌سازی هنوز بزرگ است.');
        return blob;
      }finally{URL.revokeObjectURL(objectUrl)}
    }

    async function blobToBase64(blob){
      const buffer=await blob.arrayBuffer();
      const bytes=new Uint8Array(buffer);
      let binary='';
      const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
      return btoa(binary);
    }

    async function uploadSelectedImage(){
      if(!selectedImageFile)return imagePathInput.value||'';
      if(!storageReady)throw new Error('فضای ذخیره‌سازی دائمی هنوز فعال نیست.');
      uploadState.textContent='در حال بهینه‌سازی تصویر…';
      const optimized=await optimizeImage(selectedImageFile);
      uploadState.textContent='در حال آپلود امن تصویر…';
      const base64=await blobToBase64(optimized);
      const result=await api('upload-image',{contentType:'image/webp',base64:base64});
      imagePathInput.value=result.pathname||'';
      setPreview(result.previewUrl||'');
      selectedImageFile=null;
      uploadState.textContent='تصویر با موفقیت آپلود شد.';
      return imagePathInput.value;
    }

    imageInput.addEventListener('change',function(){
      const file=imageInput.files&&imageInput.files[0];
      selectedImageFile=file||null;
      uploadState.textContent=file?'تصویر انتخاب شد؛ هنگام ذخیره آپلود می‌شود.':'';
      if(file){
        const url=URL.createObjectURL(file);
        imagePreview.innerHTML='<img src="'+url+'" alt="پیش‌نمایش تصویر انتخاب‌شده">';
        const previewImage=imagePreview.querySelector('img');
        if(previewImage)previewImage.onload=function(){URL.revokeObjectURL(url)};
      }else {const current=projects.find(function(p){return p.id===form.elements.id.value});setPreview(current&&current.imageUrl||'')}
    });

    document.getElementById('remove-image').addEventListener('click',function(){
      selectedImageFile=null;imageInput.value='';imagePathInput.value='';uploadState.textContent='تصویر حذف شد؛ با ذخیره پروژه اعمال می‌شود.';setPreview('');
    });

    document.addEventListener('click',async function(e){
      const add=e.target.closest('[data-add]');
      const edit=e.target.closest('[data-edit]');
      const del=e.target.closest('[data-delete]');
      const publish=e.target.closest('[data-publish]');
      if(add)openForm();
      if(edit)openForm(edit.dataset.edit);
      if(publish){
        const p=projects.find(function(item){return item.id===publish.dataset.publish});
        if(p){try{const data=await api('save',{project:Object.assign({},p,{status:'approved'})});projects=data.projects||projects;render();showToast('پروژه برای نمایش در سایت تأیید شد')}catch(err){showToast(err.message)}}
      }
      if(del&&confirm('این پروژه حذف شود؟')){
        try{const data=await api('delete',{id:del.dataset.delete});projects=data.projects||[];render();showToast('پروژه حذف شد')}catch(err){showToast(err.message)}
      }
      if(e.target.closest('[data-close]'))closeForm();
    });

    modal.addEventListener('click',function(e){if(e.target===modal)closeForm()});

    form.addEventListener('submit',async function(e){
      e.preventDefault();
      const submit=form.querySelector('button[type=submit]');
      submit.disabled=true;
      uploadState.textContent='';
      try{
        await uploadSelectedImage();
        const fd=new FormData(form);
        const project={
          id:String(fd.get('id')||''),
          title:String(fd.get('title')||''),
          client:String(fd.get('client')||''),
          category:String(fd.get('category')||''),
          status:String(fd.get('status')||'draft'),
          summary:String(fd.get('summary')||''),
          url:String(fd.get('url')||''),
          date:String(fd.get('date')||''),
          notes:String(fd.get('notes')||''),
          imagePath:String(imagePathInput.value||'')
        };
        const data=await api('save',{project:project});
        projects=data.projects||projects;
        render();closeForm();showToast('پروژه در فضای دائمی ذخیره شد');
      }catch(err){
        uploadState.textContent=err.message||'ذخیره پروژه انجام نشد.';
      }finally{submit.disabled=false}
    });

    document.querySelectorAll('.nav button').forEach(function(button){
      button.addEventListener('click',function(){
        document.querySelectorAll('.nav button,.view').forEach(function(el){el.classList.remove('active')});
        button.classList.add('active');document.getElementById(button.dataset.view).classList.add('active');
        const copy={overview:['داشبورد مدیریت','همه چیز برای بررسی منظم پروژه‌ها، قبل از انتشار.'],projects:['مدیریت پروژه‌ها','ثبت، تصویر، ویرایش و تأیید نمونه‌کارهای واقعی.'],sections:['بخش‌های سایت','وضعیت محتوای اصلی ROZNEX.']}[button.dataset.view];
        document.getElementById('page-title').textContent=copy[0];document.getElementById('page-subtitle').textContent=copy[1];
      });
    });

    document.getElementById('export-projects').addEventListener('click',function(){
      const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),projects:projects},null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='roznex-projects-backup.json';a.click();URL.revokeObjectURL(a.href);showToast('فایل پشتیبان آماده شد');
    });

    document.getElementById('import-projects').addEventListener('click',function(){document.getElementById('import-file').click()});
    document.getElementById('import-file').addEventListener('change',async function(e){
      const file=e.target.files[0];if(!file)return;
      try{const data=JSON.parse(await file.text());if(!Array.isArray(data.projects))throw new Error();const result=await api('import',{projects:data.projects});projects=result.projects||[];render();showToast('پشتیبان وارد شد')}catch{alert('فایل پشتیبان معتبر نیست یا ذخیره‌سازی فعال نشده است')}e.target.value='';
    });

    addEventListener('keydown',function(e){if(e.key==='Escape')closeForm()});
    loadProjects();
  </script>
</body>
</html>`;
