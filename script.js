const html=document.documentElement;
const body=document.body;
const header=document.querySelector('.topbar');
const lang=document.querySelector('.lang');
const menu=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('.mobile-nav');
const hero=document.querySelector('.hero');
const heroMedia=document.querySelector('.hero-media');
const cinemaEntry=document.querySelector('[data-cinema-entry]');
const cinemaJourney=cinemaEntry?.closest('[data-cinema-journey]');
let cinemaEntryHeight=cinemaEntry?.clientHeight||innerHeight;
let cinemaJourneyHeight=cinemaJourney?.offsetHeight||cinemaEntryHeight;
let cinemaDepthRange=Math.max(1,cinemaJourneyHeight-cinemaEntryHeight);
// Avoid expensive geometry reads during every scroll event.
const measureCinemaLayout=()=>{
 if(!cinemaEntry||!cinemaJourney)return;
 cinemaEntryHeight=cinemaEntry.clientHeight;
 cinemaJourneyHeight=cinemaJourney.offsetHeight;
 cinemaDepthRange=Math.max(1,cinemaJourneyHeight-cinemaEntryHeight);
};
let measurementScheduled=false;
const scheduleCinemaMeasurement=()=>{
 if(measurementScheduled)return;
 measurementScheduled=true;
 requestAnimationFrame(()=>{measurementScheduled=false;measureCinemaLayout()});
};
if(cinemaEntry&&cinemaJourney){
 if(typeof ResizeObserver==='function'){
  const cinemaResize=new ResizeObserver(scheduleCinemaMeasurement);
  cinemaResize.observe(cinemaEntry);
  cinemaResize.observe(cinemaJourney);
 }
 addEventListener('resize',scheduleCinemaMeasurement,{passive:true});
}
const glassCards=[...document.querySelectorAll('.glass-card')];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=matchMedia('(pointer:fine)').matches;
// Costly cursor-depth effects only run on desktop/laptop pointers.
const interactivePointer=!reduceMotion&&finePointer&&matchMedia('(min-width:901px)').matches;

document.getElementById('year').textContent=new Date().getFullYear();

let ticking=false;
const progressBar=document.querySelector('.scroll-progress i');
const portfolioCuration=document.querySelector('.portfolio-curation');
let lastHeroProgress=-1;
const updateScroll=()=>{
  // Update the progress bar directly to avoid inherited CSS invalidation on every scroll.
  const pageY=scrollY;
  const maxScroll=Math.max(document.documentElement.scrollHeight-innerHeight,1);
  const progress=Math.min(Math.max(pageY/maxScroll,0),1);
  if(progressBar)progressBar.style.transform=`scaleX(${progress.toFixed(4)})`;
  header.classList.toggle('scrolled',pageY>24);
  if(pageY<cinemaJourneyHeight+100 && typeof window.updateCinemaDepth==='function')window.updateCinemaDepth();

  // The old hero starts after the full-screen video; its scroll progress is local.
  const heroLocalScroll=Math.max(0,pageY-cinemaJourneyHeight);
  if(heroLocalScroll<innerHeight*1.2||lastHeroProgress<1){
    const heroProgress=Math.min(Math.max(heroLocalScroll/(innerHeight*.9),0),1);
    if(heroProgress!==lastHeroProgress){
      const value=heroProgress.toFixed(4);
      hero.style.setProperty('--hero-progress',value);
      hero.style.setProperty('--hero-copy-y',`${(-heroProgress*24).toFixed(1)}px`);
      if(portfolioCuration)portfolioCuration.style.setProperty('--hero-progress',value);
      lastHeroProgress=heroProgress;
    }
    if(!reduceMotion&&innerWidth>760&&pageY>=cinemaJourneyHeight&&heroLocalScroll<innerHeight*1.2){
      heroMedia.style.transform=`translate3d(0,${Math.min(heroLocalScroll*.09,78)}px,0) scale(${1.018+heroProgress*.032})`;
    }
  }
  ticking=false;
};
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true}},{passive:true});
// At top-of-page the progress bar is already zero; avoid forcing layout
// for the entire document synchronously before first paint.
if(scrollY>0)requestAnimationFrame(updateScroll);

