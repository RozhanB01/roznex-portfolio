import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Exactly four authorized synthetic clients via the real ROZNEX public form.
 * Do not retry submissions: a timeout may happen after persistence.
 * Test emails and telephone numbers are non-operational; never call or reply.
 */
const ORIGIN='https://roznexstudio.ir';
const tag='ROZNEX-FOUR-USER-QA-'+(process.env.GITHUB_RUN_ID||'MANUAL');
const out='reports/four-user-form-qa.json';
const users=[
 {name:'مشتری آزمایشی ROZNEX شماره ۱',company:'TEST ONLY — شرکت نمونه طراحی وب',email:'roznex-test-01@example.com',mobile:'0000000001',type:'سایت شرکتی',project:'[TEST ONLY 1/4] طراحی سایت شرکتی',goal:'تست فرم سایت شرکتی و ارسال ایمیل به مالک سایت؛ مشتری واقعی نیست.'},
 {name:'مشتری آزمایشی ROZNEX شماره ۲',company:'TEST ONLY — شرکت نمونه صنعت',email:'roznex-test-02@example.com',mobile:'0000000002',type:'سایت صنعتی',project:'[TEST ONLY 2/4] طراحی سایت صنعتی',goal:'تست فرم سایت صنعتی با کاتالوگ فنی و استعلام قیمت؛ مشتری واقعی نیست.'},
 {name:'مشتری آزمایشی ROZNEX شماره ۳',company:'TEST ONLY — برند نمونه سئو',email:'roznex-test-03@example.com',mobile:'0000000003',type:'سئو / رشد',project:'[TEST ONLY 3/4] سئوی فنی و رشد',goal:'تست فرم درخواست سئو و ارسال اعلان ایمیلی؛ مشتری واقعی نیست.'},
 {name:'مشتری آزمایشی ROZNEX شماره ۴',company:'TEST ONLY — برند نمونه هوش مصنوعی',email:'roznex-test-04@example.com',mobile:'0000000004',type:'هوش مصنوعی / اتوماسیون',project:'[TEST ONLY 4/4] ایجنت و اتوماسیون',goal:'تست درخواست ایجنت هوش مصنوعی و ارسال ایمیل؛ مشتری واقعی نیست.'}
];
const report={tag,origin:ORIGIN,createdAt:new Date().toISOString(),testOnly:true,results:[]};
const save=async()=>{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify({...report,submitted:report.results.length,stored:report.results.filter(x=>x.status===201).length,providerAccepted:report.results.filter(x=>x.notified===true).length},null,2))};
await save();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(let index=0;index<users.length;index++){
  const client=users[index];
  const ctx=await browser.newContext({locale:'fa-IR',viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage();
  let result={sequence:index+1,type:client.type,project:client.project,status:null,id:null,notified:null,formShowsSuccess:false,error:null};
  try{
   await page.goto(ORIGIN+'/start/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#name').fill(client.name);
   await page.locator('#company').fill(client.company);
   await page.locator('#mobile').fill(client.mobile);
   await page.locator('#email').fill(client.email);
   await page.locator('#nextStep').click();
   await page.locator('fieldset[data-step="2"]').waitFor({state:'visible',timeout:8000});
   await page.locator('#type').selectOption({label:client.type});
   await page.locator('#project').fill(client.project);
   await page.locator('#goal').fill(client.goal);
   await page.locator('#features').fill('QA ONLY — آزمایش درخواست و ایمیل، لطفاً پیگیری نشود');
   await page.locator('#nextStep').click();
   await page.locator('fieldset[data-step="3"]').waitFor({state:'visible',timeout:8000});
   await page.locator('#timeline').selectOption({label:'فعلاً در مرحله بررسی هستم'});
   await page.locator('#notes').fill('[AUTOMATED TEST — NOT A REAL CUSTOMER] '+tag+'; scenario '+(index+1)+' of 4; no calls, no sales follow-up.');
   const waitResponse=page.waitForResponse(r=>r.url().includes('/api/requests')&&r.request().method()==='POST',{timeout:50000});
   await page.locator('#submitRequest').click();
   const response=await waitResponse;
   result.status=response.status();
   const data=await response.json().catch(()=>({}));
   result.id=typeof data.id==='string'?data.id:null;
   result.notified=data.notified===true;
   result.apiError=data.error||null;
   result.formShowsSuccess=await page.locator('#status').textContent().then(t=>Boolean(result.id&&t?.includes(result.id)));
   if(result.status!==201)result.error='HTTP '+result.status+'; '+(data.error||'unexplained');
   if(result.status===201&&!result.formShowsSuccess)result.error='API persisted but success UI not confirmed';
   console.log('ROZNEX_4_CLIENTS '+JSON.stringify(result));
  }catch(e){
   result.error=String(e?.message||e).slice(0,500);
   console.error('ROZNEX_4_CLIENTS_ERROR '+JSON.stringify(result));
   // Don't retry an uncertain submission. Rate-limiting and duplicated leads are avoided.
  }finally{
   report.results.push(result);await save();await ctx.close();
  }
  // No retries; modest spacing prevents a burst of rate-limit writes.
  if(index<users.length-1)await new Promise(resolve=>setTimeout(resolve,2200));
 }
}finally{await browser.close();await save()}
const confirmed=report.results.filter(x=>x.status===201).length;
const notified=report.results.filter(x=>x.notified===true).length;
console.log('ROZNEX_4_CLIENTS_TOTAL '+JSON.stringify({attempted:report.results.length,stored:confirmed,notificationProviderAccepted:notified,trace:tag}));
if(confirmed!==4)process.exitCode=1;
else if(notified!==4)process.exitCode=2; // form works but email needs attention
