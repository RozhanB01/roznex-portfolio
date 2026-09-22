const fa=(n)=>new Intl.NumberFormat("fa-IR").format(n);
const products=[
{brand:"Anker",name:"هدفون بی‌سیم انکر مدل Soundcore Q45",old:"۴,۸۹۰,۰۰۰",price:"۳,۲۹۰,۰۰۰",off:"۳۳٪",icon:"🎧",rating:"۴.۸ (۱۲۸)"},
{brand:"Samsung",name:"گوشی سامسونگ Galaxy S25 دو سیم‌کارت",old:"۵۳,۵۰۰,۰۰۰",price:"۴۸,۹۰۰,۰۰۰",off:"۹٪",icon:"📱",rating:"۴.۷ (۹۴)"},
{brand:"Xiaomi",name:"ساعت هوشمند شیائومی Redmi Watch 5 Active",old:"۳,۱۵۰,۰۰۰",price:"۲,۶۵۰,۰۰۰",off:"۱۶٪",icon:"⌚",rating:"۴.۶ (۲۱۱)"},
{brand:"ASUS",name:"لپ‌تاپ ایسوس VivoBook OLED",old:"۴۶,۸۰۰,۰۰۰",price:"۴۲,۷۰۰,۰۰۰",off:"۹٪",icon:"💻",rating:"۴.۹ (۶۷)"},
{brand:"Chanel",name:"ادو پرفیوم زنانه رایحه Chance حجم ۵۰ میل",old:"۸,۹۰۰,۰۰۰",price:"۷,۴۸۰,۰۰۰",off:"۱۶٪",icon:"🌸",rating:"۴.۸ (۷۶)"},
{brand:"Lilium",name:"کیف دستی زنانه چرمی مدل Coral",old:"۲,۷۹۰,۰۰۰",price:"۱,۹۸۰,۰۰۰",off:"۲۹٪",icon:"👜",rating:"۴.۵ (۵۳)"}
];
let cart=0,wish=0;
const grid=document.querySelector("#productGrid");
products.forEach(function(p,i){
  const el=document.createElement("article");el.className="product-card";
  el.innerHTML='<span class="discount">'+p.off+'</span><button class="wish" aria-label="افزودن به علاقه‌مندی" data-wish="'+i+'">♡</button><div class="product-visual">'+p.icon+'</div><small>'+p.brand+'</small><h3>'+p.name+'</h3><div class="rating">★ '+p.rating+'</div><div class="price-row"><div><div class="old">'+p.old+' تومان</div><div class="price">'+p.price+' تومان</div></div><button class="add" data-add="'+i+'" aria-label="افزودن به سبد">+</button></div>';
  grid.appendChild(el);
});
const toast=document.querySelector("#toast");let toastTimer;
function showToast(t){toast.textContent=t;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.classList.remove("show")},2200)}
document.addEventListener("click",function(e){
  const add=e.target.closest("[data-add]");
  if(add){cart++;document.querySelector("#cartCount").textContent=fa(cart);showToast("محصول به سبد خرید اضافه شد")}
  const w=e.target.closest("[data-wish]");
  if(w){const active=w.dataset.active==="1";w.dataset.active=active?"0":"1";w.textContent=active?"♡":"♥";wish+=active?-1:1;document.querySelector("#wishCount").textContent=fa(wish);showToast(active?"از علاقه‌مندی‌ها حذف شد":"به علاقه‌مندی‌ها اضافه شد")}
});
document.querySelector("#cartBtn").addEventListener("click",function(){showToast(cart?"سبد خرید شما "+fa(cart)+" کالا دارد":"سبد خرید شما خالی است")});
document.querySelector("#wishBtn").addEventListener("click",function(){showToast(wish?fa(wish)+" محصول در علاقه‌مندی‌هاست":"هنوز محصولی ذخیره نکرده‌اید")});
document.querySelector("#userBtn").addEventListener("click",function(){showToast("ورود و ثبت‌نام در نسخه دمو غیرفعال است")});
document.querySelector("#searchForm").addEventListener("submit",function(e){e.preventDefault();const q=document.querySelector("#searchInput").value.trim();showToast(q?"جستجو برای «"+q+"» در نسخه دمو":"عبارت جستجو را وارد کنید")});
document.querySelector("#newsletterForm").addEventListener("submit",function(e){e.preventDefault();const input=document.querySelector("#emailInput"),msg=document.querySelector("#newsletterMessage");if(!/^\S+@\S+\.\S+$/.test(input.value)){msg.textContent="لطفاً یک ایمیل معتبر وارد کنید.";msg.style.color="#9a3f2e";return}msg.textContent="عضویت شما با موفقیت ثبت شد.";msg.style.color="#3c6b3d";input.value=""});
let total=2*3600+14*60+37;setInterval(function(){if(total<=0)total=2*3600+14*60+37;total--;const h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;document.querySelector("#countdown").textContent=[h,m,s].map(function(v){return fa(String(v).padStart(2,"0"))}).join(" : ")},1000);