/* NEU Lab Log — Shared state, utilities, helpers */

/* ─── STATE ────────────────────────────────────────── */
let CU=null, isAdmin=false;
let loggingOut=false;
let allLogs=[], filtered=[];
let unsub=null;
let sCol='timestamp', sDir=-1, pg=1;
const PG=15;
let camStream=null,scanT=null,scanDone=false; // kept for compat
// Check-in/out state
let activeLogId=null,activeLogRoom=null,activeLogStart=null,timerInterval=null;
let pendingRoom=null;
let roomActive={}; // live map of occupied rooms { M101: {professorName,...}, ... }
let chRooms=null, chDaily=null;
let qrGenerated={};

/* ─── UTILS ────────────────────────────────────────── */
const $=id=>document.getElementById(id);
const ini=n=>(n||'').split(' ').filter(w=>/[A-Z]/.test(w?.[0])).slice(0,2).map(w=>w[0]).join('')||(n||'').slice(0,2).toUpperCase();
const toD=ts=>{if(!ts)return new Date();if(ts instanceof firebase.firestore.Timestamp)return ts.toDate();if(ts instanceof Date)return ts;return new Date(ts);};
const fDate=ts=>{try{return toD(ts).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'});}catch(e){return '—';}};
const fTime=ts=>{try{return toD(ts).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});}catch(e){return '—';}};
const todayStr=()=>new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'});
const formatDur=m=>{if(!m&&m!==0)return'—';const h=Math.floor(m/60);const r=m%60;return h>0?h+'h '+r+'m':r+'m';}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  $(id).classList.add('on');
  window.scrollTo({top:0,behavior:'instant'});
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}

let toastT;
function showToast(msg,col='#166534'){
  const old=$('toast');
  const el=old.cloneNode(false);
  el.id='toast';el.className='toast';
  el.textContent=msg;el.style.background=col;
  old.replaceWith(el);
  clearTimeout(toastT);
  toastT=setTimeout(()=>el.classList.add('dn'),4500);
}

