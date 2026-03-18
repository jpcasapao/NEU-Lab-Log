/* NEU Lab Log — Firestore, stats, charts, filters, table, CSV */

/* ─── FIRESTORE LISTENER ────────────────────────────── */
function startListener(){
  if(unsub)unsub();
  unsub=db.collection('logs').orderBy('timestamp','desc').limit(1000)
    .onSnapshot(snap=>{
      allLogs=snap.docs.map(d=>({id:d.id,...d.data()}));
      applyFilters();updateStats();updateCharts();
    },e=>{console.error(e);showToast('⚠ Firestore error — check rules','#b91c1c');});
}
function refreshAdmin(){if(unsub){unsub();unsub=null;}startListener();showToast('Refreshed','#166534');}

/* ─── STATS ─────────────────────────────────────────── */
function updateStats(){
  const td=todayStr();
  const tl=allLogs.filter(l=>l.date===td);
  const up=new Set(allLogs.map(l=>l.professorEmail)).size;
  const rc={};ROOMS.forEach(r=>rc[r]=0);
  allLogs.forEach(l=>{if(rc[l.room]!==undefined)rc[l.room]++;});
  const top=Object.entries(rc).sort((a,b)=>b[1]-a[1])[0];
  $('st-total').textContent=allLogs.length.toLocaleString();
  $('st-room').textContent=top&&top[1]>0?'Room '+top[0]:'—';
  $('st-room-n').textContent=top&&top[1]>0?top[1]+' check-ins':'No data yet';
  $('st-profs').textContent=up.toLocaleString();
  $('st-today').textContent=tl.length.toLocaleString();
  $('st-today-n').textContent=td;
}

/* ─── CHARTS ────────────────────────────────────────── */
function updateCharts(){buildRoomChart();buildDailyChart();}
function buildRoomChart(){
  const ctx=$('ch-rooms')?.getContext('2d');if(!ctx)return;
  const counts=ROOMS.map(r=>allLogs.filter(l=>l.room===r).length);
  const colors=ROOMS.map((_,i)=>i%2===0?'#166534':'#b91c1c');
  if(chRooms)chRooms.destroy();
  chRooms=new Chart(ctx,{type:'bar',
    data:{labels:ROOMS.map(r=>'Room '+r),datasets:[{label:'Check-ins',data:counts,backgroundColor:colors,borderRadius:7,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,grid:{color:'#f0fdf4'},ticks:{stepSize:1,font:{size:11,family:'Outfit'}}},
              x:{grid:{display:false},ticks:{font:{size:11,family:'Outfit'}}}}}});
}
function buildDailyChart(){
  const ctx=$('ch-daily')?.getContext('2d');if(!ctx)return;
  const days=[],labels=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);days.push(d);labels.push(d.toLocaleDateString('en-PH',{month:'short',day:'numeric'}));}
  const toD2=ts=>ts instanceof firebase.firestore.Timestamp?ts.toDate():new Date(ts);
  const counts=days.map(d=>{const nx=new Date(d);nx.setDate(nx.getDate()+1);return allLogs.filter(l=>{if(!l.timestamp)return false;const ld=toD2(l.timestamp);return ld>=d&&ld<nx;}).length;});
  if(chDaily)chDaily.destroy();
  chDaily=new Chart(ctx,{type:'line',
    data:{labels,datasets:[{label:'Check-ins',data:counts,fill:true,backgroundColor:'rgba(22,101,52,.08)',borderColor:'#166534',pointBackgroundColor:'#166534',pointRadius:5,tension:.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,grid:{color:'#f0fdf4'},ticks:{stepSize:1,font:{size:11,family:'Outfit'}}},
              x:{grid:{display:false},ticks:{font:{size:11,family:'Outfit'}}}}}});
}

