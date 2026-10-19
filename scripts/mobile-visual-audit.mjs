import { chromium } from 'playwright';
import {mkdir} from 'node:fs/promises';
const base='https://roznexstudio.ir';
const dir='reports/mobile-visual';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const test of [
  {width:320,height:700,locale:'fa',name:'fa-320'},
  {width:390,height:844,locale:'fa',name:'fa-390'},
  {width:430,height:932,locale:'fa',name:'fa-430'},
  {width:768,height:1024,locale:'fa',name:'fa-768'},
  {width:390,height:844,locale:'en',name:'en-390'}
 ]){
  const context=await browser.newContext({viewport:{width:test.width,height:test.height},isMobile:test.width<761,hasTouch:test.width<761,deviceScaleFactor:test.width<761?2:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/'+test.locale+'/',{waitUntil:'domcontentloaded',timeout:55000});
  await page.locator('[data-cinema-entry]').waitFor({timeout:20000});
  // Animation has a fallback poster in reduced-motion mode; avoids downloading video for screenshot testing.
  const geometry=await page.evaluate(()=>{
   const get=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height,display:getComputedStyle(el).display};};
   return {vw:innerWidth,scrollWidth:document.documentElement.scrollWidth,cinema:get('[data-cinema-entry]'),topbar:get('.topbar'),logo:get('.logo'),language:get('.lang'),menu:get('.menu-toggle'),hero:get('#studio-experience'),heroCopy:get('.hero-copy'),services:get('.service-grid'),mobileNav:get('.mobile-nav')};
  });
  const max=Math.max(geometry.scrollWidth-geometry.vw,0);
  if(max>3)throw Error(test.name+' horizontal overflow '+JSON.stringify(geometry));
  if(Math.abs(geometry.cinema.width-geometry.vw)>4)throw Error(test.name+' film entrance not full width');
  if(!geometry.logo||!geometry.menu||geometry.menu.display==='none')throw Error(test.name+' mobile navbar missing');
  await page.screenshot({path:dir+'/'+test.name+'-entry.png',fullPage:false});
  await page.locator('.menu-toggle').click();
  if(await page.locator('.mobile-nav').evaluate(el=>el.hidden))throw Error(test.name+' navigation did not open');
  await page.screenshot({path:dir+'/'+test.name+'-menu.png',fullPage:false});
  await page.keyboard.press('Escape');
  if(!(await page.locator('.mobile-nav').evaluate(el=>el.hidden)))throw Error(test.name+' navigation did not close');
  await page.locator('#studio-experience').evaluate(el=>window.scrollTo({top:el.offsetTop,behavior:'instant'}));
  const heroImage=page.locator('#studio-experience .hero-media img');
  await heroImage.evaluate(async img=>{
   if(img.complete&&img.naturalWidth>0)return;
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Responsive robot image timed out')),15000);
    img.addEventListener('load',()=>{clearTimeout(timer);resolve()},{once:true});
    img.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Robot image failed'))},{once:true});
   });
  });
  await page.screenshot({path:dir+'/'+test.name+'-hero.png',fullPage:false});
  await page.locator('.service-grid').scrollIntoViewIfNeeded();
  await page.screenshot({path:dir+'/'+test.name+'-services.png',fullPage:false});
  const cols=await page.locator('.service-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  if(test.width<=540&&cols!==1)throw Error(test.name+' mobile services should not have multiple narrow columns: '+cols);
  const final=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,vw:innerWidth}));
  if(final.scrollWidth>final.vw+3)throw Error(test.name+' scroll overflow after content');
  results.push({name:test.name,width:test.width,cinemaHeight:Math.round(geometry.cinema.height),documentOverflow:max,columns:cols,menuOpened:true});
  await context.close();
 }
 console.log('ROZNEX MOBILE VISUAL QA SUCCESS',JSON.stringify(results,null,2));
}catch(err){console.error('ROZNEX MOBILE VISUAL QA FAILED',err);process.exitCode=1}
finally{await browser.close()}
