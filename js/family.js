/* ===== Panikpakuttuk family experience (v4) ===== */
const FAM = VOYAGE.family || null;
const FAM_KEYS=['st_roch','st_roch_1945','nascopie','sled'];
const famPlayBtn=document.getElementById('famPlay'), famPrevBtn=document.getElementById('famPrev'), famNextBtn=document.getElementById('famNext');
const famScrub=document.getElementById('famScrub'), famTime=document.getElementById('famTime');
const famEditBtn=document.getElementById('famEditBtn'), famjsonEl=document.getElementById('famjson');
const readoutEl2=document.getElementById('readout');
let familyMode=false, famEngaged=false, famBuilt=false, famEditing=false;
let famPlaying=false, famRaf=null, famCurT=0, famLastTs=0, famScrubbing=false, famTotalT=0, famSuppressFollow=false;
let famSegs=[], famStops=[], famStopMarkers=[], famSideMarkers=[], famTiEls=[], famHandles=[], famLastReached=-2, famLastCardIdx=-2, famShipKey=null;
let famFull=null, famOnward=null, famTrails=null, famShip=null, famShipInner=null;
let famFilter={aboard:true, st_roch45:true, sled:true, nascopie:true, est:true};

function famIso(s){ const p=s.split('-'); return Date.UTC(+p[0],(+p[1])-1,+p[2]); }
function famDate(ms){ const d=new Date(ms); return d.getUTCDate()+' '+MONTHS[d.getUTCMonth()]+' '+d.getUTCFullYear(); }
function famMY(ms){ const d=new Date(ms); return MONTHS[d.getUTCMonth()]+' '+d.getUTCFullYear(); }
function famKeyOf(nd){ return nd.mode==='sled' ? 'sled' : (nd.vessel==='nascopie' ? 'nascopie' : 'st_roch_1945'); }
function famColorOf(key){ return FAM.colors[key] || FAM.colors.st_roch; }
function famCatOf(key){ return key==='st_roch'?'aboard':(key==='st_roch_1945'?'st_roch45':key); }
function famBoat(col){ return '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 2 L19 20 L12 16 L5 20 Z" fill="'+col+'" stroke="#160d12" stroke-width="1.5" stroke-linejoin="round"/></svg>'; }
function famSledSvg(col){ return '<svg viewBox="0 0 26 26" width="26" height="26"><g stroke="#160d12" stroke-width="1.4" stroke-linecap="round" fill="none"><circle cx="6" cy="8" r="2" fill="'+col+'"/><circle cx="11" cy="8" r="2" fill="'+col+'"/><circle cx="16" cy="8" r="2" fill="'+col+'"/><rect x="6.5" y="14" width="13" height="3.6" rx="1.1" fill="'+col+'"/><path d="M5.5 19 h15 M9 18 v1.6 M18 18 v1.6"/></g></svg>'; }
function famIcon(key){ const col=famColorOf(key); const svg=key==='sled'?famSledSvg(col):famBoat(col); return L.divIcon({className:'fam-ship-div',html:'<div class="fam-ship-inner">'+svg+'</div>',iconSize:[30,30],iconAnchor:[15,15]}); }
function famEnsureShip(key){ if(!famShip){ famShip=L.marker([FAM.aboard.geom[0][0],FAM.aboard.geom[0][1]],{interactive:false,zIndexOffset:1200,icon:famIcon(key)}); famShipKey=key; } if(!map.hasLayer(famShip)) famShip.addTo(map); const e=famShip.getElement&&famShip.getElement(); famShipInner=e?e.querySelector('.fam-ship-inner'):null; }
function famSetKey(key){ if(key!==famShipKey){ famShipKey=key; famShip.setIcon(famIcon(key)); const e=famShip.getElement(); famShipInner=e?e.querySelector('.fam-ship-inner'):null; } }
function famShowLogCard(s){
  document.getElementById('lc-dot').style.background=famColorOf(s.key);
  document.getElementById('lc-eb-text').textContent=(s.approx?'Estimated  \u00b7  ':'')+s.phase+(s.n?'  \u00b7  Stop '+s.n:'');
  document.getElementById('lc-place').textContent=s.place;
  document.getElementById('lc-date').textContent=famDate(s.dateMs);
  document.getElementById('lc-coord').textContent=fmtCoord(s.lat,s.lng);
  const d=document.getElementById('lc-desc'); d.innerHTML=''; d.append(el('p',null,s.note||''));
  d.scrollTop=0; flashCard();
}

