/**
 * ROZNEX production form/email test — explicit owner's request.
 * 20 synthetic, non-human entries. Do NOT circumvent rate limit or use fake IPs.
 * Stop after first request if notification provider doesn't accept mail.
 * To respect rate limit: four waves of <=5 with 31 minutes between waves.
 */
import fs from 'node:fs';
const BASE='https://roznexstudio.ir';
const BATCH_SIZE=5;
const TOTAL=20;
const GAP_MS=31*60*1000;
const trace='QA-ROZNEX-'+process.env.GITHUB_RUN_ID;
const out='reports/lead-email-qa.json';
const items=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const persist=()=>{
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync(out,JSON.stringify({trace,host:BASE,startedBy:'ROZNEX owner authorized 20-user simulation',sent:items.length,accepted:items.filter(x=>x.status===201).length,notified:items.filter(x=>x.notified===true).length,results:items},null,2));
};
persist();
const types=['سایت صنعتی','سایت شرکتی','سایت شخصی / رزومه','سایت فروشگاهی','هوش مصنوعی / اتوماسیون','سئو / رشد','پلتفرم / پنل تحت وب'];
for(let i=0;i<TOTAL;i++){
 if(i>0 && i%BATCH_SIZE===0){
  console.log('Rate-limit protection: wait 31 minutes before next 5-request group.');
  await sleep(GAP_MS);
 }
 const index=String(i+1).padStart(2,'0');
 const payload={
  name:'آزمایش خودکار ROZNEX '+index+' از ۲۰',
  company:'TEST ONLY - آزمایشی، مشتری واقعی نیست',
  mobile:'0000000000',
  email:'roznex.qa.'+index+'@example.com',
  type:types[i%types.length],
  project:'[TEST ONLY] بررسی فرم و ایمیل '+index+'/20 | '+trace,
  goal:'آزمون مجاز مالک سایت برای بررسی ثبت درخواست و ارسال اعلان به ایمیل مدیریت. مشتری واقعی نیست؛ لطفا پیگیری نکنید.',
  features:'تست رابط فرم، ثبت سرور و اعلان ایمیل Resend',
  timeline:'فعلاً در مرحله بررسی هستم',
  budget:'',
  notes:'[SYNTHETIC TEST - NOT A REAL CLIENT] '+trace+' sequence '+index+' of 20. Do not call or respond.',
  website:''
 };
 let status=0,reply={};
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch(BASE+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Origin':BASE},body:JSON.stringify(payload),signal:controller.signal});
   status=response.status;
   reply=await response.json().catch(()=>({error:'invalid_json_response'}));
  }finally{clearTimeout(timeout);}
 }catch(e){reply={error:String(e).slice(0,220)}}
 const item={sequence:i+1,status,id:reply.id||null,notified:reply.notified===true,error:reply.error||null};
 items.push(item);persist();console.log('LEAD_QA_RESULT '+JSON.stringify(item));
 if(status!==201 || reply.notified!==true){
  console.error('Stop: storage or email notification not confirmed. Further synthetic requests will not be sent.');
  process.exitCode=1;
  break;
 }
}
console.log('LEAD_QA_TOTAL '+JSON.stringify({submitted:items.length,accepted:items.filter(x=>x.status===201).length,notificationProviderAccepted:items.filter(x=>x.notified).length}));
if(items.length!==TOTAL)process.exitCode=1;
