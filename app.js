/* ===== KAIRA – app.js =====
 CONFIG: put your own backend URL here for AI replies when you host this outside claude.ai.
 Your backend receives POST {"prompt": "..."} and must return {"text": "..."}.
 NEVER put an API key in this file – keep it on your server. */
const CONFIG={AI_URL:''};

const $=id=>document.getElementById(id);
let lang='bn',awake=false,awakeT=0,wakeOn=true,mic=false,rec=null,recRun=false,busy=false,speaking=false,ai=null,dict=null,db=null,pending=null;
const D={sales:[],expenses:[],customers:[],contacts:[]};
const T={bn:{greet:'কায়রা – আপনার এআই সহকারী',idle:'মাইক চাপুন, তারপর বলুন "কায়রা"',ph:'কমান্ড লিখুন…',tS:'মোট বিক্রি',tE:'মোট খরচ',tP:'লাভ',tC:'কাস্টমার',hS:'সাম্প্রতিক বিক্রি',hE:'সাম্প্রতিক খরচ',hC:'কাস্টমার',note:'নোট',cn:'কাস্টমারের নাম',cd:'নোট / বাকি',pn:'নাম',listen:'শুনছি…',think:'ভাবছি…',talk:'বলছি…',hello:'হ্যালো স্যার',err:'দুঃখিত স্যার, এখন সংযোগ পাচ্ছি না।',nov:'ভয়েস ইনপুট চলছে না, নিচে লিখুন',call:'📞 কল করুন',sms:'💬 SMS পাঠান'},
en:{greet:'Kaira – your AI assistant',idle:'Tap the mic, then say "Kaira"',ph:'Type a command…',tS:'Total sales',tE:'Total expenses',tP:'Profit',tC:'Customers',hS:'Recent sales',hE:'Recent expenses',hC:'Customers',note:'Note',cn:'Customer name',cd:'Note / due',pn:'Name',listen:'Listening…',think:'Thinking…',talk:'Speaking…',hello:'Hello sir',err:'Sorry sir, I cannot connect right now.',nov:'Voice input unavailable, please type',call:'📞 Call',sms:'💬 Send SMS'}};
const t=k=>T[lang][k];
function ui(){$('greet').textContent=t('greet');if(!awake&&!busy)$('st').textContent=t('idle');$('tx').placeholder=t('ph');['tS','tE','tP','tC'].forEach(k=>$('l'+k.slice(1)).textContent=t(k));$('hS').textContent=t('hS');$('hE').textContent=t('hE');$('hC').textContent=t('hC');$('bn').placeholder=t('note');$('cn').placeholder=t('cn');$('cd').placeholder=t('cd');$('pn').placeholder=t('pn');$('cp').placeholder='+8801...';$('lang').textContent=lang==='bn'?'বাংলা':'English';$('tgl').textContent='Wake: '+(wakeOn?'ON':'OFF');document.documentElement.lang=lang}
$('lang').onclick=()=>{lang=lang==='bn'?'en':'bn';stopRec();ui();pickV();if(mic)startRec()};
$('tgl').onclick=()=>{wakeOn=!wakeOn;awake=!wakeOn;ui()};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id===b.dataset.p))});
function stage(c){$('stage').setAttribute('class','stage '+(c||''));$('stage').firstChild}
function setSt(s,c){$('st').textContent=s;const e=$('stage');e.className='stage '+(c||'')+' '+(e.dataset.m||'')}
function setMood(m,label){const e=$('stage');e.dataset.m=m;e.className=e.className.replace(/\b(happy|concern)\b/g,'').trim()+' '+m;$('mood').textContent=label}
function add(r,x){const d=document.createElement('div');d.className='m '+(r==='user'?'u':'a');d.textContent=x;$('log').appendChild(d);$('log').scrollTop=1e9;return d}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
/* eyes follow pointer */
document.addEventListener('pointermove',e=>{const x=(e.clientX/innerWidth-.5)*6,y=(e.clientY/innerHeight-.5)*4;['pl','pr'].forEach(i=>$(i).style.transform='translate('+x+'px,'+y+'px)')});
/* voice out */
let voice=null;function pickV(){if(!('speechSynthesis'in window))return;const v=speechSynthesis.getVoices(),p=lang==='bn'?'bn':'en';voice=v.find(x=>x.lang.toLowerCase().startsWith(p)&&/female|piyali|samantha|zira|google/i.test(x.name))||v.find(x=>x.lang.toLowerCase().startsWith(p))||null}
if('speechSynthesis'in window){pickV();speechSynthesis.onvoiceschanged=pickV}
function speak(x,done){if(!('speechSynthesis'in window)){done&&done();return}speechSynthesis.cancel();stopRec();const u=new SpeechSynthesisUtterance(x);if(voice)u.voice=voice;u.lang=lang==='bn'?'bn-BD':'en-US';
 u.onstart=()=>{speaking=true;setSt(t('talk'),'speak')};const end=()=>{speaking=false;setSt(awake?t('listen'):t('idle'),'');done&&done();if(mic)setTimeout(startRec,250)};u.onend=end;u.onerror=end;speechSynthesis.speak(u)}