function famBuildTimeline(){
  famSegs=[]; famStops=[]; if(!FAM){ famTotalT=0; return; }
  const TRAVEL=58000, HERSCHEL=6000, CAMB=5000, OTHER=1700;
  const phases=[]; const ab=FAM.aboard;
  phases.push({kind:'travel',geom:ab.geom.slice(),key:'st_roch',dStart:famIso(ab.startDate),dEnd:famIso(ab.endDate),aboard:true});
  let prev=ab.geom[ab.geom.length-1]; const home=FAM.home;
  for(let i=0;i<home.length;i++){ const nd=home[i];
    if(i>0){ const seg=[prev].concat((nd.via||[]),[[nd.lat,nd.lng]]); const dS=home[i-1].dwellTo?famIso(home[i-1].dwellTo):famIso(home[i-1].date); phases.push({kind:'travel',geom:seg,key:famKeyOf(nd),dStart:dS,dEnd:famIso(nd.date)}); }
    if(nd.dwellTo){ const wk=nd.place.indexOf('Herschel')>=0?'herschel':(nd.place.indexOf('Cambridge')>=0?'camb':'other'); phases.push({kind:'dwell',pos:[nd.lat,nd.lng],key:famKeyOf(nd),dStart:famIso(nd.date),dEnd:famIso(nd.dwellTo),dwellKind:wk}); }
    prev=[nd.lat,nd.lng];
  }
  let totalLen=0; phases.forEach(function(p){ if(p.kind==='travel'){ const c=[0]; for(let i=1;i<p.geom.length;i++) c.push(c[i-1]+hav(p.geom[i-1],p.geom[i])); p.cum=c; p.len=c[c.length-1]; totalLen+=p.len; } });
  let t=0; phases.forEach(function(p){ if(p.kind==='travel') p.dur=Math.max(1500, TRAVEL*(p.len/(totalLen||1))); else p.dur=p.dwellKind==='herschel'?HERSCHEL:(p.dwellKind==='camb'?CAMB:OTHER); p.t0=t; t+=p.dur; famSegs.push(p); });
  famTotalT=t;
  const abSeg=famSegs[0];
  (ab.stops||[]).forEach(function(s){ let best=1e18,bi=0; for(let i=0;i<ab.geom.length;i++){ const d=hav([s.lat,s.lng],ab.geom[i]); if(d<best){best=d;bi=i;} } const frac=abSeg.len>0?abSeg.cum[bi]/abSeg.len:0; famStops.push({t:abSeg.t0+frac*abSeg.dur,n:s.n,key:'st_roch',event:s.event,lat:s.lat,lng:s.lng,place:s.place,title:s.title,note:s.note,dateMs:famIso(s.date),phase:'Aboard the St. Roch \u00b7 1944',approx:false}); });
  let ti=0; for(let k=0;k<famSegs.length;k++){ const p=famSegs[k]; if(p.kind==='travel'&&!p.aboard){ ti++; const node=home[ti]; if(node) famStops.push({t:p.t0+p.dur,n:node.n,key:famKeyOf(node),event:node.event,lat:node.lat,lng:node.lng,place:node.place,title:node.title,note:node.note,dateMs:famIso(node.date),phase:node.phase,approx:!!node.approx}); } }
  famStops.sort(function(a,b){ return a.t-b.t; });
}
function famSegAt(t){ let res=0; for(let i=0;i<famSegs.length;i++){ if(famSegs[i].t0<=t) res=i; else break; } return res; }
function famPosAt(seg, local){ if(seg.kind==='dwell') return {ll:seg.pos, brg:0}; const target=local*seg.len, cum=seg.cum, pts=seg.geom; let i=1; while(i<cum.length && cum[i]<target) i++; if(i>=pts.length){ const a=pts[pts.length-2]||pts[0], b=pts[pts.length-1]; return {ll:b, brg:bearing(a,b)}; } const a=pts[i-1], b=pts[i], s=(cum[i]-cum[i-1])||1, f=(target-cum[i-1])/s; return {ll:[a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f], brg:bearing(a,b)}; }
function famStateAt(t){ t=Math.max(0,Math.min(t,famTotalT)); const si=famSegAt(t), seg=famSegs[si]; const local=seg.dur>0?Math.max(0,Math.min((t-seg.t0)/seg.dur,1)):1; const pos=famPosAt(seg, local); const dateMs=seg.dStart+(seg.dEnd-seg.dStart)*local; let reached=-1; for(let i=0;i<famStops.length;i++){ if(famStops[i].t<=t+1) reached=i; } return {ll:pos.ll, brg:pos.brg, dateMs:dateMs, key:seg.key, kind:seg.kind, dwellKind:seg.dwellKind, local:local, reached:reached}; }
function famPaintTrail(t){ const acc={}; FAM_KEYS.forEach(function(k){acc[k]=[];}); for(let k=0;k<famSegs.length;k++){ const seg=famSegs[k]; if(seg.kind!=='travel') continue; const arr=acc[seg.key]; if(t>=seg.t0+seg.dur){ for(let q=0;q<seg.geom.length;q++) arr.push(seg.geom[q]); } else if(t>seg.t0){ const local=(t-seg.t0)/seg.dur, target=local*seg.len; arr.push(seg.geom[0]); let i=1; while(i<seg.cum.length && seg.cum[i]<target){ arr.push(seg.geom[i]); i++; } arr.push(famPosAt(seg, local).ll); break; } else break; } FAM_KEYS.forEach(function(k){ famTrails[k].setLatLngs(acc[k]); }); }
function famRevealUpTo(idx){ if(idx===famLastReached) return; famLastReached=idx; famStopMarkers.forEach(function(m,i){ if(!m) return; if(i<=idx){ if(!map.hasLayer(m)) m.addTo(map); } else { if(map.hasLayer(m)) map.removeLayer(m); } }); famTiEls.forEach(function(e,i){ if(e) e.classList.toggle('active', i===idx); }); }
function famRenderFrame(t){
  const st=famStateAt(t);
  famEnsureShip(st.key); famSetKey(st.key);
  famShip.setLatLng(st.ll);
  if(famShipInner){ famShipInner.style.transform = (st.kind==='travel' && st.key!=='sled') ? 'rotate('+st.brg+'deg)' : 'rotate(0deg)'; }
  famPaintTrail(t);
  if(IS_DETAIL){
    if(detailFollow && !userZooming){
      if(_detailZoomed){ map.panTo(st.ll,{animate:false}); }
      else { map.setView(st.ll, DETAIL_Z, {animate:false}); _detailZoomed=true; }
    }
  }
  else if(!reduceMotion && familyMode && !userZooming && !famSuppressFollow){ map.panTo(st.ll,{animate:false}); }
  famRevealUpTo(st.reached);
  if(st.reached>=0 && st.reached!==famLastCardIdx){ famLastCardIdx=st.reached; famShowLogCard(famStops[st.reached]); }
  let small;
  if(st.kind==='dwell' && st.dwellKind==='herschel') small='Wintering alone at Herschel \u2014 the St. Roch has sailed on';
  else if(st.kind==='dwell' && st.dwellKind==='camb') small='A second winter at Cambridge Bay';
  else { const cs=(st.reached>=0?famStops[st.reached]:null); const m=st.key==='sled'?'By dog sled':(st.key==='nascopie'?'Aboard the Nascopie':'Aboard the St. Roch'); small=m+(cs?' \u00b7 '+cs.title:''); }
  setReadout(famDate(st.dateMs), small);
  if(famTime) famTime.textContent=famMY(st.dateMs);
  if(famScrub && !famScrubbing) famScrub.value=Math.round((t/(famTotalT||1))*1000);
  if(IS_MASTER) broadcastFrame('family', t, famPlaying);
}
function famDrawFull(){ if(famFull) famFull.clearLayers(); else famFull=L.layerGroup(); famSegs.forEach(function(p){ if(p.kind!=='travel') return; const col=famColorOf(p.key); const opts=p.key==='sled'?{color:col,weight:3.6,opacity:.95,dashArray:'5 7'}:{color:col,weight:4,opacity:.95}; const pl=L.polyline(p.geom,opts); pl.on('click', function(e){ if(famEditing){ L.DomEvent.stop(e); famAddViaAt(e.latlng); } }); pl.addTo(famFull); }); }
function famVisible(s){ const cat=famCatOf(s.key); if(famFilter[cat]===false) return false; if(s.approx && famFilter.est===false) return false; return true; }
function famBuildMarkers(){
  famStopMarkers=famStops.map(function(s){ const est=s.approx?' n-est':''; const evt=s.event?' evt':''; const m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:'fam-div',html:'<div class="fam-num n-'+s.key+est+evt+'">'+(s.n||'')+'</div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:s.event?560:520}); m.on('click', function(){ if(famEditing) return; famShowLogCard(s); }); return m; });
  const cSled=FAM.colors.sled;
  famSideMarkers=(FAM.side||[]).map(function(s){ const grp=L.layerGroup(); if(s.trip&&s.trip.length>1) L.polyline(s.trip,{color:cSled,weight:2.4,opacity:.7,dashArray:'3 6'}).addTo(grp); L.circleMarker([s.lat,s.lng],{radius:6,color:cSled,weight:1.4,opacity:.85,fillColor:cSled,fillOpacity:.5}).on('click',function(){ famShowLogCard({key:'sled',approx:true,phase:s.phase,n:null,place:s.place,title:s.title,note:s.note,dateMs:famIso('1945-02-01'),lat:s.lat,lng:s.lng}); }).addTo(grp); return grp; });
  famBuildTimelineUI();
}
function famBuildTimelineUI(){ const c=document.getElementById('famtimeline'); if(!c) return; c.innerHTML=''; famTiEls=[]; famStops.forEach(function(s,i){ const it=el('div','fam-ti'); const num=el('div','fam-ti-num k-'+s.key+(s.approx?' k-est':''), String(s.n||'')); const body=el('div','fam-ti-body'); body.appendChild(el('div','fam-ti-ttl', s.title)); body.appendChild(el('div','fam-ti-place', s.place)); body.appendChild(el('div','fam-ti-date', s.phase)); it.appendChild(num); it.appendChild(body); it.addEventListener('click', function(){ famSelectStop(i); }); c.appendChild(it); famTiEls.push(it); }); }
function famBuildFilterUI(){ const c=document.getElementById('famfilter'); if(!c||c.childNodes.length) return; const defs=[['aboard',"Aboard '44",FAM.colors.st_roch],['st_roch45',"Carried west '45",FAM.colors.st_roch_1945],['sled','Dog sled',FAM.colors.sled],['nascopie','Nascopie',FAM.colors.nascopie],['est','Estimated','#cfd9df']]; defs.forEach(function(d){ const b=el('button','famchip on'); const dot=el('span','cdot'); dot.style.background=d[2]; if(d[0]==='est'){ dot.style.background='transparent'; dot.style.border='1.5px dashed '+d[2]; } b.appendChild(dot); b.appendChild(el('span',null,d[1])); b.addEventListener('click', function(){ famFilter[d[0]]=!famFilter[d[0]]; b.classList.toggle('on', famFilter[d[0]]); famApplyFilter(); }); c.appendChild(b); }); }
function famApplyFilter(){ if(famPlaying||famEditing) return; famStopMarkers.forEach(function(m,i){ if(!m) return; const vis=famVisible(famStops[i]); if(vis){ if(!map.hasLayer(m)) m.addTo(map); } else { if(map.hasLayer(m)) map.removeLayer(m); } }); }
function famSelectStop(i){ const s=famStops[i]; if(famEditing) return; if(famPlaying) famPause(); famShowStatic(); map.setView([s.lat,s.lng], Math.max(map.getZoom(),5), {animate:true}); famShowLogCard(s); if(famStopMarkers[i]&&!map.hasLayer(famStopMarkers[i])) famStopMarkers[i].addTo(map); famTiEls.forEach(function(e,j){ if(e) e.classList.toggle('active', j===i); }); }
function famBuildLayers(){
  if(famBuilt) return; famBuilt=true; famBuildTimeline();
  famDrawFull();
  if(FAM.shipOnward && FAM.shipOnward.length) famOnward=L.polyline(FAM.shipOnward,{color:'#8298a5',weight:2,opacity:.34,dashArray:'2 6'});
  famTrails={}; FAM_KEYS.forEach(function(k){ const o=k==='sled'?{color:famColorOf(k),weight:3.6,opacity:.97,dashArray:'5 7'}:{color:famColorOf(k),weight:4,opacity:.97}; famTrails[k]=L.polyline([],o); });
  famBuildMarkers(); famBuildFilterUI();
}
function famBoundsAll(){ const pts=(FAM.aboard.geom||[]).slice(); (FAM.home||[]).forEach(function(p){ pts.push([p.lat,p.lng]); (p.via||[]).forEach(function(v){pts.push(v);}); }); return pts.length?L.latLngBounds(pts):bounds; }
function famTrailLayers(){ return famTrails?FAM_KEYS.map(function(k){return famTrails[k];}):[]; }
function famShowStatic(){ famEngaged=false; famTrailLayers().concat([famShip]).forEach(function(l){ if(l&&map.hasLayer(l)) map.removeLayer(l); }); if(famOnward&&!map.hasLayer(famOnward)) famOnward.addTo(map); if(famFull&&!map.hasLayer(famFull)) famFull.addTo(map); if(!famEditing){ famStopMarkers.forEach(function(m,i){ if(m&&famVisible(famStops[i])&&!map.hasLayer(m)) m.addTo(map); }); famSideMarkers.forEach(function(g){ if(!map.hasLayer(g)) g.addTo(map); }); } }
function famShowPlay(){ if(famEngaged) return; famEngaged=true; if(famFull&&map.hasLayer(famFull)) map.removeLayer(famFull); famStopMarkers.forEach(function(m){ if(m&&map.hasLayer(m)) map.removeLayer(m); }); famSideMarkers.forEach(function(g){ if(map.hasLayer(g)) map.removeLayer(g); }); if(famOnward&&!map.hasLayer(famOnward)) famOnward.addTo(map); famTrailLayers().forEach(function(l){ if(!map.hasLayer(l)) l.addTo(map); }); famEnsureShip('st_roch'); famLastReached=-2; famLastCardIdx=-2; }
function famSetPlayUI(p){ if(famPlayBtn) famPlayBtn.innerHTML=p?'\u23f8':'\u25b6'; }
function famPlayStart(){ if(famEditing) return; if(famCurT>=famTotalT) famCurT=0; famShowPlay(); famPlaying=true; famLastTs=0; famSetPlayUI(true); famRenderFrame(famCurT); famRaf=requestAnimationFrame(famTick); }
function famPause(){ famPlaying=false; if(famRaf) cancelAnimationFrame(famRaf); famRaf=null; famSetPlayUI(false); if(IS_MASTER) syncSend({type:'frame', mode:'family', t:famCurT, playing:false}); }
function famTogglePlay(){ if(famPlaying) famPause(); else famPlayStart(); }
function famTick(ts){ if(!famPlaying) return; if(!famLastTs) famLastTs=ts; const dt=(ts-famLastTs)*speedMul; famLastTs=ts; famCurT+=dt; if(famCurT>=famTotalT){ famCurT=famTotalT; famRenderFrame(famCurT); famPause(); return; } famRenderFrame(famCurT); famRaf=requestAnimationFrame(famTick); }
function famSeek(t){ if(famEditing) return; famShowPlay(); famCurT=Math.max(0,Math.min(t,famTotalT)); famRenderFrame(famCurT); if(famPlaying) famLastTs=0; }
function famStep(dir){ const r=famStateAt(famCurT).reached; const target=Math.max(0,Math.min(famStops.length-1,(r<0?0:r)+dir)); famSeek(famStops[target].t+1); voyageStopPos[3]=target; }

/* Advance timeline linearly during goToStop, skipping dwell segments (winter
   pauses) so movement matches the ship voyages — icon moves only while travelling. */
function famAdvanceGoTo(cur, dt, dir, endT){
  let t=cur, budget=dt;
  while(budget>0 && ((dir>0 && t<endT) || (dir<0 && t>endT))){
    const seg=famSegs[famSegAt(t)];
    if(seg.kind==='dwell'){
      t=dir>0 ? Math.min(seg.t0+seg.dur, endT) : Math.max(seg.t0, endT);
      continue;
    }
    const limit=dir>0 ? Math.min(seg.t0+seg.dur, endT) : Math.max(seg.t0, endT);
    const step=Math.min(budget, Math.abs(limit-t));
    t+=dir*step;
    budget-=step;
  }
  return dir>0 ? Math.min(t, endT) : Math.max(t, endT);
}

let famGoRaf=null;
function goToFamilyStop(idx, speed){
  if(famEditing) return;
  famBuildLayers();
  idx=Math.max(0, Math.min(famStops.length-1, Math.round(Number(idx)||0)));
  voyageStopPos[3]=idx;
  const spd=(Number(speed)>0)?Number(speed):1;
  famPause();
  if(famGoRaf){ cancelAnimationFrame(famGoRaf); famGoRaf=null; }
  famShowPlay();
  const st0=famStateAt(famCurT);
  const followZ=IS_DETAIL?DETAIL_Z:FOLLOW_Z;
  if(IS_DETAIL){ _detailZoomed=false; map.setView(st0.ll, followZ, {animate:false}); _detailZoomed=true; }
  else { map.setView(st0.ll, followZ, {animate:false}); }
  const startT=famCurT, endT=famStops[idx].t+1;
  const fromIdx=Math.max(0, famStateAt(famCurT).reached);
  if(Math.abs(idx-fromIdx)>2){
    const DUR=2000/spd;
    const ease=function(x){ return x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2; };
    famSuppressFollow=true;
    if(!reduceMotion) map.setView([famStops[idx].lat,famStops[idx].lng], followZ, {animate:true, duration:DUR/1000});
    let s0=null;
    function step(ts){
      if(s0===null) s0=ts;
      const p=Math.min((ts-s0)/DUR,1);
      famCurT=startT+(endT-startT)*ease(p);
      famRenderFrame(famCurT);
      if(p<1){ famGoRaf=requestAnimationFrame(step); }
      else { famGoRaf=null; famCurT=endT; famRenderFrame(famCurT); famSuppressFollow=false; }
    }
    famGoRaf=requestAnimationFrame(step);
  } else {
    const dir=endT>=startT?1:-1;
    let lt=0;
    function step(ts){
      if(!lt) lt=ts;
      const dt=(ts-lt)*speedMul*spd; lt=ts;
      famCurT=famAdvanceGoTo(famCurT, dt, dir, endT);
      if((dir>0 && famCurT>=endT) || (dir<0 && famCurT<=endT)){ famCurT=endT; famRenderFrame(famCurT); famGoRaf=null; return; }
      famRenderFrame(famCurT);
      famGoRaf=requestAnimationFrame(step);
    }
    famGoRaf=requestAnimationFrame(step);
  }
}
window.goToFamilyStop=goToFamilyStop;

/* ---- family editor ---- */
function famRefreshJSON(){ if(famjsonEl) famjsonEl.value=famExportJSON(); }
function famExportJSON(){ return JSON.stringify({family_home: FAM.home.map(function(n){ const o={place:n.place,lat:Math.round(n.lat*1e5)/1e5,lng:Math.round(n.lng*1e5)/1e5,mode:n.mode,vessel:n.vessel,date:n.date,approx:n.approx,via:(n.via||[]).map(function(v){return [Math.round(v[0]*1e5)/1e5,Math.round(v[1]*1e5)/1e5];})}; if(n.dwellTo)o.dwellTo=n.dwellTo; return o; })}); }
function famRedrawLines(){ famBuildTimeline(); famDrawFull(); if(famFull && !map.hasLayer(famFull)) famFull.addTo(map); }
function famClearHandles(){ famHandles.forEach(function(m){ if(map.hasLayer(m)) map.removeLayer(m); }); famHandles=[]; }
function famBuildHandles(){ famClearHandles(); if(!famEditing || map.getZoom()<4) return; const b=map.getBounds().pad(0.25);
  FAM.home.forEach(function(nd){ const nl=L.latLng(nd.lat,nd.lng); if(b.contains(nl)){ const hm=L.marker(nl,{draggable:true,zIndexOffset:720,icon:L.divIcon({className:'fam-h-wrap',html:'<div class="fam-h-node"></div>',iconSize:[16,16],iconAnchor:[8,8]})}); (function(node){ hm.on('drag',function(e){ const p=e.target.getLatLng(); node.lat=p.lat; node.lng=p.lng; famRedrawLines(); }); hm.on('dragend',function(){ famRefreshJSON(); }); })(nd); hm.addTo(map); famHandles.push(hm); }
    (nd.via||[]).forEach(function(v,k){ const vl=L.latLng(v[0],v[1]); if(!b.contains(vl)) return; const hm=L.marker(vl,{draggable:true,zIndexOffset:700,icon:L.divIcon({className:'fam-h-wrap',html:'<div class="fam-h-via"></div>',iconSize:[14,14],iconAnchor:[7,7]})}); (function(node,ki){ hm.on('drag',function(e){ const p=e.target.getLatLng(); node.via[ki][0]=p.lat; node.via[ki][1]=p.lng; famRedrawLines(); }); hm.on('dragend',function(){ famRefreshJSON(); }); hm.on('dblclick',function(e){ L.DomEvent.stop(e); node.via.splice(ki,1); famRedrawLines(); famBuildHandles(); famRefreshJSON(); }); })(nd,k); hm.addTo(map); famHandles.push(hm); });
  });
}
function famAddViaAt(latlng){ let best=null; const P=map.latLngToLayerPoint(latlng); for(let i=1;i<FAM.home.length;i++){ const nd=FAM.home[i]; const pts=[[FAM.home[i-1].lat,FAM.home[i-1].lng]].concat(nd.via||[],[[nd.lat,nd.lng]]); for(let j=0;j<pts.length-1;j++){ const a=map.latLngToLayerPoint(L.latLng(pts[j][0],pts[j][1])); const c=map.latLngToLayerPoint(L.latLng(pts[j+1][0],pts[j+1][1])); const d=L.LineUtil.pointToSegmentDistance(P,a,c); if(best===null||d<best.d){ best={d:d,i:i,j:j}; } } } if(!best || best.d>24) return; FAM.home[best.i].via.splice(best.j,0,[latlng.lat,latlng.lng]); famRedrawLines(); famBuildHandles(); famRefreshJSON(); }
function famEnterEdit(){ if(!familyMode) return; if(famPlaying) famPause(); famEditing=true; document.body.classList.add('familyedit'); famStopMarkers.forEach(function(m){ if(m&&map.hasLayer(m)) map.removeLayer(m); }); famSideMarkers.forEach(function(g){ if(map.hasLayer(g)) map.removeLayer(g); }); famShowStatic(); const fp=document.getElementById('fampanel'); if(fp) fp.classList.add('show'); famRefreshJSON(); famBuildHandles(); }
function famExitEdit(){ famEditing=false; document.body.classList.remove('familyedit'); const fp=document.getElementById('fampanel'); if(fp) fp.classList.remove('show'); famClearHandles(); famTrailLayers().concat([famFull,famOnward,famShip]).forEach(function(l){ if(l&&map.hasLayer(l)) map.removeLayer(l); }); famStopMarkers.forEach(function(m){ if(m&&map.hasLayer(m)) map.removeLayer(m); }); famSideMarkers.forEach(function(g){ if(map.hasLayer(g)) map.removeLayer(g); }); famBuilt=false; famBuildLayers(); famShowStatic(); }

function enterFamily(){
  if(typeof editing!=='undefined' && editing) exitEdit();
  resetPlayback();
  familyMode=true; document.body.classList.add('familymode');
  routeLayers.forEach(function(r){ r.core.setStyle({opacity:.16}); r.casing.setStyle({opacity:.10}); });
  hideLogCard(); famBuildLayers();
  famCurT=0; famPlaying=false; famEngaged=false; famLastReached=-2; famLastCardIdx=-2; famSetPlayUI(false);
  if(famScrub) famScrub.value=0; if(famTime) famTime.textContent=famMY(famIso(FAM.aboard.startDate));
  famShowStatic();
  if(!IS_DETAIL) map.fitBounds(famBoundsAll(),{padding:[60,60]});
  setReadout('1944\u20131946','The Panikpakuttuk family \u2014 press play, or tap a numbered stop');
  if(IS_MASTER) syncSend({type:'frame', mode:'family', t:famCurT, playing:false});   // tell the detail screen to switch to the family journey
}
function exitFamily(){
  if(famEditing) famExitEdit();
  familyMode=false; famPlaying=false; if(famRaf) cancelAnimationFrame(famRaf); famRaf=null;
  document.body.classList.remove('familymode');
  famTrailLayers().concat([famFull,famOnward,famShip]).forEach(function(l){ if(l&&map.hasLayer(l)) map.removeLayer(l); });
  famStopMarkers.forEach(function(m){ if(m&&map.hasLayer(m)) map.removeLayer(m); });
  famSideMarkers.forEach(function(g){ if(map.hasLayer(g)) map.removeLayer(g); });
  famEngaged=false; famLastReached=-2;
  routeLayers.forEach(function(r){ r.core.setStyle({opacity:.95}); r.casing.setStyle({opacity:.7}); });
  YRS.forEach(function(y){ yearOn[y]=true; });
  showFullRoute(); applyMarkerFilter(); hideLogCard();
  if(readoutEl2) readoutEl2.classList.remove('show');
  if(!IS_DETAIL) map.fitBounds(bounds,{padding:[44,44]});
  if(IS_MASTER) syncSend({type:'frame', mode:'stroch', t:curT, playing:false});   // tell the detail screen to return to the St. Roch voyage
  clearJourneySelect();
}

/* ----- map journey selector (upper-right) ----- */
let activeJourney=null;
function syncJourneyUI(mode){
  [['journeyOutbound','outbound'],['journeyReturn','return'],['journeyFamily','family']].forEach(function(pair){
    const btn=document.getElementById(pair[0]);
    if(!btn) return;
    const on=mode===pair[1];
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on?'true':'false');
  });
}
function clearJourneySelect(){ activeJourney=null; syncJourneyUI(null); }
function selectJourney(mode){
  if(mode===activeJourney) return;
  famOverlayOn=false; famOverlayChip();
  if(mode==='family'){
    activeJourney='family';
    syncJourneyUI('family');
    if(!familyMode) enterFamily();
    syncGoVoyageInput(3);
    return;
  }
  if(familyMode) exitFamily();
  activeJourney=mode;
  syncJourneyUI(mode);
  if(mode==='outbound') setYearPreset(['1940','1941','1942']);
  else if(mode==='return') setYearPreset(['1944']);
  syncGoVoyageInput(journeyNum(mode));
}
function syncGoVoyageInput(v){ const el=document.getElementById('goVoyageInput'); if(el && v) el.value=String(v); }
function SelectJourney(n){
  const mode={1:'outbound',2:'return',3:'family'}[Math.round(Number(n))];
  if(mode) selectJourney(mode);
}
window.SelectJourney=SelectJourney;
(function(){
  if(IS_DETAIL) return;
  [['journeyOutbound','outbound'],['journeyReturn','return'],['journeyFamily','family']].forEach(function(pair){
    const btn=document.getElementById(pair[0]);
    if(!btn) return;
    btn.addEventListener('click', function(){ selectJourney(pair[1]); });
  });
})();
if(famEditBtn) famEditBtn.addEventListener('click',function(){ if(famEditing) famExitEdit(); else famEnterEdit(); });
if(famPlayBtn) famPlayBtn.addEventListener('click', famTogglePlay);
if(famPrevBtn) famPrevBtn.addEventListener('click',function(){ famStep(-1); });
if(famNextBtn) famNextBtn.addEventListener('click',function(){ famStep(1); });
if(famScrub){ famScrub.addEventListener('input',function(){ famScrubbing=true; famSeek((parseInt(famScrub.value,10)/1000)*famTotalT); }); famScrub.addEventListener('change',function(){ famScrubbing=false; if(famPlaying) famLastTs=0; }); famScrub.addEventListener('pointerup',function(){ famScrubbing=false; }); }
(function(){ const dn=document.getElementById('famEditDone'); if(dn) dn.addEventListener('click', famExitEdit);
  const dl=document.getElementById('famDownload'); if(dl) dl.addEventListener('click',function(){ try{ const blob=new Blob([famExportJSON()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='st_roch_family_points.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}catch(_){ } });
  const cp=document.getElementById('famCopy'); if(cp) cp.addEventListener('click',function(){ const txt=famExportJSON(); const old=cp.textContent; function done(){cp.textContent='Copied!';setTimeout(function(){cp.textContent=old;},1200);} if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,function(){famjsonEl.focus();famjsonEl.select();done();});}else{famjsonEl.focus();famjsonEl.select();try{document.execCommand('copy');}catch(_){ }done();} });
})();
map.on('click', function(e){ if(famEditing) famAddViaAt(e.latlng); });
map.on('moveend', function(){ if(famEditing) famBuildHandles(); });
map.on('zoomend', function(){ if(famEditing) famBuildHandles(); });

/* family highlight stats (rendered into the sidebar, shown only in family mode) */
(function(){ const c=document.getElementById('famstats'); if(!c||!FAM||!FAM.stats) return; FAM.stats.forEach(function(st){ const d=el('div','famstat'); const v=el('div','v'+(/[~,]/.test(st.value)?' mono':'')); v.textContent=st.value; d.append(v); d.append(el('div','l', st.label)); if(st.sub) d.append(el('div','s', st.sub)); c.append(d); }); })();

/* ===== full screen (map only) ===== */
const fsBtn=document.getElementById('fsBtn'), fsTarget=document.querySelector('.map-wrap');
function isFs(){ return document.fullscreenElement||document.webkitFullscreenElement; }
function toggleFs(){ try{ if(isFs()){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); } else { const t=fsTarget||document.documentElement; (t.requestFullscreen||t.webkitRequestFullscreen).call(t); } }catch(_){ } }
if(fsBtn) fsBtn.addEventListener('click', toggleFs);
document.addEventListener('fullscreenchange', function(){ const on=!!isFs(); if(fsBtn) fsBtn.classList.toggle('on', on); document.body.classList.toggle('isfs', on); setTimeout(function(){ map.invalidateSize(); }, 250); });

/* ===== welcome (button only) ===== */
const welcomeEl=document.getElementById('welcome'), welcomeScrim=document.getElementById('welcomeScrim');
function openWelcome(){ if(welcomeEl){ welcomeEl.classList.add('show'); if(welcomeScrim) welcomeScrim.classList.add('show'); } }
function closeWelcome(){ if(welcomeEl){ welcomeEl.classList.remove('show'); if(welcomeScrim) welcomeScrim.classList.remove('show'); } }
['welcomeBtn'].forEach(function(id){ const b=document.getElementById(id); if(b) b.addEventListener('click', openWelcome); });
['welcomeClose','welcomeStart'].forEach(function(id){ const b=document.getElementById(id); if(b) b.addEventListener('click', closeWelcome); });
if(welcomeScrim) welcomeScrim.addEventListener('click', closeWelcome);
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeWelcome(); });
/* ===== quick family-route overlay (toggle on the main map, like the year chips) ===== */
let famOverlayOn=false;
const famRouteBtn=document.getElementById('famRouteBtn');
function famOverlayChip(){ if(famRouteBtn) famRouteBtn.classList.toggle('on', famOverlayOn); }
function showFamilyOverlay(){ if(!FAM) return; resetPlayback(); famBuildLayers(); famOverlayOn=true; YRS.forEach(function(y){ yearOn[y]=false; }); applyMarkerFilter(); if(famFull&&!map.hasLayer(famFull)) famFull.addTo(map); if(famOnward&&!map.hasLayer(famOnward)) famOnward.addTo(map); famStopMarkers.forEach(function(m,i){ if(m&&famVisible(famStops[i])&&!map.hasLayer(m)) m.addTo(map); }); famSideMarkers.forEach(function(g){ if(!map.hasLayer(g)) g.addTo(map); }); famOverlayChip(); }
function hideFamilyOverlay(){ famOverlayOn=false; if(!familyMode && !famEditing){ if(famFull&&map.hasLayer(famFull)) map.removeLayer(famFull); if(famOnward&&map.hasLayer(famOnward)) map.removeLayer(famOnward); famStopMarkers.forEach(function(m){ if(m&&map.hasLayer(m)) map.removeLayer(m); }); famSideMarkers.forEach(function(g){ if(map.hasLayer(g)) map.removeLayer(g); }); YRS.forEach(function(y){ yearOn[y]=true; }); applyMarkerFilter(); } famOverlayChip(); }
function toggleFamilyOverlay(){ if(famOverlayOn) hideFamilyOverlay(); else showFamilyOverlay(); }
if(famRouteBtn) famRouteBtn.addEventListener('click', toggleFamilyOverlay);
