/* NEU Lab Log — Admin dashboard */

/* ─── ADMIN PAGE ────────────────────────────────────── */
function enterAdmin(){
  const dn=CU.displayName||'Administrator';
  const hdrAv=$('admin-av-hdr');
  if(CU.photoURL){hdrAv.style.cssText=`width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:url(${CU.photoURL}) center/cover;flex-shrink:0`;}
  else{hdrAv.textContent=ini(dn);}
  $('admin-name-hdr').textContent=dn;
  document.querySelectorAll('.ad-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelector('.ad-tab').classList.add('active');
  $('tab-overview').classList.add('active');
  qrGenerated={};
  buildQRPanel();
  showPage('pg-admin');
  startListener();
}

function switchTab(name, btn){
  document.querySelectorAll('.ad-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  $('tab-'+name).classList.add('active');
  if(name==='qrcodes') generateAllQRs();
  if(name==='rooms') startRoomStatusListener();
  if(name==='professors') startProfListListener();
}

function buildQRPanel(){
  const grid=$('qr-panel-grid');grid.innerHTML='';
  ROOMS.forEach(room=>{
    const c=RC[room];
    const div=document.createElement('div');
    div.className='qr-room-card up';
    div.innerHTML=`
      <div class="qrc-stripe" style="background:${c.bar}"></div>
      <div class="qrc-body">
        <div class="qrc-head">
          <div class="qrc-ico" style="background:${c.bg}">${c.icon}</div>
          <div>
            <div class="qrc-name">Room ${room}</div>
            <div class="qrc-label">${c.label}</div>
          </div>
        </div>
        <div class="qrc-canvas-wrap" id="qr-wrap-${room}">
          <div style="width:240px;height:240px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px">Open this tab to generate QR</div>
        </div>
        <div class="qrc-code" id="qr-code-txt-${room}"></div>
        <button class="btn-dl-qr" onclick="downloadQR('${room}')">⬇ Download QR Code</button>
        <button class="btn-print-qr" onclick="printQR('${room}')">🖨️ Print</button>
      </div>`;
    grid.appendChild(div);
  });
}

/* ─── LIVE ROOM STATUS ──────────────────────────────── */
let roomStatusUnsub = null;

function startRoomStatusListener(){
  if(roomStatusUnsub){roomStatusUnsub();roomStatusUnsub=null;}
  roomStatusUnsub = db.collection('logs')
    .where('status','==','active')
    .onSnapshot(snap=>{
      const active={};
      snap.docs.forEach(d=>{ active[d.data().room]={...d.data(), _id:d.id}; });
      renderRoomStatus(active);
    }, e=>console.error('room status err',e));
}

function renderRoomStatus(active){
  const grid=$('room-status-grid');
  if(!grid)return;
  grid.innerHTML='';

  ROOMS.forEach(room=>{
    const c=RC[room];
    const occ=active[room];
    const occupied=!!occ;

    const card=document.createElement('div');
    card.style.cssText=`background:#fff;border-radius:16px;border:2px solid ${occupied?'#fecaca':'#d1fae5'};padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)`;

    // Top row: room info + status badge
    const top=document.createElement('div');
    top.style.cssText='display:flex;align-items:center;justify-content:space-between';

    const roomInfo=document.createElement('div');
    roomInfo.style.cssText='display:flex;align-items:center;gap:10px';
    roomInfo.innerHTML=`
      <div style="width:44px;height:44px;border-radius:11px;background:${c.bg};display:flex;align-items:center;justify-content:center;font-size:20px">${c.icon}</div>
      <div>
        <div style="font-size:16px;font-weight:800;color:${occupied?'#b91c1c':'#166534'}">Room ${room}</div>
        <div style="font-size:11px;color:#6b7280">${c.label}</div>
      </div>`;

    const badge=document.createElement('span');
    badge.style.cssText=`background:${occupied?'#fee2e2':'#dcfce7'};color:${occupied?'#b91c1c':'#166534'};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:800`;
    badge.textContent=occupied?'🔴 Occupied':'🟢 Free';

    top.appendChild(roomInfo);
    top.appendChild(badge);
    card.appendChild(top);

    // Professor info + Force Check Out button
    if(occupied){
      const since=occ.checkInTimestamp ? toD(occ.checkInTimestamp).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : occ.time||'—';

      const bottom=document.createElement('div');
      bottom.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #fecaca;flex-wrap:wrap';

      // Avatar + name
      const profLeft=document.createElement('div');
      profLeft.style.cssText='display:flex;align-items:center;gap:12px';

      const av=document.createElement('div');
      if(occ.professorPhotoURL){
        av.innerHTML=`<img src="${occ.professorPhotoURL}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #fecaca;display:block">`;
      } else {
        av.style.cssText='width:40px;height:40px;border-radius:50%;background:#fee2e2;color:#b91c1c;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0';
        av.textContent=ini(occ.professorName||'');
      }

      const profText=document.createElement('div');
      profText.innerHTML=`
        <div style="font-size:13px;font-weight:700;color:#7f1d1d">${esc(occ.professorName||'Unknown')}</div>
        <div style="font-size:11px;color:#b91c1c;font-family:'IBM Plex Mono',monospace">${esc(occ.professorEmail||'')}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">Since ${since}</div>`;

      profLeft.appendChild(av);
      profLeft.appendChild(profText);

      // Force checkout button
      const kickBtn=document.createElement('button');
      kickBtn.textContent='⏏ Force Check Out';
      kickBtn.style.cssText='background:#b91c1c;color:#fff;border:none;padding:9px 16px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0';
      kickBtn.addEventListener('mouseover',()=>kickBtn.style.background='#991b1b');
      kickBtn.addEventListener('mouseout',()=>kickBtn.style.background='#b91c1c');
      kickBtn.addEventListener('click',()=>forceCheckOut(occ._id, occ.professorName||'this professor', room));

      bottom.appendChild(profLeft);
      bottom.appendChild(kickBtn);
      card.appendChild(bottom);
    }

    grid.appendChild(card);
  });
}

async function forceCheckOut(logId, profName, room){
  if(!confirm(`Force check out ${profName} from Room ${room}?`)) return;
  const now=new Date();
  try{
    const snap=await db.collection('logs')
      .where('room','==',room)
      .where('status','==','active')
      .limit(1).get();
    if(snap.empty){showToast('No active session found','#d97706');return;}
    const doc=snap.docs[0];
    const start=doc.data().checkInTimestamp ? toD(doc.data().checkInTimestamp) : now;
    const mins=Math.round((now-start)/60000);
    await db.collection('logs').doc(doc.id).update({
      status:'done',
      checkOutTimestamp:firebase.firestore.FieldValue.serverTimestamp(),
      checkOutTime:now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}),
      durationMinutes:mins,
      forcedCheckOut:true,
      forcedBy:CU.email,
    });
    showToast(`✓ Forced check out: ${profName} from Room ${room}`);
  }catch(e){
    console.error(e);
    showToast('⚠ Failed: '+e.message,'#b91c1c');
  }
}

