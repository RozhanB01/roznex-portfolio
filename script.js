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
  if(!reduceMotion&&innerWidth>760&&scrollY<innerHeight*1.2){
    heroMedia.style.transform=`translate3d(0,${Math.min(scrollY*.075,70)}px,0) scale(1.015)`;
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

lang.addEventListener('click',()=>{
  const fa=html.lang!=='fa';
  html.lang=fa?'fa':'en';
  html.dir=fa?'rtl':'ltr';
  body.classList.toggle('fa',fa);
  document.querySelectorAll('[data-en]').forEach(el=>el.textContent=fa?el.dataset.fa:el.dataset.en);
  lang.innerHTML=fa?'<span class="selected">FA</span><i></i><span>EN</span>':'<span>FA</span><i></i><span class="selected">EN</span>';
});

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}
}),{threshold:.1});
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
    navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')===`#${entry.target.id}`));
  }
}),{rootMargin:'-35% 0px -60%',threshold:0});
sections.forEach(section=>spy.observe(section));

const dialog=document.getElementById('brief-dialog');
document.getElementById('brief-button').addEventListener('click',()=>dialog.showModal());
dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
const result=dialog.querySelector('.brief-result');
const textarea=result.querySelector('textarea');
dialog.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>{
  textarea.value=`ROZNEX Project Brief\n\nProject type: ${button.dataset.type}\nBusiness / brand: \nMain goal: \nTarget audience: \nEssential features: \nPreferred launch date: \nVisual references: \nAdditional notes: `;
  result.hidden=false;
  textarea.focus();
  textarea.select();
}));
document.getElementById('copy-brief').addEventListener('click',async event=>{
  await navigator.clipboard.writeText(textarea.value);
  const span=event.currentTarget.querySelector('span');
  const old=span.textContent;
  span.textContent=html.lang==='fa'?'کپی شد':'Copied';
  setTimeout(()=>span.textContent=old,1400);
});
