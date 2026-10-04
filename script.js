const html=document.documentElement;
const body=document.body;
const header=document.querySelector('.topbar');
const lang=document.querySelector('.lang');
const menu=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('.mobile-nav');
const hero=document.querySelector('.hero');
const heroMedia=document.querySelector('.hero-media');
const glassCards=[...document.querySelectorAll('.glass-card')];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=matchMedia('(pointer:fine)').matches;

document.getElementById('year').textContent=new Date().getFullYear();

let ticking=false;
const updateScroll=()=>{
  header.classList.toggle('scrolled',scrollY>24);
  const maxScroll=Math.max(document.documentElement.scrollHeight-innerHeight,1);
  const scrollProgress=Math.min(Math.max(scrollY/maxScroll,0),1);
  const heroProgress=Math.min(Math.max(scrollY/(innerHeight*.9),0),1);
  body.style.setProperty('--scroll-progress',scrollProgress.toFixed(4));
  body.style.setProperty('--hero-progress',heroProgress.toFixed(4));
  if(!reduceMotion&&innerWidth>760&&scrollY<innerHeight*1.2){
    heroMedia.style.transform=`translate3d(0,${Math.min(scrollY*.09,78)}px,0) scale(${1.018+heroProgress*.032})`;
  }
  ticking=false;
};
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true}},{passive:true});
updateScroll();

menu.addEventListener('click',()=>{
  const open=menu.getAttribute('aria-expanded')==='true';
  const nextOpen=!open;
  menu.setAttribute('aria-expanded',String(nextOpen));
  menu.setAttribute('aria-label',html.lang==='fa'?(nextOpen?'بستن منو':'باز کردن منو'):(nextOpen?'Close navigation':'Open navigation'));
  mobileNav.hidden=open;
});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  mobileNav.hidden=true;
  menu.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-label',html.lang==='fa'?'باز کردن منو':'Open navigation');
}));

const setLanguage=(fa,animate=false)=>{
  if(animate) body.classList.add('language-switching');
  html.lang=fa?'fa':'en';
  html.dir=fa?'rtl':'ltr';
  body.classList.toggle('fa',fa);
  document.querySelectorAll('[data-en]').forEach(el=>el.textContent=fa?el.dataset.fa:el.dataset.en);
  lang.innerHTML=fa?'<span class="selected">FA</span><i></i><span>EN</span>':'<span>FA</span><i></i><span class="selected">EN</span>';
  lang.setAttribute('aria-label',fa?'Switch language to English':'تغییر زبان به فارسی');
  const menuOpen=menu.getAttribute('aria-expanded')==='true';
  menu.setAttribute('aria-label',fa?(menuOpen?'بستن منو':'باز کردن منو'):(menuOpen?'Close navigation':'Open navigation'));
  const mobileNavEl=document.getElementById('mobile-nav');
  if(mobileNavEl)mobileNavEl.setAttribute('aria-label',fa?'ناوبری موبایل':'Mobile navigation');
  localStorage.setItem('roznex-language',fa?'fa':'en');
  if(animate) setTimeout(()=>body.classList.remove('language-switching'),260);
};
setLanguage(localStorage.getItem('roznex-language')==='fa');
lang.addEventListener('click',()=>setLanguage(html.lang!=='fa',true));

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
    const response=await fetch('/api/site-content?fresh='+Date.now(),{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json();
    const content=data&&data.content||{};
    const heroLines=[...document.querySelectorAll('#hero-title>span')];
    for(let i=0;i<4;i++){
      if(heroLines[i]){
        if(content['hero_en_'+(i+1)])heroLines[i].dataset.en=content['hero_en_'+(i+1)];
        if(content['hero_fa_'+(i+1)])heroLines[i].dataset.fa=content['hero_fa_'+(i+1)];
      }
    }
    if(content.hero_fa_tagline){
      const tagline=document.querySelector('.fa-line');
      if(tagline){tagline.textContent=content.hero_fa_tagline;tagline.style.whiteSpace='pre-line'}
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
        if(content['service_'+id+'_en_title'])title.dataset.en=content['service_'+id+'_en_title'];
        if(content['service_'+id+'_fa_title'])title.dataset.fa=content['service_'+id+'_fa_title'];
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
    setLanguage(html.lang==='fa');
  }catch{}
}
loadSiteContent();

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}
}),{threshold:.12,rootMargin:'0px 0px -7%'});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

