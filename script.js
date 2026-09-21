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