/* voice in */
const WAKE=/kaira|kyra|kira|kayra|cara\b|কায়রা|কাইরা|কাইরা|কায়েরা|কাইরা|কাইরা|কিরা|কাইরাহ|কায়রাহ/i;
function startRec(){if(recRun||busy||speaking)return;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 try{if(SR){rec=new SR();rec.lang=lang==='bn'?'bn-BD':'en-US';rec.continuous=false;rec.interimResults=false;
  rec.onresult=e=>{const s=Array.from(e.results).map(r=>r[0].transcript).join(' ');heard(s)};
  rec.onerror=e=>{recRun=false;if(e.error==='not-allowed'||e.error==='service-not-allowed'){mic=false;$('mic').classList.remove('on');setSt(t('nov'),'')}};
  rec.onend=()=>{recRun=false;if(mic&&!busy&&!speaking)setTimeout(startRec,200)};rec.start();recRun=true;setSt(awake?t('listen'):t('idle'),'listen')}
 else if(dict){let f='';dict.onFinal(({text})=>{f+=text+' '});dict.onState(({state})=>{if(state==='idle'){recRun=false;const s=f.trim();f='';if(s)heard(s);else if(mic&&!busy&&!speaking)setTimeout(startRec,300)}});dict.start().then(()=>{recRun=true}).catch(()=>{mic=false;$('mic').classList.remove('on');setSt(t('nov'),'')});setSt(t('listen'),'listen')}
 else{mic=false;$('mic').classList.remove('on');setSt(t('nov'),'')}}catch(e){setSt(t('nov'),'')}}
function stopRec(){try{rec&&rec.abort()}catch(e){}try{dict&&dict.stop()}catch(e){}recRun=false}
$('mic').onclick=()=>{mic=!mic;$('mic').classList.toggle('on',mic);if(mic){awake=!wakeOn;startRec()}else{stopRec();setSt(t('idle'),'')}};
function heard(s){const m=s.match(WAKE);if(wakeOn&&!awake&&!m){if(mic)setTimeout(startRec,100);return}
 let rest=s;if(m){awake=true;rest=s.replace(WAKE,'').replace(/^[\s,।.،-]+/,'').trim();if(!rest){add('user',s);add('assistant',t('hello'));setMood('happy','Happy');return speak(t('hello'))}}
 clearTimeout(awakeT);awakeT=setTimeout(()=>{if(wakeOn)awake=false},90000);ask(m?s:rest)}
/* data */
function sum(a){return a.reduce((x,y)=>x+(+y.amount||0),0)}
function render(){const S=sum(D.sales),E=sum(D.expenses);$('tS').textContent=S;$('tE').textContent=E;$('tP').textContent=S-E;$('tC').textContent=D.customers.length;
 const li=(c,a)=>a.slice(0,15).map(r=>'<div class="li"><span>'+esc(r.amount)+' · '+esc(r.note||r.customer||'')+'</span><button data-c="'+c+'" data-i="'+esc(r.id)+'">✕</button></div>').join('');
 $('lsS').innerHTML=li('sales',D.sales);$('lsE').innerHTML=li('expenses',D.expenses);
 $('lsC').innerHTML=D.customers.map(r=>'<div class="li"><span>'+esc(r.name)+' '+esc(r.phone||'')+' '+esc(r.note||'')+'</span><button data-c="customers" data-i="'+esc(r.id)+'">✕</button></div>').join('');
 $('lsP').innerHTML=D.contacts.map(r=>'<div class="li"><span>'+esc(r.name)+'<br>'+esc(r.phone)+'</span><span><a href="tel:'+esc(r.phone)+'" target="_blank">📞</a> <a href="sms:'+esc(r.phone)+'" target="_blank">💬</a> <button data-c="contacts" data-i="'+esc(r.id)+'">✕</button></span></div>').join('')}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(b&&db)db.collection(b.dataset.c).doc(b.dataset.i).delete().catch(()=>{})});
