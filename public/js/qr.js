/* NEU Lab Log — QR code generation, download, print */

/* ─── QR PANEL ──────────────────────────────────────── */

function generateAllQRs(){
  ROOMS.forEach((room,i)=>setTimeout(()=>generateQR(room),i*80));
}

function generateQR(room){
  const wrap=$('qr-wrap-'+room);
  if(!wrap||qrGenerated[room])return;
  wrap.innerHTML='<div style="width:240px;height:240px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px">Loading QR…</div>';
  const img=document.createElement('img');
  const payload=encodeURIComponent(qrPayload(room));
  img.crossOrigin='anonymous';
  // Display at 240px on screen, but source is 400px — crisp on any display
  img.style.cssText='display:block;width:240px;height:240px;image-rendering:pixelated';
  img.alt='QR Code Room '+room;
  img.onload=()=>{
    wrap.innerHTML='';
    wrap.appendChild(img);
    qrGenerated[room]=true;
    const txt=$('qr-code-txt-'+room);
    if(txt){txt.textContent='Payload: '+qrPayload(room);txt.style.fontFamily='monospace';txt.style.fontSize='11px';}
  };
  img.onerror=()=>{
    const img2=document.createElement('img');
    img2.crossOrigin='anonymous';
    img2.style.cssText='display:block;width:240px;height:240px;image-rendering:pixelated';
    img2.src='https://chart.googleapis.com/chart?chs=400x400&cht=qr&choe=UTF-8&chld=H|1&chl='+payload;
    img2.onload=()=>{wrap.innerHTML='';wrap.appendChild(img2);qrGenerated[room]=true;};
    img2.onerror=()=>{wrap.innerHTML='<div style="font-size:11px;color:#ef4444;text-align:center;padding:16px">Failed to load QR.<br>Check internet connection.</div>';};
    wrap.innerHTML='';wrap.appendChild(img2);
  };
  // Primary: qrserver.com — 400×400px, H error correction, 1px quiet zone
  img.src='https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=H&margin=1&data='+payload;
}

function getQRImg(room){
  const wrap=$('qr-wrap-'+room);
  if(!wrap)return null;
  const img=wrap.querySelector('img');
  return(img&&img.complete&&img.naturalWidth>0)?img:null;
}

async function downloadQR(room){
  const qrImg=getQRImg(room);
  if(!qrImg){showToast('QR not ready — open the QR Codes tab first','#d97706');return;}
  const c=RC[room];
  const W=600,H=680,QS=360,QX=(W-QS)/2,QY=88;
  const dl=document.createElement('canvas');
  dl.width=W;dl.height=H;
  const ctx=dl.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle=c.bar;ctx.fillRect(0,0,W,72);
  ctx.fillStyle='#ffffff';ctx.textAlign='center';
  ctx.font='bold 22px sans-serif';ctx.fillText('NEU Laboratory Usage Log',W/2,34);
  ctx.font='14px sans-serif';ctx.fillText('New Era University',W/2,60);
  ctx.fillStyle='#ffffff';ctx.fillRect(QX-8,QY-8,QS+16,QS+16);
  ctx.strokeStyle=c.bar+'33';ctx.lineWidth=1;ctx.strokeRect(QX-8,QY-8,QS+16,QS+16);
  ctx.drawImage(qrImg,QX,QY,QS,QS);
  ctx.fillStyle=c.bar;ctx.font='bold 28px sans-serif';ctx.fillText('Room '+room,W/2,QY+QS+44);
  ctx.fillStyle='#4b5563';ctx.font='16px sans-serif';ctx.fillText(c.label,W/2,QY+QS+68);
  ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,QY+QS+82);ctx.lineTo(W-60,QY+QS+82);ctx.stroke();
  ctx.fillStyle='#6b7280';ctx.font='13px sans-serif';ctx.fillText('Scan this QR code to log your laboratory usage',W/2,QY+QS+104);
  ctx.fillStyle=c.bar;ctx.font='bold 11px monospace';ctx.fillText(qrPayload(room),W/2,QY+QS+124);
  ctx.fillStyle=c.bar;ctx.fillRect(0,H-46,W,46);
  ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='11px sans-serif';ctx.fillText('New Era University · NEU Laboratory Management System',W/2,H-18);
  const a=document.createElement('a');
  a.href=dl.toDataURL('image/png');
  a.download='NEU-Lab-Room-'+room+'-QR.png';a.click();
  showToast('✓ Room '+room+' QR downloaded');
}

function printQR(room){
  const qrImg=getQRImg(room);
  if(!qrImg){showToast('QR not ready — open the QR Codes tab first','#d97706');return;}
  const c=RC[room];
  const win=window.open('','_blank','width=480,height=620');
  if(!win){showToast('Pop-up blocked — allow pop-ups and try again','#d97706');return;}
  const T=t=>'<'+t+'>';const TC=t=>'</'+t+'>';
  win.document.write([
    T('html'),T('head'),T('title'),'Room '+room,
    T('style'),
    'body{margin:0;padding:32px 24px;font-family:sans-serif;text-align:center;background:#fff}',
    'h2{color:'+c.bar+';font-size:20px;margin-bottom:4px}',
    'h3{color:#555;font-size:14px;font-weight:400;margin:0 0 20px}',
    'img{display:block;margin:0 auto 12px;width:280px;height:280px}',
    'p{font-size:12px;color:#888;margin:6px 0}',
    '.code{font-family:monospace;font-size:11px;color:'+c.bar+';font-weight:bold;background:#f0fdf4;padding:4px 10px;border-radius:4px;display:inline-block;margin:4px 0}',
    '.footer{margin-top:20px;font-size:10px;color:#bbb;border-top:1px solid #eee;padding-top:12px}',
    TC('style'),TC('head'),
    T('body'),
    T('h2'),'NEU Laboratory Usage Log',TC('h2'),
    T('h3'),'Room '+room+' — '+c.label,TC('h3'),
    '<img src="'+qrImg.src+'" alt="QR Code">',
    T('p'),'Scan this QR code to log your laboratory usage',TC('p'),
    T('p class="code"')+qrPayload(room),TC('p'),
    T('div class="footer"'),'New Era University · NEU Lab Management System',TC('div'),
    T('script'),'window.onload=function(){window.print();}',TC('script'),
    TC('body'),TC('html')
  ].join(''));
  win.document.close();
}

