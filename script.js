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
  menu.setAttribute('aria-expanded',String(!open));
  mobileNav.hidden=open;
});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  mobileNav.hidden=true;
  menu.setAttribute('aria-expanded','false');
}));

const setLanguage=(fa,animate=false)=>{
  if(animate) body.classList.add('language-switching');
  html.lang=fa?'fa':'en';
  html.dir=fa?'rtl':'ltr';
  body.classList.toggle('fa',fa);
  document.querySelectorAll('[data-en]').forEach(el=>el.textContent=fa?el.dataset.fa:el.dataset.en);
  lang.innerHTML=fa?'<span class="selected">FA</span><i></i><span>EN</span>':'<span>FA</span><i></i><span class="selected">EN</span>';
  lang.setAttribute('aria-label',fa?'Switch language to English':'تغییر زبان به فارسی');
  localStorage.setItem('roznex-language',fa?'fa':'en');
  if(animate) setTimeout(()=>body.classList.remove('language-switching'),260);
};
setLanguage(localStorage.getItem('roznex-language')==='fa');
lang.addEventListener('click',()=>setLanguage(html.lang!=='fa',true));

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
    const u=new URL(String(value));
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
    const response=await fetch('/api/projects',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('projects unavailable');
    const data=await response.json();
    projects=Array.isArray(data.projects)?data.projects:[];
  }catch{
    projects=localApprovedFallback();
  }
  renderDashboardProjects(projects);
}
loadPublishedProjects();