/* ─── FILTERS ───────────────────────────────────────── */
function periodChange(){
  const v=$('fp').value;
  $('cr').classList.toggle('dn',v!=='custom');
  applyFilters();
}
function clearFilters(){
  $('fq').value='';$('fr').value='';$('fp').value='all';
  $('cr').classList.add('dn');applyFilters();
}
function applyFilters(){
  const q=$('fq').value.toLowerCase().trim();
  const rm=$('fr').value;
  const period=$('fp').value;
  const from=$('df').value,to=$('dt').value;
  const now=new Date();
  const today=new Date(now);today.setHours(0,0,0,0);
  const wk=new Date(today);wk.setDate(today.getDate()-6);
  const mo=new Date(now.getFullYear(),now.getMonth(),1);
  const toDate=ts=>ts instanceof firebase.firestore.Timestamp?ts.toDate():new Date(ts);

  filtered=allLogs.filter(l=>{
    if(q&&!l.professorName?.toLowerCase().includes(q)&&!l.professorEmail?.toLowerCase().includes(q))return false;
    if(rm&&l.room!==rm)return false;
    const ld=l.timestamp?toDate(l.timestamp):new Date(0);
    if(period==='today'&&ld<today)return false;
    if(period==='week'&&ld<wk)return false;
    if(period==='month'&&ld<mo)return false;
    if(period==='custom'){
      if(from&&ld<new Date(from))return false;
      if(to){const td=new Date(to);td.setHours(23,59,59,999);if(ld>td)return false;}
    }
    return true;
  });

  filtered.sort((a,b)=>{
    let va=a[sCol],vb=b[sCol];
    if(sCol==='timestamp'){
      const f=ts=>ts instanceof firebase.firestore.Timestamp?ts.toDate():new Date(ts||0);
      va=f(a.timestamp);vb=f(b.timestamp);
    }
    if(typeof va==='string'){va=va.toLowerCase();vb=(vb||'').toLowerCase();}
    return va<vb?-sDir:va>vb?sDir:0;
  });

  pg=1;
  $('fcnt').textContent=`Showing ${filtered.length} of ${allLogs.length} record${allLogs.length!==1?'s':''}`;
  renderTable();
}

function sortBy(col){
  if(sCol===col)sDir*=-1;else{sCol=col;sDir=-1;}
  document.querySelectorAll('.si').forEach(el=>{el.textContent='↕';el.parentElement.classList.remove('sorted');});
  const ind=$('si-'+col);
  if(ind){ind.textContent=sDir===-1?'↓':'↑';ind.parentElement.classList.add('sorted');}
  applyFilters();
}