if(!reduceMotion&&finePointer){
  hero.addEventListener('pointermove',event=>{
    const x=event.clientX/innerWidth-.5;
    const y=event.clientY/innerHeight-.5;
    glassCards.forEach(card=>{
      const depth=Number(card.dataset.depth||10);
      card.style.setProperty('--mx',`${x*depth}px`);
      card.style.setProperty('--my',`${y*depth}px`);
    });
  },{passive:true});
  hero.addEventListener('pointerleave',()=>glassCards.forEach(card=>{
    card.style.setProperty('--mx','0px');
    card.style.setProperty('--my','0px');
  }));
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
if(!reduceMotion&&finePointer){
  serviceCards.forEach(card=>{
    const visual=card.querySelector('.service-visual');
    card.addEventListener('pointermove',event=>{
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


// Project cards: subtle cursor depth
const projectCards=[...document.querySelectorAll('[data-project-card]')];
if(!reduceMotion&&finePointer){
  projectCards.forEach(card=>{
    const media=card.querySelector('.project-media img');
    card.addEventListener('pointermove',event=>{
      const r=card.getBoundingClientRect();
      const x=((event.clientX-r.left)/r.width-.5)*2;
      const y=((event.clientY-r.top)/r.height-.5)*2;
      if(media) media.style.transform=`scale(1.05) translate3d(${x*-5}px,${y*-5}px,0)`;
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      if(media) media.style.transform='';
    });
  });
}


// ROZNEX visual depth: project cards + about + contact collage
if(!reduceMotion && finePointer){
  document.querySelectorAll('[data-project-card], [data-about-visual], .contact-visual').forEach(card=>{
    card.addEventListener('pointermove',event=>{
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
  if(c.includes('هوش')||c.includes('ai')) return './assets/service-ai.svg';
  if(c.includes('سئو')||c.includes('seo')) return './assets/service-seo.svg';
  if(c.includes('سه')||c.includes('3d')) return './assets/service-3d.svg';
  return './assets/service-web.svg';
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
  if(reduceMotion||!finePointer||!dashboardProjectsRoot)return;
  dashboardProjectsRoot.querySelectorAll('[data-project-card]').forEach(card=>{
    if(card.dataset.motionBound==='1')return;
    card.dataset.motionBound='1';
    card.addEventListener('pointermove',event=>{
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
    const response=await fetch('/api/projects?fresh='+Date.now(),{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error('projects unavailable');
    const data=await response.json();
    projects=Array.isArray(data.projects)?data.projects:[];
  }catch{
    projects=localApprovedFallback();
  }
  renderDashboardProjects(projects);
}
loadPublishedProjects();

// Hero cursor reveal: one softly-lagging oval, desktop fine pointers only.
(()=>{
  const reveal=document.querySelector('.hero-cursor-reveal');
  if(!hero||!reveal||reduceMotion||!matchMedia('(hover: hover) and (pointer: fine)').matches)return;

  const halfW=55;
  const halfH=70;
  let targetX=0,targetY=0,currentX=0,currentY=0;
  let initialized=false;
  let rafId=0;

  const paint=()=>{
    const dx=targetX-currentX;
    const dy=targetY-currentY;
    currentX+=dx*.22;
    currentY+=dy*.22;

    const pos=`${(currentX-halfW).toFixed(2)}px ${(currentY-halfH).toFixed(2)}px`;
    reveal.style.webkitMaskPosition=pos;
    reveal.style.maskPosition=pos;

    if(Math.abs(dx)>.3||Math.abs(dy)>.3){
      rafId=requestAnimationFrame(paint);
    }else{
      currentX=targetX;
      currentY=targetY;
      const finalPos=`${(currentX-halfW).toFixed(2)}px ${(currentY-halfH).toFixed(2)}px`;
      reveal.style.webkitMaskPosition=finalPos;
      reveal.style.maskPosition=finalPos;
      rafId=0;
    }
  };

  hero.addEventListener('pointermove',event=>{
    const rect=hero.getBoundingClientRect();
    targetX=event.clientX-rect.left;
    targetY=event.clientY-rect.top;

    if(!initialized){
      currentX=targetX;
      currentY=targetY;
      initialized=true;
      reveal.style.opacity='1';
      const pos=`${(currentX-halfW).toFixed(2)}px ${(currentY-halfH).toFixed(2)}px`;
      reveal.style.webkitMaskPosition=pos;
      reveal.style.maskPosition=pos;
      return;
    }

    reveal.style.opacity='1';
    if(!rafId)rafId=requestAnimationFrame(paint);
  },{passive:true});

  hero.addEventListener('pointerleave',()=>{
    reveal.style.opacity='0';
    initialized=false;
    if(rafId){cancelAnimationFrame(rafId);rafId=0}
  });
})();

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