const setMenuOpen=(open,focusFirst=false)=>{
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',html.lang==='fa'?(open?'بستن منو':'باز کردن منو'):(open?'Close navigation':'Open navigation'));
  mobileNav.hidden=!open;
  body.classList.toggle('nav-open',open);
  if(open&&focusFirst){
    const first=mobileNav.querySelector('a');
    if(first)requestAnimationFrame(()=>first.focus({preventScroll:true}));
  }
};

menu.addEventListener('click',()=>{
  const open=menu.getAttribute('aria-expanded')==='true';
  setMenuOpen(!open,!open);
});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenuOpen(false)));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){
    setMenuOpen(false);
    menu.focus({preventScroll:true});
  }
});
addEventListener('resize',()=>{
  if(innerWidth>900&&menu.getAttribute('aria-expanded')==='true')setMenuOpen(false);
},{passive:true});

const setLanguage=(fa,animate=false)=>{
  if(animate) body.classList.add('language-switching');
  const targetLang=fa?'fa':'en';
  const targetDir=fa?'rtl':'ltr';
  if(html.lang!==targetLang)html.lang=targetLang;
  if(html.dir!==targetDir)html.dir=targetDir;
  body.classList.toggle('fa',fa);
  // Both homepages ship correct localized HTML: don't invalidate hundreds of nodes on load.
  document.querySelectorAll('[data-en]').forEach(el=>{
    const text=fa?el.dataset.fa:el.dataset.en;
    if(text!==undefined&&el.textContent!==text)el.textContent=text;
  });
  document.querySelectorAll('[data-href-en]').forEach(el=>{
    const href=fa?el.dataset.hrefFa:el.dataset.hrefEn;
    if(href&&el.getAttribute('href')!==href)el.setAttribute('href',href);
  });
  lang.innerHTML=fa?'<span class="selected">FA</span><i></i><span>EN</span>':'<span>FA</span><i></i><span class="selected">EN</span>';
  lang.setAttribute('aria-label',fa?'تغییر زبان به انگلیسی':'Switch language to Persian');
  const menuOpen=menu.getAttribute('aria-expanded')==='true';
  menu.setAttribute('aria-label',fa?(menuOpen?'بستن منو':'باز کردن منو'):(menuOpen?'Close navigation':'Open navigation'));
  const mobileNavEl=document.getElementById('mobile-nav');
  if(mobileNavEl)mobileNavEl.setAttribute('aria-label',fa?'ناوبری موبایل':'Mobile navigation');
  if(localStorage.getItem('roznex-language')!==targetLang)localStorage.setItem('roznex-language',targetLang);
  if(animate) setTimeout(()=>body.classList.remove('language-switching'),260);
};
// Distinct, crawlable language URLs keep displayed language in sync with SEO metadata.
const isPersianHomepage=/^\/fa\/?$/.test(location.pathname);
const isEnglishHomepage=/^\/en\/?$/.test(location.pathname);
// Both page variants are server-rendered in their correct language.
// Don't scan/modify ~150 already-localized elements during startup.
const currentHomepageLanguage=isPersianHomepage?'fa':'en';
if((isPersianHomepage||isEnglishHomepage)&&html.lang===currentHomepageLanguage&&body.classList.contains('fa')===isPersianHomepage){
  if(localStorage.getItem('roznex-language')!==currentHomepageLanguage)localStorage.setItem('roznex-language',currentHomepageLanguage);
}else{
  setLanguage(isPersianHomepage);
}
lang.addEventListener('click',()=>{
  if(isPersianHomepage||isEnglishHomepage){
    const next=isPersianHomepage?'en':'fa';
    localStorage.setItem('roznex-language',next);
    location.assign(next==='fa'?'/fa/':'/en/');
    return;
  }
  setLanguage(html.lang!=='fa',true);
});


