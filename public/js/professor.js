/* NEU Lab Log — Professor portal: scanner, check-in, check-out */

/* ─── SCAN MODAL ───────────────────────────────────── */
let html5Qr=null;

function openScanModal(){
  if(activeLogId){
    showToast('⚠ You are already checked in. Check out first before using another room.','#b91c1c');
    return;
  }
  scanDone=false;
  $('m-scan').classList.add('on');
  $('qr-st').style.display='flex';
  $('qr-hint').textContent='Point camera at the QR code posted inside the room.';
  $('manual-room-select').style.display='none';
  startHtml5Scan();
}

function closeScan(){
  $('m-scan').classList.remove('on'); // hide modal first
  setTimeout(stopHtml5Scan, 300);     // clean up after modal is gone
}
function scanBackdrop(e){if(e.target===$('m-scan'))closeScan();}

// Strip inline width/height styles that html5-qrcode injects — they break full-bleed on mobile
function scrubQrInlineStyles(){
  const reader=document.getElementById('qr-reader');
  if(!reader)return;
  reader.querySelectorAll('div,video').forEach(el=>{
    el.style.removeProperty('width');
    el.style.removeProperty('height');
    el.style.removeProperty('max-width');
    el.style.removeProperty('max-height');
    el.style.removeProperty('left');
    el.style.removeProperty('top');
  });
  reader.style.removeProperty('width');
  reader.style.removeProperty('height');
}

function startHtml5Scan(){
  if(!window.Html5Qrcode){
    $('qr-st').innerHTML='<div style="font-size:13px;opacity:.8">Scanner library not loaded.<br>Check internet connection.</div>';
    return;
  }
  try{
    html5Qr=new Html5Qrcode('qr-reader');
    const isMobile=window.innerWidth<=640;
    const boxSize=isMobile?200:250;
    const config={fps:15,qrbox:{width:boxSize,height:boxSize},aspectRatio:isMobile?undefined:1.0};
    // Use facingMode directly — 'environment' = back camera on phones, real webcam on desktop
    html5Qr.start(
      {facingMode:'environment'},
      config,
      (decodedText)=>{
        if(scanDone)return;
        scanDone=true;
        closeScan();
        parseQRCode(decodedText);
      },
      ()=>{/* scan miss — ignore */}
    ).then(()=>{
      $('qr-st').style.display='none';
      $('qr-hint').textContent='Hold QR code steady within the frame.';
      scrubQrInlineStyles();
      setTimeout(scrubQrInlineStyles,250);
    }).catch(()=>{
      // Front camera fallback if environment not available
      html5Qr.start(
        {facingMode:'user'},
        config,
        (decodedText)=>{
          if(scanDone)return;
          scanDone=true;
          closeScan();
          parseQRCode(decodedText);
        },
        ()=>{}
      ).then(()=>{
        $('qr-st').style.display='none';
        $('qr-hint').textContent='Hold QR code steady within the frame.';
        scrubQrInlineStyles();
        setTimeout(scrubQrInlineStyles,250);
      }).catch(err=>{
        showCamError('Camera access denied.<br>'+err);
      });
    });
  }catch(e){
    showCamError('Scanner error: '+e.message);
  }
}

function stopHtml5Scan(){
  if(!html5Qr)return;
  const qr=html5Qr;
  html5Qr=null;
  qr.stop().catch(()=>{}).finally(()=>{
    try{qr.clear();}catch(e){}
    const r=$('qr-reader');if(r)r.innerHTML='';
    const st=$('qr-st');
    if(st){
      st.style.display='flex';
      st.innerHTML='<div class="spinner"></div><div style="font-size:14px;opacity:.8;margin-top:8px">Starting camera…</div>';
    }
  });
}

function showCamError(msg){
  $('qr-st').innerHTML='<div style="font-size:32px;margin-bottom:8px">📷</div><div style="font-size:13px;opacity:.8">'+msg+'</div>';
  $('qr-hint').textContent='Camera unavailable — select your room manually below.';
  $('manual-room-select').style.display='flex';
}

