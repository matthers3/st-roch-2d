function hideAllMarkers(){ markers.forEach(function(m){ if(map.hasLayer(m)) map.removeLayer(m); }); }
function showAllMarkers(){ markers.forEach(function(m){ if(!map.hasLayer(m)) m.addTo(map); }); }
function revealMarker(gi){
  const m=markers[gi]; if(!map.hasLayer(m)) m.addTo(map);
  if(reduceMotion) return;
  const e=m.getElement(); if(!e) return;
  const mk=e.querySelector('.stop-marker'); if(!mk) return;
  mk.classList.remove('pop'); void mk.offsetWidth; mk.classList.add('pop');
}

let activeIdx=-1;
function scrollItemIntoView(gi){ const b=itemEls[gi]; if(b) b.scrollIntoView({block:'nearest', behavior: reduceMotion?'auto':'smooth'}); }
function selectStop(gi,opt){
  opt=opt||{};
  if(!opt.fromAnim){ if(familyMode) exitFamily(); if(engaged) resetPlayback(); else pause(); hideLogCard(); showAllMarkers(); }
  activeIdx=gi;
  itemEls.forEach(function(b,i){ if(b) b.classList.toggle('active', i===gi); });
  markers.forEach(function(m,i){ const e=m.getElement(); if(e) e.classList.toggle('is-active', i===gi); });
  const s=STOPS[gi];
  if(opt.fly){ map.flyTo([s.lat,s.lng], Math.max(map.getZoom(),6), {duration: reduceMotion?0:0.8}); }
  if(opt.openPopup){ markers[gi].openPopup(); }
  setReadout(s.dateLabel, s.winterLabel ? 'Frozen in \u00b7 '+s.winterLabel : 'Anchored \u00b7 '+s.place);
  scrollItemIntoView(gi);
  if(window.innerWidth<=820){ closeNav(); }
}

const SHIP_SVG='<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2 L19 20 L12 16 L5 20 Z" fill="'+C.routeV1+'" stroke="#0b1c25" stroke-width="1.5" stroke-linejoin="round"/></svg>';
function hav(a,b){ const R=6371,dLat=(b[0]-a[0])*Math.PI/180,dLon=(b[1]-a[1])*Math.PI/180,la1=a[0]*Math.PI/180,la2=b[0]*Math.PI/180; const h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)*Math.sin(dLon/2); return 2*R*Math.asin(Math.sqrt(h)); }
function bearing(a,b){ const dLon=(b[1]-a[1])*Math.PI/180,la1=a[0]*Math.PI/180,la2=b[0]*Math.PI/180; const y=Math.sin(dLon)*Math.cos(la2), x=Math.cos(la1)*Math.sin(la2)-Math.sin(la1)*Math.cos(la2)*Math.cos(dLon); return (Math.atan2(y,x)*180/Math.PI+360)%360; }

const legSeq=[];
V.voyages.forEach(function(voy,vi){
  if(vi>0){ const prev=V.voyages[vi-1]; const a=prev.stops[prev.stops.length-1], b=voy.stops[0]; legSeq.push({pts:[[a.lat,a.lng],[b.lat,b.lng]], vi:vi, isTransition:true}); }
  voy.legs.forEach(function(p){ legSeq.push({pts:p, vi:vi, isTransition:false}); });
});
const TOTAL_MS=78000, MINL=420, MAXL=5000, WINTER_MS=2200, TRANSITION_MS=3200, FOLLOW_Z=5;
let legMeta=[];
function recomputeLegMeta(){
  legMeta=legSeq.map(function(L0){
    const pts=L0.pts, cum=[0];
    for(let i=1;i<pts.length;i++) cum.push(cum[i-1]+hav(pts[i-1],pts[i]));
    return {pts:pts, cum:cum, len:cum[cum.length-1], vi:L0.vi, isTransition:L0.isTransition};
  });
  const tl=legMeta.reduce(function(a,l){ return a + (l.isTransition?0:l.len); }, 0);
  legMeta.forEach(function(l){ l.dur = l.isTransition ? 0 : Math.max(MINL, Math.min(MAXL, TOTAL_MS*(l.len/(tl||1)))); });
}
recomputeLegMeta();
function posOnLeg(l,t){
  const target=t*l.len, cum=l.cum, pts=l.pts;
  let i=1; while(i<cum.length && cum[i]<target) i++;
  if(i>=pts.length){ const a=pts[pts.length-2],b=pts[pts.length-1]; return {ll:b,brg:bearing(a,b)}; }
  const a=pts[i-1],b=pts[i], seg=(cum[i]-cum[i-1])||1, f=(target-cum[i-1])/seg;
  return {ll:[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f], brg:bearing(a,b)};
}