async function put(c,o){if(!db)throw new Error('db');await db.collection(c).add(Object.assign({ts:Date.now()},o))}
$('bad').onclick=async()=>{const a=+$('ba').value;if(!a)return;try{await put($('bt').value,{amount:a,note:$('bn').value});$('ba').value='';$('bn').value=''}catch(e){}};
$('cad').onclick=async()=>{if(!$('cn').value)return;try{await put('customers',{name:$('cn').value,phone:$('cp').value,note:$('cd').value});$('cn').value=$('cp').value=$('cd').value=''}catch(e){}};
$('pad').onclick=async()=>{if(!$('pn').value||!$('pp').value)return;try{await put('contacts',{name:$('pn').value,phone:$('pp').value});$('pn').value=$('pp').value=''}catch(e){}};
function findC(n){n=(n||'').toLowerCase();return D.contacts.find(c=>c.name.toLowerCase().includes(n)||n.includes(c.name.toLowerCase()))}
const tools=[
{name:'add_sale',description:'Record a sale in the business database',inputSchema:{type:'object',properties:{amount:{type:'number'},note:{type:'string'}},required:['amount']},execute:async i=>{await put('sales',{amount:i.amount,note:i.note||''});return{ok:true}}},
{name:'add_expense',description:'Record an expense',inputSchema:{type:'object',properties:{amount:{type:'number'},note:{type:'string'}},required:['amount']},execute:async i=>{await put('expenses',{amount:i.amount,note:i.note||''});return{ok:true}}},
{name:'add_customer',description:'Add a customer (with optional phone, note such as amount due)',inputSchema:{type:'object',properties:{name:{type:'string'},phone:{type:'string'},note:{type:'string'}},required:['name']},execute:async i=>{await put('customers',{name:i.name,phone:i.phone||'',note:i.note||''});return{ok:true}}},
{name:'add_contact',description:'Save a phone contact',inputSchema:{type:'object',properties:{name:{type:'string'},phone:{type:'string'}},required:['name','phone']},execute:async i=>{await put('contacts',{name:i.name,phone:i.phone});return{ok:true}}},
{name:'prepare_call',description:'Prepare a phone call to a saved contact name or a phone number. The user must tap the button to place it.',inputSchema:{type:'object',properties:{name:{type:'string'},phone:{type:'string'}}},execute:async i=>{const c=i.phone?{name:i.phone,phone:i.phone}:findC(i.name);if(!c)return{ok:false,error:'contact not found'};pending={k:'call',href:'tel:'+c.phone.replace(/[^\d+]/g,''),who:c.name};return{ok:true,ready:c.name}}},
{name:'prepare_sms',description:'Prepare an SMS draft to a saved contact name or phone number. The user must tap send in Messages.',inputSchema:{type:'object',properties:{name:{type:'string'},phone:{type:'string'},message:{type:'string'}},required:['message']},execute:async i=>{const c=i.phone?{name:i.phone,phone:i.phone}:findC(i.name);if(!c)return{ok:false,error:'contact not found'};pending={k:'sms',href:'sms:'+c.phone.replace(/[^\d+]/g,'')+'&body='+encodeURIComponent(i.message),who:c.name};return{ok:true,ready:c.name}}}];
function ctx(){const S=sum(D.sales),E=sum(D.expenses),f=a=>a.slice(0,15).map(r=>JSON.stringify({amount:r.amount,note:r.note,name:r.name,phone:r.phone})).join('\n');
 return 'BUSINESS DATABASE (live). Totals: sales='+S+', expenses='+E+', profit='+(S-E)+', customers='+D.customers.length+'\nRecent sales:\n'+f(D.sales)+'\nRecent expenses:\n'+f(D.expenses)+'\nCustomers:\n'+f(D.customers)+'\nSaved contacts:\n'+D.contacts.map(c=>c.name).join(', ')}
