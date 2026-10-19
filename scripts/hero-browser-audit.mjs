import { chromium } from 'playwright';

const origin='https://roznexstudio.ir';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 for(const target of [
  {locale:'fa',mobile:true,width:390,height:844,expect:'roznex-cinematic-hero-mobile-hq.mp4'},
  {locale:'en',mobile:false,width:1440,height:900,expect:'roznex-cinematic-hero-audiofix.mp4'}
 ]){
  const ctx=await browser.newContext({viewport:{width:target.width,height:target.height},isMobile:target.mobile,hasTouch:target.mobile,deviceScaleFactor:target.mobile?2:1});
  const page=await ctx.newPage();
  try{
   await page.goto(origin+'/'+target.locale+'/',{waitUntil:'domcontentloaded',timeout:35000});
   const entry=page.locator('[data-cinema-entry]'),video=page.locator('[data-cinema-video]');
   await entry.waitFor({timeout:45000});
   const dims=await entry.evaluate(element=>({height:Math.round(element.getBoundingClientRect().height),width:Math.round(element.getBoundingClientRect().width),vh:innerHeight,vw:innerWidth}));
   if(Math.abs(dims.height-dims.vh)>4||Math.abs(dims.width-dims.vw)>4)
     throw Error('Cinematic video section does not fill first viewport: '+JSON.stringify(dims));
   page.on('requestfailed',request=>{if(request.url().includes('cinematic-hero'))console.log('MEDIA REQUEST FAILURE',request.url(),request.failure()?.errorText)});
   page.on('response',response=>{if(response.url().includes('cinematic-hero'))console.log('MEDIA HTTP RESPONSE',response.status(),response.url())});
   const loaded=await video.evaluate(async v=>{
    if(v.readyState<1)await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('video metadata timeout: '+JSON.stringify({currentSrc:v.currentSrc,readyState:v.readyState,networkState:v.networkState,error:v.error?.code||null}))),45000);
     v.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()}, {once:true});
     v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('video download failed: code '+(v.error?.code||'unknown')+' src '+v.currentSrc))},{once:true});
    });
    return {duration:v.duration,url:v.currentSrc,videoWidth:v.videoWidth,videoHeight:v.videoHeight,muted:v.muted,readyState:v.readyState,networkState:v.networkState,error:v.error?.code||null};
   });
   if(!loaded.url.includes(target.expect))throw Error('Wrong video asset selected: '+loaded.url+' expected '+target.expect);
   if(!(loaded.duration>14&&loaded.duration<17))throw Error('Video duration mismatch '+loaded.duration);
   if(loaded.videoWidth!==764||loaded.videoHeight!==512)throw Error('Resolution is not original 764x512: '+loaded.videoWidth+'x'+loaded.videoHeight);
   if(!loaded.muted)throw Error('Autoplay must begin muted');
   const sound=page.locator('[data-cinema-audio]');
   if(!await sound.isVisible())throw Error('Audible activation button not visible');
   await sound.click();
   await wait(300);
   const audio=await video.evaluate(v=>({muted:v.muted,paused:v.paused,volume:v.volume}));
   if(audio.muted||audio.paused)throw Error('Click did not unlock audible playback: '+JSON.stringify(audio));
   if((await sound.getAttribute('aria-pressed'))!=='true')throw Error('Audio button state did not update');
   const pause=page.locator('[data-cinema-pause]');
   await pause.click();
   if(!await video.evaluate(v=>v.paused))throw Error('Pause control not working');
   await pause.click();
   if(await video.evaluate(v=>v.paused))throw Error('Resume control not working');
   await page.locator('.cinema-enter').click();
   await wait(550);
   const targetShown=await page.locator('#studio-experience').evaluate(el=>el.getBoundingClientRect().top<innerHeight*.8);
   if(!targetShown)throw Error('Original hero not reachable by cinematic scroll cue');
   const heading=await page.locator('#studio-experience h1').count();
   if(heading!==1)throw Error('Original hero H1 lost');
   report.push({locale:target.locale,device:target.mobile?'mobile':'desktop',fullscreen:true,video:loaded.url.split('/').pop(),resolution:loaded.videoWidth+'x'+loaded.videoHeight,audioUnlocked:!audio.muted,pausedResumed:true,oldHeroPreserved:true});
  }finally{await ctx.close()}
 }
 console.log('ROZNEX cinematic video interaction PASS');
 console.log(JSON.stringify(report,null,2));
}catch(error){
 console.error('ROZNEX cinematic video interaction FAIL:',error);
 process.exitCode=1;
}finally{await browser.close()}
