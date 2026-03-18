// ─── BLOCK IN-APP BROWSERS ───────────────────────────
(function(){
  const ua = navigator.userAgent || '';
  const isInApp = /FBAN|FBAV|FBIOS|FB_IAB|FB4A|Instagram|MessengerLiteForiOS|musical\.ly|BytedanceWebview/i.test(ua);
  if (!isInApp) return;
  document.addEventListener('DOMContentLoaded', function() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;padding:0;background:#166534;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
    document.body.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:40px 28px;text-align:center;max-width:340px;width:90%;margin:24px;">
        <div style="font-size:48px;margin-bottom:16px">🌐</div>
        <h2 style="color:#166534;margin:0 0 10px;font-size:22px">Open in Browser</h2>
        <p style="color:#4b5563;font-size:14px;line-height:1.65;margin:0 0 28px">
          This app doesn't work inside Messenger.<br><br>
          Tap the button below or copy the link and open it in <strong>Safari</strong> or <strong>Chrome</strong>.
        </p>
        <a href="${location.href}" style="display:block;background:#166534;color:#fff;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:12px">🔗 Open in Browser</a>
        <div style="background:#f0fdf4;border-radius:10px;padding:10px 14px;font-size:12px;color:#166534;word-break:break-all;font-family:monospace">${location.href}</div>
      </div>`;
  });
})();

/* NEU Lab Log — Authentication & routing */

/* ─── AUTH ─────────────────────────────────────────── */
auth.onAuthStateChanged(async user=>{
  if(loggingOut) return;
  if(user){
    if(!user.email?.endsWith('@neu.edu.ph')){
      await auth.signOut();showPage('pg-land');
      showToast('Only @neu.edu.ph accounts are allowed.','#b91c1c');return;
    }
    CU=user;
    isAdmin=await checkAdmin(user.email);
    if(isAdmin){ enterAdmin(); return; }
    const allowed=await checkProfessor(user.email);
    if(allowed){ enterProf(); return; }
    await auth.signOut();
    CU=null;
    showPage('pg-land');
    showToast('Access denied. Your account has not been registered. Contact your administrator.','#b91c1c');
  }else{
    loggingOut=false;
    CU=null;isAdmin=false;showPage('pg-land');
  }
});
auth.getRedirectResult().catch(e=>{if(e.code!=='auth/no-current-user')console.error(e);});

async function checkAdmin(email){
  try{const s=await db.collection('admins').doc(email).get();return s.exists;}catch(e){return false;}
}
async function checkProfessor(email){
  try{const s=await db.collection('professors').doc(email).get();return s.exists;}catch(e){return false;}
}

async function googleSignIn(){
  loggingOut=false;
  try{
    const p=new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({hd:'neu.edu.ph',prompt:'select_account'});
    p.addScope('email');p.addScope('profile');
    await auth.signInWithPopup(p);
  }catch(e){
    if(e.code==='auth/popup-blocked'){
      const p=new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({hd:'neu.edu.ph'});
      await auth.signInWithRedirect(p);
    }else if(e.code!=='auth/popup-closed-by-user'){
      showToast(e.message||'Sign-in failed. Please try again.','#b91c1c');
    }
  }
}

function doLogout(){
  loggingOut=true;
  try{document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('on'));}catch(e){}
  try{stopHtml5Scan();}catch(e){}
  try{clearActiveSession();}catch(e){}
  try{if(unsub){unsub();unsub=null;}}catch(e){}
  try{if(roomGridUnsub){roomGridUnsub();roomGridUnsub=null;}}catch(e){}
  try{if(typeof roomStatusUnsub==='function'){roomStatusUnsub();roomStatusUnsub=null;}}catch(e){}
  try{if(typeof profListUnsub==='function'){profListUnsub();profListUnsub=null;}}catch(e){}
  CU=null; isAdmin=false;
  showPage('pg-land');
  auth.signOut().catch(e=>console.warn('signOut err',e));
}

/* ─── PROFESSOR PAGE ───────────────────────────────── */
function enterProf(){
  const dn=CU.displayName||CU.email.split('@')[0].split('.').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const ini_=ini(dn);
  const hdrAv=$('prof-av-hdr');
  if(CU.photoURL){hdrAv.style.cssText=`width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:url(${CU.photoURL}) center/cover;flex-shrink:0`;}
  else{hdrAv.textContent=ini_;}
  $('prof-name-hdr').textContent=dn;
  const photoWrap=$('prof-photo-wrap');
  if(CU.photoURL){photoWrap.innerHTML=`<img src="${CU.photoURL}" class="ph-av" alt="${dn}">`;}
  else{photoWrap.innerHTML=`<div class="ph-av-ini">${ini_}</div>`;}
  $('prof-welcome-name').textContent=`Welcome, ${dn.split(' ')[0]}!`;
  $('prof-welcome-email').textContent=CU.email;
  $('prof-today-date').textContent=new Date().toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric'});
  buildQuickRoomGrid();
  checkForActiveSession();
  showPage('pg-prof');
}

/* ─── LIVE ROOM GRID ────────────────────────────────── */
let roomGridUnsub = null;

function buildQuickRoomGrid(){
  const grid=$('quick-room-grid');
  if(!grid)return;
  renderRoomGrid({});
  if(roomGridUnsub){roomGridUnsub();roomGridUnsub=null;}
  roomGridUnsub = db.collection('logs')
    .where('status','==','active')
    .onSnapshot(snap=>{
      const active={};
      snap.docs.forEach(d=>{ const data=d.data(); active[data.room]=data; });
      roomActive=active; // keep global in sync
      renderRoomGrid(active);
    }, e=>{
      console.error('room grid err',e);
      renderRoomGrid({});
    });
}

function renderRoomGrid(active){
  const grid=$('quick-room-grid');
  if(!grid)return;
  grid.innerHTML='';
  ROOMS.forEach(room=>{
    const c=RC[room];
    const occ=active[room];
    const occupied=!!occ;

    const card=document.createElement('div');
    card.className='prc'+(occupied?' prc-occ':' prc-free');

    // ── Top row: icon + room info + badge ──
    const top=document.createElement('div');
    top.className='prc-top';

    const iconWrap=document.createElement('div');
    iconWrap.className='prc-icon-wrap';
    iconWrap.style.background=occupied?'#fee2e2':c.bg;
    iconWrap.textContent=c.icon;

    const roomMeta=document.createElement('div');
    roomMeta.className='prc-meta';
    roomMeta.innerHTML=`<div class="prc-name" style="color:${occupied?'#b91c1c':c.bar}">Room ${room}</div><div class="prc-label">${c.label}</div>`;

    const badge=document.createElement('span');
    badge.className='prc-badge';
    badge.style.cssText=`background:${occupied?'#fee2e2':'#dcfce7'};color:${occupied?'#b91c1c':'#166534'}`;
    badge.textContent=occupied?'🔴 Occupied':'🟢 Free';

    top.appendChild(iconWrap);
    top.appendChild(roomMeta);
    top.appendChild(badge);
    card.appendChild(top);

    if(occupied){
      // ── Occupied footer: who + since ──
      const since=occ.checkInTimestamp
        ? toD(occ.checkInTimestamp).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})
        : occ.time||'—';

      const footer=document.createElement('div');
      footer.className='prc-footer';

      const av=document.createElement('div');
      if(occ.professorPhotoURL){
        av.innerHTML=`<img src="${occ.professorPhotoURL}" class="prc-av-img" alt="">`;
      } else {
        av.className='prc-av-ini';
        av.textContent=ini(occ.professorName||'');
      }

      const who=document.createElement('div');
      who.className='prc-who';
      const profName=occ.professorName||'Unknown';
      who.innerHTML=`<span class="prc-prof-name">${esc(profName)}</span><span class="prc-since">Since ${since}</span>`;

      footer.appendChild(av);
      footer.appendChild(who);
      card.appendChild(footer);
    } else {
      // ── Free: lock if professor already has an active session ──
      const alreadyIn = !!activeLogId;
      const cta=document.createElement('div');
      cta.className='prc-cta';
      if(alreadyIn){
        cta.textContent='Check out of your current room first';
        cta.style.color='#9ca3af';
        card.style.opacity='0.5';
        card.style.cursor='not-allowed';
        card.style.borderColor='#e5e7eb';
      } else {
        cta.textContent='Tap to check in →';
        card.style.cursor='pointer';
        card.addEventListener('mouseover',()=>{card.style.transform='translateY(-2px)';card.style.boxShadow='0 8px 24px rgba(22,101,52,.15)';});
        card.addEventListener('mouseout',()=>{card.style.transform='';card.style.boxShadow='';});
        card.addEventListener('click',()=>openConfirm(room));
      }
      card.appendChild(cta);
    }

    grid.appendChild(card);
  });
}
