(() => {
const $=id=>document.getElementById(id);
let config={}, selected="";
const methods={
"Bangla QR":{label:"Bangla QR",number:"",instruction:"Bangla QR পেমেন্টের তথ্য পরে যোগ করা হবে।"},
"bKash":{label:"bKash Personal",key:"bkash",instruction:"বিকাশ নম্বর পরে যোগ করা হবে। নম্বর যুক্ত না হওয়া পর্যন্ত টাকা পাঠাবেন না।"},
"Nagad":{label:"Nagad Personal",key:"nagad",instruction:"নগদ নম্বর পরে যোগ করা হবে। নম্বর যুক্ত না হওয়া পর্যন্ত টাকা পাঠাবেন না।"},
"Rocket":{label:"Rocket Personal",key:"rocket",instruction:"রকেট নম্বর পরে যোগ করা হবে। নম্বর যুক্ত না হওয়া পর্যন্ত টাকা পাঠাবেন না।"},
"Cellfin":{label:"Cellfin Personal",key:"cellfin",instruction:"Cellfin নম্বর পরে যোগ করা হবে।"},
"mCash":{label:"mCash Personal",key:"mcash",instruction:"mCash নম্বর পরে যোগ করা হবে।"}
};
function msg(t,ok=false){$("message").textContent=t;$("message").style.color=ok?"#087f5b":"#b42318"}
function refreshButton(){$("submitBtn").disabled=!selected||!$("merchantNumber").dataset.ready}
document.querySelectorAll(".method").forEach(btn=>btn.addEventListener("click",()=>{
 selected=btn.dataset.method;document.querySelectorAll(".method").forEach(b=>b.classList.toggle("selected",b===btn));
 const m=methods[selected], number=m.key?config[m.key]:"";
 $("formTitle").textContent=m.label+" পেমেন্ট";$("instructions").textContent=number?"এই নম্বরে "+$("amount").textContent+" BDT পাঠান, তারপর Transaction ID দিন।":m.instruction;
 $("merchantNumber").textContent=number?"পেমেন্ট নম্বর: "+number:"পেমেন্ট নম্বর এখনো সেট করা হয়নি";
 $("merchantNumber").classList.remove("hidden");$("merchantNumber").dataset.ready=number?"1":"";
 refreshButton();msg(number?"নম্বর যাচাই করে পেমেন্টের পর TrxID দিন।":"এই পদ্ধতির নম্বর অ্যাডমিন পরে যোগ করবেন।");
}));
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));
 document.querySelectorAll(".method").forEach(b=>b.classList.toggle("hidden",btn.dataset.filter==="mobile"&&b.dataset.method==="Bangla QR"));
}));
fetch("/api/checkout/config").then(r=>r.json()).then(c=>{
 config=c;$("merchantName").textContent=c.merchantName;$("amount").textContent=c.amount;$("submitBtn").textContent=c.amount+" BDT পেমেন্ট জমা দিন";
}).catch(()=>msg("Checkout সেটিংস লোড হয়নি। পরে আবার চেষ্টা করুন।"));
$("checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!selected)return;
 const m=methods[selected], number=m.key?config[m.key]:"";
 if(!number){msg("এই পেমেন্ট নম্বর এখনো সেট করা হয়নি। টাকা পাঠাবেন না।");return}
 $("submitBtn").disabled=true;msg("রেকর্ড জমা হচ্ছে…");
 const f=new FormData(e.target),payload={customer_name:f.get("customer_name"),customer_phone:f.get("customer_phone"),method:selected,transaction_ref:f.get("transaction_ref")};
 try{
  const r=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();
  if(!r.ok)throw new Error(d.error||"জমা দেওয়া যায়নি");
  $("statusBox").classList.remove("hidden");msg("তথ্য জমা হয়েছে। অ্যাডমিন অনুমোদনের অপেক্ষায়।",true);
  $("formTitle").textContent="পেমেন্ট রেকর্ড জমা হয়েছে";
  const id=d.payment.id;
  const poll=async()=>{try{const sr=await fetch("/api/checkout/"+encodeURIComponent(id)+"/status",{cache:"no-store"}),sd=await sr.json();
    if(sd.status==="verified"&&sd.redirectUrl){msg("অ্যাডমিন অনুমোদন করেছেন। গন্তব্যে পাঠানো হচ্ছে…",true);location.assign(sd.redirectUrl);return}
    if(sd.status==="rejected"){msg("পেমেন্ট রেকর্ড বাতিল হয়েছে। সাপোর্টে যোগাযোগ করুন।");return}
    setTimeout(poll,5000);
  }catch{setTimeout(poll,8000)}};
  setTimeout(poll,5000);
 }catch(err){msg(err.message||"সমস্যা হয়েছে");refreshButton()}
});
})();