function parseQRCode(data){
  const d=(data||'').trim();
  // Format: NEU-LAB:M101
  if(d.toUpperCase().startsWith('NEU-LAB:')){
    const room=d.substring(8).split(':')[0].toUpperCase().trim();
    if(ROOMS.includes(room)){closeScan();setTimeout(()=>openConfirm(room),350);return;}
  }
  // Legacy JSON {"room":"M101"}
  try{const obj=JSON.parse(d);if(obj.room&&ROOMS.includes(obj.room)){closeScan();setTimeout(()=>openConfirm(obj.room),350);return;}}catch(e){}
  // Plain "M101" or "ROOM M101"
  const upper=d.toUpperCase().replace(/^ROOM[\s-]*/,'').trim();
  if(ROOMS.includes(upper)){closeScan();setTimeout(()=>openConfirm(upper),350);return;}
  // No match — show manual fallback, keep scanning
  $('qr-hint').textContent='QR not recognized — try again or select room manually.';
  $('manual-room-select').style.display='flex';
  if(!scanDone)schedScan();
}

function manualSelectRoom(room){
  scanDone=true;closeScan();setTimeout(()=>openConfirm(room),350);
}

function demoScan(){
  scanDone=true;closeScan();setTimeout(()=>openConfirm('M101'),350);
}

/* ─── CONFIRM MODAL ─────────────────────────────────── */
function openConfirm(room){
  // Block if professor already has an active session
  if(activeLogId){
    showToast('⚠ You are already checked in to Room '+activeLogRoom+'. Check out first.','#b91c1c');
    return;
  }
  // Block if room is already occupied by someone else
  if(roomActive[room]){
    const occ=roomActive[room];
    const who=occ.professorName?occ.professorName.split(' ')[0]:'Someone';
    showToast(`⚠ Room ${room} is occupied by ${who}. Please choose another room.`,'#b91c1c');
    return;
  }
  pendingRoom=room;
  const c=RC[room];
  const dn=CU.displayName||CU.email.split('@')[0].split('.').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');

  // Avatar
  const av=$('c-av');
  if(CU.photoURL){av.innerHTML=`<img src="${CU.photoURL}" alt="${dn}">`;}
  else{av.textContent=ini(dn);av.style.background=c.bg;av.style.color=c.bar;}

  $('c-name').textContent=dn;
  $('c-email').textContent=CU.email;

  const tag=$('c-room-tag');
  tag.textContent=`${c.icon} Room ${room} — ${c.label}`;
  tag.style.background=c.bg;tag.style.color=c.txt;

  const now=new Date();
  $('c-time').textContent='Check-in: '+now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · '+now.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  $('m-confirm').classList.add('on');
}
function closeConfirm(){$('m-confirm').classList.remove('on');pendingRoom=null;}
function confirmBackdrop(e){if(e.target===$('m-confirm'))closeConfirm();}

async function autoCheckOutActive(){
  // If there's an active session, auto check it out before new check-in
  if(!activeLogId)return;
  const now=new Date();
  const mins=activeLogStart?Math.round((now-activeLogStart)/60000):0;
  try{
    await db.collection('logs').doc(activeLogId).update({
      status:'done',
      checkOutTimestamp:firebase.firestore.FieldValue.serverTimestamp(),
      checkOutTime:now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}),
      durationMinutes:mins,
    });
  }catch(e){console.error('auto checkout err',e);}
  clearActiveSession();
}

async function doCheckOut(){
  if(!activeLogId){showToast('No active session to check out.','#d97706');return;}
  const btn=document.querySelector('.btn-checkout');
  if(btn){btn.disabled=true;btn.textContent='Checking out…';}
  // Capture values before any async/clear operations
  const logId=activeLogId;
  const logRoom=activeLogRoom;
  const now=new Date();
  const mins=activeLogStart?Math.round((now-activeLogStart)/60000):0;
  const hrs=Math.floor(mins/60);
  const rem=mins%60;
  const durStr=hrs>0?hrs+'h '+rem+'m':rem+'m';
  try{
    await db.collection('logs').doc(logId).update({
      status:'done',
      checkOutTimestamp:firebase.firestore.FieldValue.serverTimestamp(),
      checkOutTime:now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}),
      durationMinutes:mins,
    });
    clearActiveSession();
    showToast('✓ Checked out of Room '+logRoom+' — '+durStr+' used');
  }catch(e){
    console.error('checkout error:',e);
    showToast('⚠ Check-out failed: '+e.message,'#b91c1c');
  }finally{
    // Always re-enable button regardless of success or failure
    const b=document.querySelector('.btn-checkout');
    if(b){b.disabled=false;b.textContent='✓ Check Out';}
  }
}

