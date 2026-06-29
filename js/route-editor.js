/* ---------- route editor ---------- */
let editing=false, handleMarkers=[];
const editPanel=document.getElementById('editpanel');
const editBtn=document.getElementById('editBtn');
const editJsonEl=document.getElementById('editjson');
function flattenVoyage(v){ const out=[]; VOYAGE.voyages[v].legs.forEach(function(leg){ leg.forEach(function(p){ out.push(p); }); }); return out; }
function redrawRoute(v){ const f=flattenVoyage(v); routeLayers[v].core.setLatLngs(f); routeLayers[v].casing.setLatLngs(f); }
function exportJSON(){
  const out={};
  VOYAGE.voyages.forEach(function(voy){
    const o={};
    voy.legs.forEach(function(leg,j){ if(leg.length>2){ o[j]=leg.slice(1,-1).map(function(p){ return [Math.round(p[1]*1e5)/1e5, Math.round(p[0]*1e5)/1e5]; }); } });
    out[voy.id]=o;
  });
  return JSON.stringify(out);
}
function refreshEditJSON(){ if(editJsonEl) editJsonEl.value=exportJSON(); }
function clearHandles(){ handleMarkers.forEach(function(m){ map.removeLayer(m); }); handleMarkers=[]; }
function buildHandles(){
  clearHandles();
  if(!editing || map.getZoom()<5) return;
  const b=map.getBounds().pad(0.2);
  VOYAGE.voyages.forEach(function(voy,v){
    voy.legs.forEach(function(leg,j){
      for(let k=1;k<leg.length-1;k++){
        const ll=L.latLng(leg[k][0],leg[k][1]);
        if(!b.contains(ll)) continue;
        const m=L.marker(ll,{draggable:true,zIndexOffset:600,icon:L.divIcon({className:'via-handle-wrap',html:'<div class="via-handle"></div>',iconSize:[16,16],iconAnchor:[8,8]})});
        (function(legArr,idx,vi){
          m.on('drag',function(e){ const p=e.target.getLatLng(); legArr[idx][0]=p.lat; legArr[idx][1]=p.lng; redrawRoute(vi); });
          m.on('dragend',function(){ recomputeAll(); refreshEditJSON(); });
          m.on('dblclick',function(e){ L.DomEvent.stop(e); deleteVia(vi,j,idx); });
        })(leg,k,v);
        m.addTo(map); handleMarkers.push(m);
      }
    });
  });
}
function deleteVia(v,j,k){
  const leg=VOYAGE.voyages[v].legs[j];
  if(k<=0 || k>=leg.length-1) return;
  leg.splice(k,1);
  redrawRoute(v); recomputeAll(); buildHandles(); refreshEditJSON();
}
function nearestInsert(v,latlng){
  let best=null; const P=map.latLngToLayerPoint(latlng);
  VOYAGE.voyages[v].legs.forEach(function(leg,j){
    for(let i=0;i<leg.length-1;i++){
      const a=map.latLngToLayerPoint(L.latLng(leg[i][0],leg[i][1]));
      const c=map.latLngToLayerPoint(L.latLng(leg[i+1][0],leg[i+1][1]));
      const d=L.LineUtil.pointToSegmentDistance(P,a,c);
      if(best===null || d<best.d){ best={d:d,j:j,k:i+1}; }
    }
  });
  return best;
}
function addViaAt(v,latlng){
  const r=nearestInsert(v,latlng); if(!r) return;
  VOYAGE.voyages[v].legs[r.j].splice(r.k,0,[latlng.lat,latlng.lng]);
  redrawRoute(v); recomputeAll(); buildHandles(); refreshEditJSON();
}
routeLayers.forEach(function(rl,v){ rl.core.on('click',function(e){ if(!editing) return; L.DomEvent.stop(e); addViaAt(v,e.latlng); }); });
function enterEdit(){
  resetPlayback(); editing=true;
  document.body.classList.add('editing');
  editBtn.textContent='Exit editing';
  showFullRoute(); showAllMarkers();
  routeLayers.forEach(function(r){ r.core.setStyle({opacity:0.95}); });
  editPanel.classList.add('show');
  refreshEditJSON(); buildHandles();
}
function exitEdit(){
  editing=false;
  document.body.classList.remove('editing');
  editBtn.textContent='Edit route';
  clearHandles(); editPanel.classList.remove('show');
  recomputeAll(); redrawRoute(0); redrawRoute(1); applyMarkerFilter();
}
editBtn.addEventListener('click',function(){ if(editing) exitEdit(); else enterEdit(); });
map.on('moveend',function(){ if(editing) buildHandles(); });
map.on('zoomend',function(){ if(editing) buildHandles(); });
document.getElementById('epDone').addEventListener('click', exitEdit);
document.getElementById('epDownload').addEventListener('click',function(){
  try{ const blob=new Blob([exportJSON()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='st_roch_route_edits.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(a.href); },1000); }catch(_){ }
});
document.getElementById('epCopy').addEventListener('click',function(){
  const txt=exportJSON(); const btn=document.getElementById('epCopy'); const old=btn.textContent;
  function done(){ btn.textContent='Copied!'; setTimeout(function(){ btn.textContent=old; },1200); }
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done,function(){ editJsonEl.focus(); editJsonEl.select(); done(); }); }
  else { editJsonEl.focus(); editJsonEl.select(); try{ document.execCommand('copy'); }catch(_){ } done(); }
});