const LEGACY_CMS_COPY=new Map(Object.entries({
  hero_en_1:'DESIGN.',
  hero_en_2:'CODE.',
  hero_en_3:'INTELLIGENCE.',
  hero_en_4:'BUILT AS ONE.',
  hero_fa_1:'طراحی.',
  hero_fa_2:'کد.',
  hero_fa_3:'هوشمندی.',
  hero_fa_4:'در یک سیستم.',
  hero_fa_tagline:'طراحی، کد و هوشمندی؛ در یک سیستم.',
  hero_en_description:'ROZNEX builds distinctive digital products, websites and interactive experiences — from first idea to working system.',
  hero_fa_description:'ROZNEX محصول دیجیتال، وب‌سایت و تجربه‌های تعاملی متمایز می‌سازد؛ از اولین ایده تا یک سیستم واقعی و قابل استفاده.',
  about_en_title:'I design the system before the surface.',
  about_fa_title:'قبل از ظاهر، سیستم را طراحی می‌کنم.',
  contact_en_title:'Tell me what needs to exist.',
  contact_fa_title:'بگو چه چیزی باید ساخته شود.',
  service_ai_en_title:'AI Agents & Workflow Automation',
  service_ai_fa_title:'ایجنت هوش مصنوعی و اتوماسیون جریان‌کار',
  service_web_en_title:'Websites & Digital Products',
  service_web_fa_title:'وب‌سایت و محصول دیجیتال',
  service_3d_en_title:'3D Product & Spatial Web',
  service_3d_fa_title:'وب سه‌بعدی برای محصول و فضا',
  service_seo_en_title:'Technical SEO & Content Systems',
  service_seo_fa_title:'سئوی فنی و سیستم محتوا'
}));
function cmsCopy(content,key){
  const value=content&&content[key];
  if(!value)return '';
  return LEGACY_CMS_COPY.get(key)===value?'':value;
}

const CMS_BINDINGS={
  hero_en_description:['.hero-description','en'],
  hero_fa_description:['.hero-description','fa'],
  about_en_title:['.about-content h2','en'],
  about_fa_title:['.about-content h2','fa'],
  about_en_body:['.about-content>p','en'],
  about_fa_body:['.about-content>p','fa'],
  contact_en_title:['.contact-copy h2','en'],
  contact_fa_title:['.contact-copy h2','fa'],
  contact_en_body:['.contact-copy>p','en'],
  contact_fa_body:['.contact-copy>p','fa']
};
async function loadSiteContent(){
  try{
    const response=await fetch('/api/site-content',{headers:{Accept:'application/json'},cache:'no-cache'});
    if(!response.ok)return;
    const data=await response.json();
    const content=data&&data.content||{};
    const heroLines=[...document.querySelectorAll('#hero-title>span')];
    for(let i=0;i<4;i++){
      if(heroLines[i]){
        const enLine=cmsCopy(content,'hero_en_'+(i+1));if(enLine)heroLines[i].dataset.en=enLine;
        const faLine=cmsCopy(content,'hero_fa_'+(i+1));if(faLine)heroLines[i].dataset.fa=faLine;
      }
    }
    const cmsTagline=cmsCopy(content,'hero_fa_tagline');
    if(cmsTagline){
      const tagline=document.querySelector('.fa-line');
      if(tagline){tagline.textContent=cmsTagline;tagline.style.whiteSpace='pre-line'}
    }
    Object.entries(CMS_BINDINGS).forEach(([key,binding])=>{
      const value=content[key];
      if(!value)return;
      const el=document.querySelector(binding[0]);
      if(el)el.dataset[binding[1]]=value;
    });
    const serviceCards=[...document.querySelectorAll('.service-card')];
    const ids=['ai','web','3d','seo'];
    ids.forEach((id,index)=>{
      const card=serviceCards[index];if(!card)return;
      const title=card.querySelector('h3'),bodyEl=card.querySelector('p');
      if(title){
        const enTitle=cmsCopy(content,'service_'+id+'_en_title');if(enTitle)title.dataset.en=enTitle;
        const faTitle=cmsCopy(content,'service_'+id+'_fa_title');if(faTitle)title.dataset.fa=faTitle;
      }
      if(bodyEl){
        if(content['service_'+id+'_en_body'])bodyEl.dataset.en=content['service_'+id+'_en_body'];
        if(content['service_'+id+'_fa_body'])bodyEl.dataset.fa=content['service_'+id+'_fa_body'];
      }
    });
    if(content.seo_title){
      document.title=content.seo_title;
      document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(el=>el.setAttribute('content',content.seo_title));
    }
    if(content.seo_description){
      const meta=document.querySelector('meta[name="description"]');if(meta)meta.setAttribute('content',content.seo_description);
      document.querySelectorAll('meta[property="og:description"],meta[name="twitter:description"]').forEach(el=>el.setAttribute('content',content.seo_description));
    }
    // Avoid a synchronous full-page text pass when the server has no copy overrides.
    if(Object.keys(content).some(key=>/^(hero_|about_|contact_|service_)/.test(key)))setLanguage(html.lang==='fa');
  }catch{}
}
// CMS customization is noncritical to initial rendering; schedule it after first paint.
const runWhenIdle=callback=>{
  if('requestIdleCallback' in window)requestIdleCallback(callback,{timeout:1800});
  else setTimeout(callback,600);
};
runWhenIdle(loadSiteContent);

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}
}),{threshold:.12,rootMargin:'0px 0px -7%'});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

