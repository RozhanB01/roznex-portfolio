import { chromium } from 'playwright';
const origin='https://roznexstudio.ir';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
try{
 for(const target of [
  {locale:'fa',mobile:true,width:390,height:844,expect:'roznex-cinematic-stream-mobile.mp4',expectedWidth:1050},
  {locale:'en',mobile:false,width:1440,height:900,expect:'roznex-cinematic-stream-desktop.mp4',expectedWidth:1920}
 ]){
  const ctx=await browser.newContext({viewport:{width:target.width,height:target.height},isMobile:target.mobile,hasTouch:target.mobile,deviceScaleFactor:target.mobile?2:1});
  const page=await ctx.newPage();
  try{
   await page.goto(origin+'/'+target.locale+'/',{waitUntil:'domcontentloaded',timeout:45000});
   const entry=page.locator('[data-cinema-entry]'),video=page.locator('[data-cinema-video]');
   await entry.waitFor({timeout:20000});
   const area=await entry.evaluate(el=>({width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height),vw:innerWidth,vh:innerHeight}));
   if(Math.abs(area.width-area.vw)>4||Math.abs(area.height-area.vh)>4)throw Error('Cinematic entry does not cover full viewport '+JSON.stringify(area));
   if(await page.locator('[data-cinema-pause], [data-cinema-audio], .cinema-controls').count())throw Error('Media control buttons are still in the DOM');
   const state=await video.evaluate(async v=>{
    if(v.readyState<1)await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('Metadata timed out: '+v.currentSrc)),45000);
     v.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve()},{once:true});
     v.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('Playback failed: '+v.error?.code))},{once:true});
    });
    return {url:v.currentSrc,width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted};
   });
   if(!state.url.includes(target.expect))throw Error('Wrong source: '+state.url);
   if(Math.abs(state.width-target.expectedWidth)>3||state.height<650)throw Error('Wrong resolution '+state.width+'x'+state.height);
   if(!(state.duration>14&&state.duration<17))throw Error('Wrong video duration '+state.duration);
   // Normal browser policy may block audible autoplay; pressing anywhere unlocks audio.
   if(target.mobile)await entry.tap({position:{x:80,y:310}});
   else await entry.click({position:{x:80,y:310}});
   await page.waitForFunction(()=>{
    const v=document.querySelector('[data-cinema-video]');
    return v&&!v.muted&&!v.paused;
   },null,{timeout:9500});
   const audible=await video.evaluate(v=>({muted:v.muted,paused:v.paused,volume:v.volume}));
   if(audible.muted||audible.paused)throw Error('Audio not enabled by first gesture');
   const depth=await page.evaluate(async()=>{
    const journey=document.querySelector('[data-cinema-journey]');
    const top=Math.round(innerHeight*.23);
    window.scrollTo({top,behavior:'instant'});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const el=document.querySelector('[data-cinema-entry]');
    return {progress:Number(el.style.getPropertyValue('--cinema-scroll')),transform:getComputedStyle(el.querySelector('.cinema-video-layer')).transform};
   });
   if(depth.progress<.1||depth.transform==='none')throw Error('Scroll 3D not active '+JSON.stringify(depth));
   await page.locator('.cinema-enter').click();
   await page.waitForFunction(()=>{
    const el=document.querySelector('#studio-experience');
    return el&&el.getBoundingClientRect().top<innerHeight*.85;
   },null,{timeout:12000});
   if(await page.locator('#studio-experience h1').count()!==1)throw Error('Old hero H1 missing');
   report.push({locale:target.locale,fullScreen:true,videoWidth:state.width,voiceAfterGesture:true,depthProgress:depth.progress,originalHeroRetained:true});
  }finally{await ctx.close()}
 }
 console.log('ROZNEX cinematic QA PASS');console.log(JSON.stringify(report,null,2));
}catch(e){console.error('ROZNEX cinematic QA FAIL:',e);process.exitCode=1}finally{await browser.close()}