function showActiveSession(room,startTime){
  const c=RC[room]||RC.M101;
  $('as-room-label').textContent=c.icon+' Currently using Room '+room;
  $('as-checkin-label').textContent='Checked in at '+startTime.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});
  $('active-session-banner').classList.remove('dn');
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    const elapsed=Math.floor((Date.now()-startTime)/1000);
    const h=Math.floor(elapsed/3600);
    const m=Math.floor((elapsed%3600)/60);
    const s=elapsed%60;
    $('as-timer').textContent=(h>0?h+':':'')+(h>0?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');
  },1000);
}

let sessionUnsub=null; // real-time listener for active session doc

function clearActiveSession(){
  if(sessionUnsub){sessionUnsub();sessionUnsub=null;}
  activeLogId=null;activeLogRoom=null;activeLogStart=null;
  clearInterval(timerInterval);timerInterval=null;
  $('active-session-banner').classList.add('dn');
  $('as-timer').textContent='0:00';
}

function listenActiveSession(logId){
  // Unsubscribe any previous listener first
  if(sessionUnsub){sessionUnsub();sessionUnsub=null;}
  sessionUnsub=db.collection('logs').doc(logId).onSnapshot(snap=>{
    if(!snap.exists) return;
    const data=snap.data();
    // If admin force-kicked this session, clear it on the professor's side
    if(data.status==='done' && activeLogId===logId){
      clearActiveSession();
      showToast('⚠ You have been checked out by an administrator.','#b91c1c');
    }
  },err=>console.error('session listener error:',err));
}

async function checkForActiveSession(){
  // On login, check if professor has an active session
  try{
    const snap=await db.collection('logs')
      .where('professorEmail','==',CU.email)
      .where('status','==','active')
      .limit(1).get();
    if(!snap.empty){
      const doc=snap.docs[0];
      const data=doc.data();
      activeLogId=doc.id;
      activeLogRoom=data.room;
      activeLogStart=data.checkInTimestamp?data.checkInTimestamp.toDate():new Date();
      showActiveSession(data.room,activeLogStart);
      listenActiveSession(doc.id); // watch for force kick
    }
  }catch(e){console.error('checkForActiveSession',e);}
}

async function submitLog(){
  if(!pendingRoom)return;
  const btn=$('btn-cy');btn.disabled=true;btn.textContent='Checking room…';
  const roomToLog=pendingRoom;
  try{
    // ── Server-side occupancy check ──────────────────────────
    // Query Firestore directly — never trust the local snapshot alone
    const roomSnap=await db.collection('logs')
      .where('room','==',roomToLog)
      .where('status','==','active')
      .limit(1).get();
    if(!roomSnap.empty){
      const occ=roomSnap.docs[0].data();
      const who=occ.professorName?occ.professorName.split(' ')[0]:'Someone';
      showToast(`⚠ Room ${roomToLog} is currently occupied by ${who}. Choose another room.`,'#b91c1c');
      btn.disabled=false;btn.textContent='✓ Confirm Check In';
      closeConfirm();
      return;
    }
    // ── Safe to proceed ──────────────────────────────────────
    btn.textContent='Logging…';
  } catch(e) {
    console.error('submitLog occupancy check error:',e);
    showToast('⚠ Could not verify room status. Try again.','#b91c1c');
    btn.disabled=false;btn.textContent='✓ Confirm Check In';
    return;
  }
  try{
    const dn=CU.displayName||CU.email.split('@')[0].split('.').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    const now=new Date();
    await autoCheckOutActive();
    const docRef=await db.collection('logs').add({
      professorName:dn,
      professorEmail:CU.email,
      professorPhotoURL:CU.photoURL||null,
      professorUID:CU.uid,
      room:roomToLog,
      status:'active',
      timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      checkInTimestamp:firebase.firestore.FieldValue.serverTimestamp(),
      date:now.toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}),
      time:now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}),
      checkOutTime:null,
      durationMinutes:null,
    });
    activeLogId=docRef.id;
    activeLogRoom=roomToLog;
    activeLogStart=now;
    showActiveSession(roomToLog,now);
    listenActiveSession(docRef.id); // watch for force kick
    showToast('✓ Checked into Room '+roomToLog+'! Tap Check Out when done.');
  }catch(e){
    console.error(e);
    showToast('⚠ Failed to log. Check your connection and try again.','#b91c1c');
  }finally{
    btn.disabled=false;btn.textContent='✓ Confirm Check In';
    closeConfirm();
    scanDone=false;
  }
}