if(interactivePointer){
  const spatialScene=document.querySelector('.hero-spatial-scene');
  let heroPointerFrame=0;
  let heroPointerX=0,heroPointerY=0;
  let lastHeroPointerEvent=0;
  const paintHeroPointer=()=>{
    const x=heroPointerX/innerWidth-.5;
    const y=heroPointerY/innerHeight-.5;
    hero.style.setProperty('--hero-rx',`${(-y*3.2).toFixed(2)}deg`);
    hero.style.setProperty('--hero-ry',`${(x*4.2).toFixed(2)}deg`);
    hero.style.setProperty('--hero-px',`${(x*18).toFixed(1)}px`);
    hero.style.setProperty('--hero-py',`${(y*14).toFixed(1)}px`);
    hero.style.setProperty('--hero-image-x',`${(x*-3.2).toFixed(1)}px`);
    hero.style.setProperty('--hero-image-y',`${(y*-2.2).toFixed(1)}px`);
    glassCards.forEach(card=>{
      const depth=Number(card.dataset.depth||10);
      card.style.setProperty('--mx',`${(x*depth).toFixed(1)}px`);
      card.style.setProperty('--my',`${(y*depth).toFixed(1)}px`);
      card.style.setProperty('--grx',`${(-y*2.2).toFixed(2)}deg`);
      card.style.setProperty('--gry',`${(x*2.8).toFixed(2)}deg`);
      card.style.setProperty('--hover-my',`${(y*depth-8).toFixed(1)}px`);
    });
    if(spatialScene){
      spatialScene.style.setProperty('--scene-x',`${(x*22).toFixed(1)}px`);
      spatialScene.style.setProperty('--scene-y',`${(y*18).toFixed(1)}px`);
    }
    heroPointerFrame=0;
  };
  hero.addEventListener('pointermove',event=>{
    if(event.timeStamp-lastHeroPointerEvent<32)return;
    lastHeroPointerEvent=event.timeStamp;
    heroPointerX=event.clientX;heroPointerY=event.clientY;
    if(!heroPointerFrame)heroPointerFrame=requestAnimationFrame(paintHeroPointer);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{
    if(heroPointerFrame){cancelAnimationFrame(heroPointerFrame);heroPointerFrame=0}
    hero.style.removeProperty('--hero-rx');hero.style.removeProperty('--hero-ry');
    hero.style.removeProperty('--hero-px');hero.style.removeProperty('--hero-py');
    hero.style.removeProperty('--hero-image-x');hero.style.removeProperty('--hero-image-y');
    glassCards.forEach(card=>{
      card.style.setProperty('--mx','0px');card.style.setProperty('--my','0px');
      card.style.setProperty('--grx','0deg');card.style.setProperty('--gry','0deg');
      card.style.setProperty('--hover-my','-8px');
    });
    if(spatialScene){spatialScene.style.setProperty('--scene-x','0px');spatialScene.style.setProperty('--scene-y','0px')}
  });
}

const navLinks=[...document.querySelectorAll('.main-nav a[href^="#"]')];
const sections=navLinks.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean);
const spy=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){
    navLinks.forEach(link=>{
      const active=link.getAttribute('href')===`#${entry.target.id}`;
      link.classList.toggle('active',active);
      if(active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
    });
  }
}),{rootMargin:'-35% 0px -60%',threshold:0});
sections.forEach(section=>spy.observe(section));