/* ─── ADMIN ↔ PROFESSOR VIEW SWITCH ─────────────────── */
function switchToProf(){
  // Stop admin listeners to avoid permission errors on prof queries
  if(unsub){unsub();unsub=null;}
  if(roomStatusUnsub){roomStatusUnsub();roomStatusUnsub=null;}
  if(profListUnsub){profListUnsub();profListUnsub=null;}
  enterProf();
  // Show the "Back to Admin" button since this user is an admin
  const backBtn=$('btn-back-admin');
  if(backBtn) backBtn.style.display='';
}

function backToAdmin(){
  const backBtn=$('btn-back-admin');
  if(backBtn) backBtn.style.display='none';
  // Clean up any prof session listeners
  if(roomGridUnsub){roomGridUnsub();roomGridUnsub=null;}
  enterAdmin();
}


let profListUnsub = null;

function startProfListListener(){
  if(profListUnsub){profListUnsub();profListUnsub=null;}
  profListUnsub=db.collection('professors').onSnapshot(snap=>{
    renderProfList(snap.docs.map(d=>d.id));
  }, e=>console.error('prof list err',e));
}

function renderProfList(emails){
  const list=$('prof-list');
  if(!list)return;
  if(!emails.length){
    list.innerHTML='<div style="text-align:center;padding:40px;color:var(--light);font-size:14px">No professors added yet.</div>';
    return;
  }
  list.innerHTML=emails.sort().map(email=>`
    <div class="prof-list-item">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--gl);color:var(--g2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0">
          ${email.slice(0,2).toUpperCase()}
        </div>
        <div style="font-size:13px;font-family:'IBM Plex Mono',monospace;color:var(--text)">${esc(email)}</div>
      </div>
      <button onclick="removeProfessor('${esc(email)}')" style="background:#fee2e2;border:none;color:#b91c1c;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Remove</button>
    </div>
  `).join('');
}

function validateProfEmail(){
  const val=$('new-prof-email').value.trim();
  const valid=/^[^\s@]+@neu\.edu\.ph$/.test(val);
  $('btn-add-prof').disabled=!valid;
  $('prof-email-err').style.display=val&&!valid?'block':'none';
}

async function addProfessor(){
  const email=$('new-prof-email').value.trim().toLowerCase();
  if(!/^[^\s@]+@neu\.edu\.ph$/.test(email))return;
  const btn=$('btn-add-prof');
  btn.disabled=true;btn.textContent='Adding…';
  try{
    await db.collection('professors').doc(email).set({addedBy:CU.email,addedAt:firebase.firestore.FieldValue.serverTimestamp()});
    $('new-prof-email').value='';
    $('prof-email-err').style.display='none';
    showToast('✓ Professor added: '+email);
  }catch(e){
    showToast('⚠ Failed: '+e.message,'#b91c1c');
  }finally{
    btn.textContent='+ Add Professor';btn.disabled=false;
  }
}

async function removeProfessor(email){
  if(!confirm(`Remove ${email} from the professor list?`))return;
  try{
    await db.collection('professors').doc(email).delete();
    showToast('✓ Removed: '+email);
  }catch(e){
    showToast('⚠ Failed: '+e.message,'#b91c1c');
  }
}
