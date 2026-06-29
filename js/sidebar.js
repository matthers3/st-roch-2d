const t=el('span'); t.innerHTML='St.&nbsp;<span class="ital">Roch</span><span class="title-fam">&amp; the Panikpakuttuk family</span>';
document.getElementById('title').appendChild(t);
document.getElementById('subtitle').textContent=V.meta.subtitle;
document.getElementById('daterange').textContent=V.meta.dateRange;
document.getElementById('blurb').textContent=V.meta.blurb;
const statsEl=document.getElementById('stats');
V.meta.stats.forEach(function(st){
  const d=el('div','stat');
  const v=el('div','v'+(/[~,]/.test(st.value)?' mono':'')); v.textContent=st.value; d.append(v);
  d.append(el('div','l', st.label));
  if(st.sub) d.append(el('div','s', st.sub));
  statsEl.append(d);
});
const legendEl=document.getElementById('legend');
const r1=el('div','legend-row'); r1.append(el('div','legend-label','Stops by year'));
[['1940','1940'],['1941','1941'],['1942','1942'],['1944','1944']].forEach(function(p){
  const g=el('span','lg'); const dot=el('span','dot'); dot.style.background=C.years[p[0]]; g.append(dot); g.append(el('span',null,p[1])); r1.append(g);
});
const wlg=el('span','lg'); wlg.append(el('span','fl','\u2744')); wlg.append(el('span',null,'Winter')); r1.append(wlg);
legendEl.append(r1);
const r2=el('div','legend-row'); r2.append(el('div','legend-label','Route'));
const o1=el('span','lg'); o1.append(el('span','ln')); o1.append(el('span',null,'1940\u201342 out')); r2.append(o1);
const o2=el('span','lg'); const ln2=el('span','ln'); ln2.classList.add('v2'); o2.append(ln2); o2.append(el('span',null,'1944 back')); r2.append(o2);
legendEl.append(r2);

/* Hide the left sidebar/menu bar on demand (element stays in the DOM and functional). */
function HideUI(){
  document.body.classList.add('ui-hidden');
  /* the map container just grew; let Leaflet recompute its size so the follow-cam re-centers correctly */
  setTimeout(function(){
    if(typeof map==='undefined' || !map) return;
    map.invalidateSize();
    if(typeof engaged!=='undefined' && engaged && typeof ship!=='undefined' && ship){ map.panTo(ship.getLatLng(), {animate:false}); }
  }, 60);
}
window.HideUI=HideUI;