// Service visuals: subtle pointer parallax + mobile active state
const serviceCards=[...document.querySelectorAll('.service-card')];
if(interactivePointer){
  serviceCards.forEach(card=>{
    const visual=card.querySelector('.service-visual');
    let lastServicePointerEvent=0;
    card.addEventListener('pointermove',event=>{
      if(event.timeStamp-lastServicePointerEvent<32)return;
      lastServicePointerEvent=event.timeStamp;
      const r=card.getBoundingClientRect();
      const x=(event.clientX-r.left)/r.width;
      const y=(event.clientY-r.top)/r.height;
      card.style.setProperty('--sx',`${(x*100).toFixed(1)}%`);
      card.style.setProperty('--sy',`${(y*100).toFixed(1)}%`);
      if(visual){
        visual.style.setProperty('--vx',`${((x-.5)*-8).toFixed(1)}px`);
        visual.style.setProperty('--vy',`${((y-.5)*-8).toFixed(1)}px`);
      }
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.removeProperty('--sx');card.style.removeProperty('--sy');
      if(visual){visual.style.setProperty('--vx','0px');visual.style.setProperty('--vy','0px')}
    });
  });
}
const serviceSpy=new IntersectionObserver(entries=>entries.forEach(entry=>{
  entry.target.classList.toggle('is-active',entry.isIntersecting&&entry.intersectionRatio>.55);
}),{threshold:[.2,.55,.8]});
serviceCards.forEach(card=>serviceSpy.observe(card));


// ROZNEX visual depth: project cards + about + contact collage
if(interactivePointer){
  document.querySelectorAll('[data-project-card], [data-about-visual], .contact-visual').forEach(card=>{
    let lastDepthPointerEvent=0;
    card.addEventListener('pointermove',event=>{
      if(event.timeStamp-lastDepthPointerEvent<32)return;
      lastDepthPointerEvent=event.timeStamp;
      const r=card.getBoundingClientRect();
      const x=(event.clientX-r.left)/r.width-.5;
      const y=(event.clientY-r.top)/r.height-.5;
      card.style.setProperty('--rx',`${(-y*2.2).toFixed(2)}deg`);
      card.style.setProperty('--ry',`${(x*2.8).toFixed(2)}deg`);
      const image=card.querySelector('img');
      if(image) image.style.transform=`scale(1.045) translate3d(${(x*-5).toFixed(1)}px,${(y*-5).toFixed(1)}px,0)`;
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
      const image=card.querySelector('img');
      if(image) image.style.transform='';
    });
  });
}


/* Persistent dashboard projects → homepage.
   Public visitors receive only approved/safe fields from the server API. */
const DASHBOARD_PROJECTS_KEY='roznex_admin_projects_v1';
const dashboardProjectsRoot=document.getElementById('dashboard-projects');