let hist=[];
async function ask(x){if(!x.trim()||busy)return;busy=true;stopRec();add('user',x);hist.push({role:'user',content:x});const w=add('assistant','…');setSt(t('think'),'listen');pending=null;
 const sys='You are Kaira, a smart, warm personal AI assistant and business manager for one owner. Address him as "'+(lang==='bn'?'স্যার':'sir')+'". '+(lang==='bn'?'Reply ONLY in Bangla (Bengali script), natural spoken style.':'Reply ONLY in English.')+' Keep it to 1-3 short spoken sentences, no markdown, no lists, no emojis. If he only calls your name say hello. If he asks whether you can hear him answer yes, you can hear him. Obey his commands and give honest advice including risks. Use the tools to record sales, expenses, customers, contacts. For calls or SMS use prepare_call / prepare_sms and tell him to tap the button; you cannot place calls or send SMS by yourself or control the phone. Answer business questions ONLY from the database below; never invent figures; if data is missing say so. '+ctx()+'\n\nConversation:\n'+hist.slice(-8).map(m=>m.role+': '+m.content).join('\n')+'\nReply to the last user message.';
 let r=t('err');try{if(ai){const o=await ai(sys,{cache:false,modelTier:'default',tools});r=(o.text||r).trim()}}catch(e){if(e&&e.text)r=e.text}
 w.textContent=r;if(pending){const a=document.createElement('a');a.className='act';a.href=pending.href;a.target='_blank';a.rel='noopener';a.textContent=(pending.k==='call'?t('call'):t('sms'))+' · '+pending.who;w.appendChild(document.createElement('br'));w.appendChild(a)}
 hist.push({role:'assistant',content:r});busy=false;setMood(/দুঃখ|sorry|সমস্যা|loss|ক্ষতি/i.test(r)?'concern':'happy',/দুঃখ|sorry|সমস্যা|loss|ক্ষতি/i.test(r)?'Concerned':'Happy');speak(r)}
$('go').onclick=()=>{const v=$('tx').value;$('tx').value='';awake=true;ask(v)};$('tx').addEventListener('keydown',e=>{if(e.key==='Enter')$('go').click()});
ui();setMood('happy','Calm');

/* ===== storage + AI adapters (claude.ai runtime if present, else local fallback) ===== */
function localDB(){const subs={};
 const load=c=>{try{return JSON.parse(localStorage.getItem('kaira_'+c)||'[]')}catch(e){return[]}};
 const save=(c,a)=>{try{localStorage.setItem('kaira_'+c,JSON.stringify(a))}catch(e){}};
 const snap=c=>({docs:load(c).sort((a,b)=>b.ts-a.ts).slice(0,100).map(r=>({id:r.id,data:()=>{const x=Object.assign({},r);delete x.id;return x}}))});
 const emit=c=>(subs[c]||[]).forEach(f=>f(snap(c)));
 return{collection:c=>({
  add:async o=>{const a=load(c);a.push(Object.assign({id:Date.now()+Math.random().toString(36).slice(2,6)},o));save(c,a);emit(c)},
  doc:id=>({delete:async()=>{save(c,load(c).filter(r=>r.id!==id));emit(c)}}),
  orderBy:()=>({limit:()=>({onSnapshot:f=>{(subs[c]=subs[c]||[]).push(f);f(snap(c))}})})})}}
function remoteAI(){if(!CONFIG.AI_URL)return null;
 return async prompt=>{const r=await fetch(CONFIG.AI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});const j=await r.json();return{text:j.text}}}
(async()=>{
 if(typeof claude!=='undefined'){
  try{ai=await claude.use('sample')}catch(e){}
  try{dict=await claude.use('dictation')}catch(e){}
  try{db=await claude.use('db')}catch(e){}
 }
 if(!ai)ai=remoteAI();
 if(!db)db=localDB();
 Object.keys(D).forEach(c=>db.collection(c).orderBy('ts','desc').limit(100).onSnapshot(s=>{D[c]=s.docs.map(d=>Object.assign({id:d.id},d.data()));render()},()=>{}));
})();