/* ─── TABLE ─────────────────────────────────────────── */
function renderTable(){
  const total=filtered.length;
  const pages=Math.max(1,Math.ceil(total/PG));
  if(pg>pages)pg=pages;
  const start=(pg-1)*PG;
  const slice=filtered.slice(start,start+PG);

  // Desktop table
  const tbody=$('tbody');
  if(!slice.length){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty-state"><div class="es-ico">🔍</div><div class="es-title">No records found</div><div class="es-sub">Try adjusting your search or filters.</div></div></td></tr>`;
  }else{
    tbody.innerHTML=slice.map(l=>{
      const c=RC[l.room]||RC.M101;
      const avHTML=l.professorPhotoURL
        ?`<img src="${esc(l.professorPhotoURL)}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover">`
        :`<div class="pav">${ini(l.professorName||'')}</div>`;
      return`<tr>
        <td><div class="pcell">${avHTML}
          <div><div class="pname">${esc(l.professorName||'Unknown')}</div>
          <div class="pemail">${esc(l.professorEmail||'')}</div></div>
        </div></td>
        <td><span class="rbadge" style="background:${c.bg};color:${c.txt}">${c.icon} Room ${esc(l.room)}</span></td>
        <td class="tddate">${esc(l.date||fDate(l.timestamp))}</td>
        <td class="tdtime">${esc(l.time||fTime(l.timestamp))}</td>
        <td class="tdtime">${l.checkOutTime?esc(l.checkOutTime):'<span style="color:#9ca3af;font-size:11px">Active</span>'}</td>
        <td class="tdtime">${l.durationMinutes!=null?formatDur(l.durationMinutes):'<span style="color:#9ca3af;font-size:11px">—</span>'}</td>
      </tr>`;
    }).join('');
  }

  // Mobile cards
  const cards=$('mob-cards');
  if(!slice.length){
    cards.innerHTML=`<div class="mob-card"><div class="empty-state" style="padding:32px 12px"><div class="es-ico">🔍</div><div class="es-title">No records</div></div></div>`;
  }else{
    cards.innerHTML=slice.map(l=>{
      const c=RC[l.room]||RC.M101;
      const avHTML=l.professorPhotoURL
        ?`<img src="${esc(l.professorPhotoURL)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        :`<div class="pav">${ini(l.professorName||'')}</div>`;
      return`<div class="mob-card">
        <div class="mc-top">
          <div class="pcell">${avHTML}
            <div><div class="pname">${esc(l.professorName||'Unknown')}</div>
            <div class="pemail">${esc(l.professorEmail||'')}</div></div>
          </div>
          <span class="rbadge" style="background:${c.bg};color:${c.txt}">${c.icon} ${esc(l.room)}</span>
        </div>
        <div class="mc-meta">
          <span>📅 ${esc(l.date||fDate(l.timestamp))}</span>
          <span style="font-family:'IBM Plex Mono',monospace">🕐 ${esc(l.time||fTime(l.timestamp))}</span>
          ${l.checkOutTime?'<span>🚪 '+esc(l.checkOutTime)+'</span>':''}
          ${l.durationMinutes!=null?'<span>⏱ '+formatDur(l.durationMinutes)+'</span>':''}
        </div>
      </div>`;
    }).join('');
  }

  // Pagination
  const foot=$('tbl-foot');
  if(total>PG){
    const s=start+1,e2=Math.min(start+PG,total);
    foot.innerHTML=`<span>${s}–${e2} of ${total}</span>
      <div class="pgbtns">
        <button class="pgbtn" onclick="goPage(1)" ${pg===1?'disabled':''}>«</button>
        <button class="pgbtn" onclick="goPage(${pg-1})" ${pg===1?'disabled':''}>‹</button>
        ${Array.from({length:Math.min(5,pages)},(_,i)=>{
          const p2=Math.max(1,Math.min(pages-4,pg-2))+i;
          if(p2>pages)return'';
          return`<button class="pgbtn ${p2===pg?'cur':''}" onclick="goPage(${p2})">${p2}</button>`;
        }).join('')}
        <button class="pgbtn" onclick="goPage(${pg+1})" ${pg===pages?'disabled':''}>›</button>
        <button class="pgbtn" onclick="goPage(${pages})" ${pg===pages?'disabled':''}>»</button>
      </div>`;
  }else{
    foot.innerHTML=total>0?`<span>${total} record${total!==1?'s':''}</span>`:'';
  }
}
function goPage(p){pg=p;renderTable();window.scrollTo({top:0,behavior:'smooth'});}

/* ─── CSV EXPORT ────────────────────────────────────── */
function exportCSV(){
  if(!filtered.length){showToast('No records to export','#d97706');return;}
  const h=['Professor Name','Email','Room','Date','Check-in','Check-out','Duration'];
  const fDate2=ts=>ts instanceof firebase.firestore.Timestamp?ts.toDate().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}):ts;
  const fTime2=ts=>ts instanceof firebase.firestore.Timestamp?ts.toDate().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}):ts;
  const rows=filtered.map(l=>[l.professorName||'',l.professorEmail||'',l.room||'',l.date||fDate2(l.timestamp),l.time||fTime2(l.timestamp),l.checkOutTime||'',l.durationMinutes!=null?formatDur(l.durationMinutes):'']);
  const csv=[h,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`neu-lab-logs-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast(`✓ Exported ${filtered.length} records`);
}

/* ─── KEYBOARD ──────────────────────────────────────── */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeScan();closeConfirm();}
});