function safeProjectText(value=''){
  return String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
}
function projectVisualFor(category=''){
  const c=String(category).toLowerCase();
  if(c.includes('هوش')||c.includes('ai')) return '/assets/service-ai.svg';
  if(c.includes('سئو')||c.includes('seo')) return '/assets/service-seo.svg';
  if(c.includes('سه')||c.includes('3d')) return '/assets/service-3d.svg';
  return '/assets/service-web.svg';
}
function safeHttpUrl(value=''){
  try{
    const u=new URL(String(value));
    return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';
  }catch{return ''}
}
function safeImageUrl(value=''){
  try{
    const u=new URL(String(value),location.origin);
    if(u.origin===location.origin) return u.pathname+u.search;
    return u.protocol==='https:'?u.href:'';
  }catch{return ''}
}
function localApprovedFallback(){
  try{
    const raw=JSON.parse(localStorage.getItem(DASHBOARD_PROJECTS_KEY)||'[]');
    return Array.isArray(raw)?raw.filter(project=>project&&project.status==='approved'):[];
  }catch{return []}
}
function bindDashboardProjectMotion(){
  if(!interactivePointer||!dashboardProjectsRoot)return;
  dashboardProjectsRoot.querySelectorAll('[data-project-card]').forEach(card=>{
    if(card.dataset.motionBound==='1')return;
    card.dataset.motionBound='1';
    let lastDynamicPointerEvent=0;
    card.addEventListener('pointermove',event=>{
      if(event.timeStamp-lastDynamicPointerEvent<32)return;
      lastDynamicPointerEvent=event.timeStamp;
      const r=card.getBoundingClientRect();
      const x=(event.clientX-r.left)/r.width-.5;
      const y=(event.clientY-r.top)/r.height-.5;
      card.style.setProperty('--rx',`${(-y*2.2).toFixed(2)}deg`);
      card.style.setProperty('--ry',`${(x*2.8).toFixed(2)}deg`);
      const image=card.querySelector('img');
      if(image)image.style.transform=`scale(1.045) translate3d(${(x*-5).toFixed(1)}px,${(y*-5).toFixed(1)}px,0)`;
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
      const image=card.querySelector('img');
      if(image)image.style.transform='';
    });
  });
}
function renderDashboardProjects(projects=[]){
  if(!dashboardProjectsRoot)return;
  if(!projects.length){
    dashboardProjectsRoot.hidden=true;
    dashboardProjectsRoot.innerHTML='';
    return;
  }
  dashboardProjectsRoot.hidden=false;
  dashboardProjectsRoot.innerHTML=projects.map((project,index)=>{
    const title=safeProjectText(project.title||'ROZNEX Project');
    const client=safeProjectText(project.client||'ROZNEX');
    const category=safeProjectText(project.category||'Digital Product');
    const summary=safeProjectText(project.summary||'پروژه تأییدشده در ROZNEX');
    const date=safeProjectText(project.date||'');
    const targetUrl=safeHttpUrl(project.url);
    const href=targetUrl?safeProjectText(targetUrl):'#contact';
    const imageUrl=safeImageUrl(project.imageUrl);
    const visual=safeProjectText(imageUrl||projectVisualFor(project.category));
    return `
      <article class="project-tile reveal visible dashboard-project-tile" data-project-card>
        <a class="project-media" href="${href}" ${targetUrl?'target="_blank" rel="noreferrer"':''} aria-label="${title}">
          <img src="${visual}" alt="${title}" width="1200" height="900" loading="lazy" decoding="async">
          <span class="project-status">PUBLISHED / ROZNEX</span>
          <span class="project-open">↗</span>
        </a>
        <div class="project-meta compact">
          <div>
            <span class="project-kicker">${String(index+1).padStart(2,'0')} / ${category}${date?' / '+date:''}</span>
            <h3>${title}</h3>
          </div>
          <p>${summary}</p>
          ${client?'<span class="dashboard-project-client">'+client+'</span>':''}
        </div>
      </article>`;
  }).join('');
  bindDashboardProjectMotion();
}
async function loadPublishedProjects(){
  let projects=[];
  try{
    const response=await fetch('/api/projects',{headers:{Accept:'application/json'},cache:'no-cache'});
    if(!response.ok)throw new Error('projects unavailable');
    const data=await response.json();
    projects=Array.isArray(data.projects)?data.projects:[];
  }catch{
    projects=localApprovedFallback();
  }
  renderDashboardProjects(projects);
}
// Dynamic projects are below the fold; fetch them as visitors approach that section.
if(dashboardProjectsRoot){
  const projectArea=dashboardProjectsRoot.closest('.section')||dashboardProjectsRoot;
  if('IntersectionObserver' in window){
    const lazyProjectsObserver=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        lazyProjectsObserver.disconnect();
        loadPublishedProjects();
      }
    },{rootMargin:'700px 0px',threshold:0});
    lazyProjectsObserver.observe(projectArea);
  }else runWhenIdle(loadPublishedProjects);
}