let ship=null, shipInner=null;
function ensureShip(){
  if(ship) return;
  ship=L.marker([STOPS[0].lat,STOPS[0].lng],{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'ship-div',html:'<div class="ship-inner">'+SHIP_SVG+'</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
  shipInner=ship.getElement().querySelector('.ship-inner');
}
function setShipColor(col){ const p=shipInner&&shipInner.querySelector('path'); if(p) p.setAttribute('fill',col); }
function showFullRoute(){
  voyTrails.forEach(function(tr){ if(map.hasLayer(tr.casing)) map.removeLayer(tr.casing); if(map.hasLayer(tr.core)) map.removeLayer(tr.core); });
  routeLayers.forEach(function(r){ if(!map.hasLayer(r.casing)) r.casing.addTo(map); if(!map.hasLayer(r.core)) r.core.addTo(map); });
}

/* ----- seekable timeline ----- */
let timeline=[], totalT=0, reachTimeArr=[];
function buildTimeline(){
  timeline=[]; let t=0; reachTimeArr=new Array(STOPS.length).fill(0);
  for(let i=0;i<legMeta.length;i++){
    const lm=legMeta[i];
    if(lm.isTransition){
      timeline.push({type:'pause', t0:t, dur:TRANSITION_MS, kind:'transition', ll:lm.pts[0], stopIdx:i, trailLeg:i-1});
      t+=TRANSITION_MS; if(i+1<reachTimeArr.length) reachTimeArr[i+1]=t;
    } else {
      timeline.push({type:'travel', t0:t, dur:lm.dur, legIndex:i, from:i, to:i+1});
      t+=lm.dur; if(i+1<reachTimeArr.length) reachTimeArr[i+1]=t;
      if(STOPS[i+1] && STOPS[i+1].year==='winter'){
        timeline.push({type:'pause', t0:t, dur:WINTER_MS, kind:'winter', ll:[STOPS[i+1].lat,STOPS[i+1].lng], stopIdx:i+1, trailLeg:i});
        t+=WINTER_MS;
      }
    }
  }
  totalT=t;
}
buildTimeline();
function recomputeAll(){ recomputeLegMeta(); buildTimeline(); }
function findSeg(t){ let lo=0,hi=timeline.length-1,res=0; while(lo<=hi){ const mid=(lo+hi)>>1; if(timeline[mid].t0<=t){ res=mid; lo=mid+1; } else hi=mid-1; } return res; }
function stateAt(t){
  t=Math.max(0,Math.min(t,totalT));
  const seg=timeline[findSeg(t)];
  if(seg.type==='travel'){
    const local=seg.dur>0?Math.max(0,Math.min((t-seg.t0)/seg.dur,1)):1;
    const lm=legMeta[seg.legIndex]; const p=posOnLeg(lm,local);
    const d0=STOPS[seg.from].dateMs, d1=STOPS[seg.to].dateMs;
    return {ll:p.ll, brg:p.brg, dateMs:d0+(d1-d0)*local, reached:seg.from, status:'Underway to '+STOPS[seg.to].place, vi:lm.vi, seg:seg, local:local};
  }
  if(seg.kind==='transition'){ return {ll:seg.ll, brg:0, dateMs:STOPS[seg.stopIdx].dateMs, reached:seg.stopIdx, status:'Two years at Halifax \u2014 then the return', vi:1, seg:seg, transition:true}; }
  const s=STOPS[seg.stopIdx];
  return {ll:[s.lat,s.lng], brg:0, dateMs:s.dateMs, reached:seg.stopIdx, status:'Frozen in \u00b7 '+(s.winterLabel||''), vi:s._vi, seg:seg, winter:true};
}
function paintTrail(seg, local, curll){
  let legIndex, lc;
  if(seg.type==='travel'){ legIndex=seg.legIndex; lc=local; } else { legIndex=seg.trailLeg; lc=1; }
  const byV=[[],[]];
  for(let k=0;k<legIndex;k++){ const lm=legMeta[k]; if(lm.isTransition) continue; const arr=byV[lm.vi]; for(let q=0;q<lm.pts.length;q++) arr.push(lm.pts[q]); }
  if(legIndex>=0){ const cur=legMeta[legIndex]; if(cur && !cur.isTransition){ const arr=byV[cur.vi], target=lc*cur.len; arr.push(cur.pts[0]); let i=1; while(i<cur.cum.length && cur.cum[i]<target){ arr.push(cur.pts[i]); i++; } arr.push(curll); } }
  voyTrails[0].core.setLatLngs(byV[0]); voyTrails[0].casing.setLatLngs(byV[0]);
  voyTrails[1].core.setLatLngs(byV[1]); voyTrails[1].casing.setLatLngs(byV[1]);
}
let lastReached=-1, lastCardKey='';
function updateReached(idx){
  if(idx===lastReached) return; lastReached=idx; activeIdx=idx;
  for(let i=0;i<markers.length;i++){ if(i<=idx){ if(!map.hasLayer(markers[i])) markers[i].addTo(map); } else { if(map.hasLayer(markers[i])) map.removeLayer(markers[i]); } }
  revealMarker(idx);
  itemEls.forEach(function(b,i){ if(!b) return; b.classList.toggle('active', i===idx); b.classList.toggle('reached', i<=idx); });
  markers.forEach(function(m,i){ const e=m.getElement(); if(e) e.classList.toggle('is-active', i===idx); });
  scrollItemIntoView(idx);
}
function updateCard(st){
  const key=st.transition?'transition':('s'+st.reached);
  if(key===lastCardKey) return; lastCardKey=key;
  if(st.transition) showTransitionCard(); else showLogCard(STOPS[st.reached]);
}

/* ----- transport / playback ----- */
let playing=false, engaged=false, raf=null, curT=0, lastTs=0, scrubbing=false;
const flyBtn=document.getElementById('flyBtn');
const flyLabel=flyBtn.querySelector('.fly-label');
const resetBtn=document.getElementById('resetBtn');
const tPlay=document.getElementById('tPlay'), tPrev=document.getElementById('tPrev'), tNext=document.getElementById('tNext'), tScrub=document.getElementById('tScrub'), tTime=document.getElementById('tTime');
function setPlayUI(p){
  if(tPlay){ tPlay.innerHTML = p?'\u23f8':'\u25b6'; tPlay.title=p?'Pause':'Play'; }
  flyBtn.classList.toggle('playing', p);
  flyLabel.textContent = p ? 'Pause voyages' : (curT>=totalT-1 ? 'Replay voyages' : (curT>0?'Resume voyages':'St.\u00a0Roch Northwest voyages'));
}
function engage(){
  if(engaged) return; engaged=true;
  document.body.classList.add('armed');
  ensureShip();
  routeLayers.forEach(function(r){ if(map.hasLayer(r.core)) map.removeLayer(r.core); if(map.hasLayer(r.casing)) map.removeLayer(r.casing); });
  voyTrails.forEach(function(tr){ tr.casing.setLatLngs([]); tr.core.setLatLngs([]); tr.casing.addTo(map); tr.core.addTo(map); });
  hideAllMarkers();
  lastReached=-1; lastCardKey='';
  if(window.innerWidth<=820) closeNav();
}
function disengage(){
  engaged=false; playing=false; if(raf) cancelAnimationFrame(raf); raf=null;
  document.body.classList.remove('armed');
  showFullRoute();
  if(ship){ map.removeLayer(ship); ship=null; shipInner=null; }
  curT=0; lastReached=-1; lastCardKey='';
  applyMarkerFilter(); hideLogCard();
  if(tScrub) tScrub.value=0; if(tTime) tTime.textContent='1940';
  setPlayUI(false);
  map.fitBounds(bounds,{padding:[44,44]});
}
function resetPlayback(){ disengage(); }
function renderFrame(t){
  const st=stateAt(t);
  ensureShip(); setShipColor(st.vi===0?C.routeV1:C.routeV2);
  ship.setLatLng(st.ll);
  if(shipInner && !st.winter && !st.transition) shipInner.style.transform='rotate('+st.brg+'deg)';
  paintTrail(st.seg, st.local||0, st.ll);
  if(IS_DETAIL){
    if(detailFollow && !userZooming){
      if(_detailZoomed){ map.panTo(st.ll,{animate:false}); }              // follow at the viewer's own zoom
      else { map.setView(st.ll, DETAIL_Z, {animate:false}); _detailZoomed=true; }   // initial zoom only
    }
  }
  else if(!reduceMotion && engaged && !userZooming){ map.panTo(st.ll,{animate:false}); }
  updateReached(st.reached); updateCard(st);
  if(st.transition){ setReadout('1942 \u2192 1944', st.status); } else { setReadout(fmtDate(st.dateMs), st.status); }
  if(tTime) tTime.textContent = st.transition ? '1942\u20131944' : fmtDate(st.dateMs);
  if(tScrub && !scrubbing) tScrub.value = Math.round((t/(totalT||1))*1000);
  if(IS_MASTER) broadcastFrame('stroch', t, playing);
}
function tick(ts){
  if(!playing) return;
  if(!lastTs) lastTs=ts;
  const dt=(ts-lastTs)*speedMul; lastTs=ts;
  curT+=dt;
  if(curT>=totalT){ curT=totalT; renderFrame(curT); pause(); return; }
  renderFrame(curT);
  raf=requestAnimationFrame(tick);
}
function play(){
  if(editing) return;
  const fresh = curT>=totalT || curT===0;
  if(curT>=totalT) curT=0;
  engage();
  if(fresh) map.setView([STOPS[0].lat,STOPS[0].lng], FOLLOW_Z, {animate:false});
  playing=true; lastTs=0; setPlayUI(true);
  renderFrame(curT);
  raf=requestAnimationFrame(tick);
}
function pause(){ playing=false; if(raf) cancelAnimationFrame(raf); raf=null; setPlayUI(false); if(IS_MASTER) syncSend({type:'frame', mode:'stroch', t:curT, playing:false}); }
function togglePlay(){ if(editing) return; if(playing) pause(); else play(); }
function seekTo(t){ engage(); curT=Math.max(0,Math.min(t,totalT)); renderFrame(curT); if(playing) lastTs=0; }
function stepStop(dir){ const r=Math.max(0,stateAt(curT).reached); const target=Math.max(0,Math.min(STOPS.length-1, r+dir)); seekTo(reachTimeArr[target]+0.001); }
flyBtn.addEventListener('click', togglePlay);
resetBtn.addEventListener('click', resetPlayback);
if(tPlay) tPlay.addEventListener('click', togglePlay);
if(tPrev) tPrev.addEventListener('click', function(){ stepStop(-1); });
if(tNext) tNext.addEventListener('click', function(){ stepStop(1); });
if(tScrub){
  tScrub.addEventListener('input', function(){ scrubbing=true; seekTo((parseInt(tScrub.value,10)/1000)*totalT); });
  tScrub.addEventListener('change', function(){ scrubbing=false; if(playing) lastTs=0; });
  tScrub.addEventListener('pointerup', function(){ scrubbing=false; });
}
setPlayUI(false);