// Robot face interaction: precise image-relative hotspot with mouse, pen and touch support.
(()=>{
  if(!hero||!heroMedia)return;

  // Override the older desktop-only CSS without changing the site's palette or robot artwork.
  if(!document.getElementById('roznex-face-interaction-fix')){
    const style=document.createElement('style');
    style.id='roznex-face-interaction-fix';
    style.textContent=`
      .hero-media{touch-action:pan-y pinch-zoom}
      .hero-media:before{
        display:block!important;
        width:clamp(165px,18vw,280px)!important;
        opacity:var(--face-glow)!important;
      }
      .hero.face-active .hero-media:before{
        --face-glow:1;
        opacity:1!important;
        transform:translate(-50%,-50%) scale(1.06)!important;
        box-shadow:
          0 0 48px rgba(196,143,78,.34),
          0 0 95px rgba(196,143,78,.16),
          inset 0 0 38px rgba(255,240,207,.16)!important;
      }
      .hero.face-active .hero-media>img{
        filter:saturate(1.09) contrast(1.045) brightness(1.025)!important;
      }
      @media(max-width:760px){
        .hero{--face-x:84%;--face-y:39%}
        .hero-media:before{width:clamp(145px,42vw,200px)!important}
      }
      @media(prefers-reduced-motion:reduce){
        .hero-media:before{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  const desktopFace={x:.68,y:.39,rx:.12,ry:.18};
  // The hero image is heavily cropped on narrow screens (object-position: 58% center),
  // so the same source-image face lands farther to the right in the visible mobile frame.
  const mobileFace={x:.84,y:.39,rx:.20,ry:.21};
  let holdTimer=0;
  let lastFacePointerEvent=0;

  const faceForViewport=()=>innerWidth<=760?mobileFace:desktopFace;
  const isOverFace=(clientX,clientY)=>{
    const r=heroMedia.getBoundingClientRect();
    if(!r.width||!r.height)return false;
    const face=faceForViewport();
    const nx=(clientX-r.left)/r.width;
    const ny=(clientY-r.top)/r.height;
    const dx=(nx-face.x)/face.rx;
    const dy=(ny-face.y)/face.ry;
    return dx*dx+dy*dy<=1;
  };

  const deactivate=()=>{
    hero.classList.remove('face-active');
    if(holdTimer){clearTimeout(holdTimer);holdTimer=0}
  };

  const flash=()=>{
    hero.classList.add('face-active');
    if(holdTimer)clearTimeout(holdTimer);
    holdTimer=setTimeout(()=>{
      hero.classList.remove('face-active');
      holdTimer=0;
    },1200);
  };

  heroMedia.addEventListener('pointermove',event=>{
    if(event.timeStamp-lastFacePointerEvent<32)return;
    lastFacePointerEvent=event.timeStamp;
    if(event.pointerType==='touch'){
      if(event.buttons&&isOverFace(event.clientX,event.clientY))flash();
      return;
    }
    hero.classList.toggle('face-active',isOverFace(event.clientX,event.clientY));
  },{passive:true});

  heroMedia.addEventListener('pointerdown',event=>{
    if(isOverFace(event.clientX,event.clientY))flash();
  },{passive:true});

  heroMedia.addEventListener('pointerleave',event=>{
    if(event.pointerType!=='touch')deactivate();
  },{passive:true});

  heroMedia.addEventListener('pointercancel',deactivate,{passive:true});
  addEventListener('resize',()=>hero.classList.remove('face-active'),{passive:true});
})();

const depthSections=[...document.querySelectorAll('.section,.proof-band,.strip')];
const depthSectionObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>entry.target.classList.toggle('is-in-view',entry.isIntersecting));
},{rootMargin:'10% 0px -10%',threshold:.05});
depthSections.forEach(section=>depthSectionObserver.observe(section));
const orbitVisibility=new IntersectionObserver(entries=>{
  hero.classList.toggle('hero-offscreen',!entries[0].isIntersecting);
},{threshold:0});
orbitVisibility.observe(hero);

/* No visible sound/play controls. Fast autoplay with browser-policy-aware audio. */
if(cinemaEntry){
 const video=cinemaEntry.querySelector('[data-cinema-video]');
 const journey=cinemaEntry.closest('[data-cinema-journey]');
 const audioHint=cinemaEntry.querySelector('[data-cinema-voice-hint]');
 let inViewport=true, userEnabledSound=false, autoSoundAllowed=false;
 const silentPlay=()=>{
   video.muted=true;
   const p=video.play();
   if(p&&typeof p.catch==='function')p.catch(()=>{});
 };
 const playIfVisible=()=>{
   if(reduceMotion||document.hidden||!inViewport)return;
   const p=video.play();
   if(p&&typeof p.catch==='function')p.catch(()=>{
     if(!video.muted&&!userEnabledSound){autoSoundAllowed=false;silentPlay();}
   });
 };
 // Prefer the immediate poster paint to decoding a heavy video during first render.
 // Playback remains fully automatic as soon as the first frame is painted.
 const beginAfterPaint=()=>{
   if(reduceMotion||document.hidden)return;
   const policy=typeof navigator.getAutoplayPolicy==='function'?navigator.getAutoplayPolicy(video):'allowed-muted';
   video.muted=policy!=='allowed';
   const initial=video.play();
   if(initial&&typeof initial.then==='function'){
     initial.then(()=>{autoSoundAllowed=!video.muted;}).catch(()=>{
       autoSoundAllowed=false;silentPlay();
     });
   }
 };
 requestAnimationFrame(()=>requestAnimationFrame(beginAfterPaint));
 if(typeof video.requestVideoFrameCallback==='function'){
   video.requestVideoFrameCallback(()=>cinemaEntry.classList.add('cinema-live'));
 }else{
   video.addEventListener('playing',()=>cinemaEntry.classList.add('cinema-live'),{once:true});
 }
 video.addEventListener('pause',()=>{
   // Safari may pause an autoplay video when script unmutes it.
   if(!document.hidden&&inViewport&&!reduceMotion&&!userEnabledSound&&!autoSoundAllowed&&!video.muted){
     silentPlay();
   }
 });
 const unlockOnGesture=()=>{
   if(reduceMotion||userEnabledSound||autoSoundAllowed||!inViewport||document.hidden)return;
   video.muted=false;
   try{video.volume=1}catch{}
   // Must be called synchronously inside the native user gesture.
   const p=video.play();
   if(p&&typeof p.then==='function'){
     p.then(()=>{
       if(!video.muted){userEnabledSound=true;if(audioHint)audioHint.textContent='';}
     }).catch(()=>{silentPlay();});
   }else{userEnabledSound=true;}
 };
 document.addEventListener('pointerdown',unlockOnGesture,{capture:true,passive:true});
 document.addEventListener('touchend',unlockOnGesture,{capture:true,passive:true});
 document.addEventListener('click',unlockOnGesture,{capture:true,passive:true});
 document.addEventListener('keydown',unlockOnGesture,{capture:true});
 new IntersectionObserver(entries=>{
   inViewport=entries[0].isIntersecting;
   if(!inViewport){video.pause();return;}
   if(!reduceMotion)playIfVisible();
 },{threshold:.08}).observe(cinemaEntry);
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden){video.pause();return;}
   playIfVisible();
 });
 if(reduceMotion)video.pause();
 if(interactivePointer){
   let lastPointer=0;
   cinemaEntry.addEventListener('pointermove',e=>{
     if(e.timeStamp-lastPointer<32)return;
     lastPointer=e.timeStamp;
     cinemaEntry.style.setProperty('--cinema-ry',((e.clientX/innerWidth-.5)*5).toFixed(2)+'deg');
     cinemaEntry.style.setProperty('--cinema-rx',((.5-e.clientY/innerHeight)*4).toFixed(2)+'deg');
   },{passive:true});
   cinemaEntry.addEventListener('pointerleave',()=>{
     cinemaEntry.style.setProperty('--cinema-ry','0deg');
     cinemaEntry.style.setProperty('--cinema-rx','0deg');
   },{passive:true});
 }
 // Scroll changes depth continuously, without re-layout or new paint effects.
 // This uses the existing RAF-throttled document scroll listener.
 window.updateCinemaDepth=()=>{
   if(reduceMotion||!journey)return;
   const progress=Math.min(1,Math.max(0,scrollY/cinemaDepthRange));
   cinemaEntry.style.setProperty('--cinema-scroll',progress.toFixed(4));
 };
 if(scrollY>0)requestAnimationFrame(window.updateCinemaDepth);
}
