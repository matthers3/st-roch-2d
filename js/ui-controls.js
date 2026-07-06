/* ----- year filter ----- */
const YRS=['1940','1941','1942','1944'];
let yearOn={'1940':true,'1941':true,'1942':true,'1944':true};
const voyageYears=V.voyages.map(function(_,vi){ const set={}; STOPS.forEach(function(s){ if(s._vi===vi) set[s.year]=true; }); return set; });
function syncYearChips(){ const btns=document.querySelectorAll('.yfbtn'); if(!btns.length) return; const allOn=YRS.every(function(y){return yearOn[y];}); btns.forEach(function(b){ const y=b.getAttribute('data-year'); b.classList.toggle('on', y==='all'?allOn:!!yearOn[y]); }); }
function setYearPreset(years){
  resetPlayback();
  YRS.forEach(function(y){ yearOn[y]=years.indexOf(y)>=0; });
  applyMarkerFilter();
}
function applyMarkerFilter(){
  if(engaged) return;
  markers.forEach(function(m,i){ const s=STOPS[i]; const show=!!yearOn[s.year]; if(show){ if(!map.hasLayer(m)) m.addTo(map); } else { if(map.hasLayer(m)) map.removeLayer(m); } });
  routeLayers.forEach(function(r,vi){ const anyOn=Object.keys(voyageYears[vi]).some(function(y){ return yearOn[y]; }); r.core.setStyle({opacity:anyOn?0.95:0}); if(r.casing) r.casing.setStyle({opacity:anyOn?0.7:0}); });
  syncYearChips();
}

const scrim=document.getElementById('scrim'), modal=document.getElementById('modal');
function openNav(){ document.body.classList.add('nav-open'); scrim.classList.add('show'); }
function closeNav(){ document.body.classList.remove('nav-open'); if(!modal.classList.contains('show')) scrim.classList.remove('show'); }
document.getElementById('menuBtn').addEventListener('click', openNav);
function openModal(){
  document.getElementById('modalTitle').textContent='About this map';
  document.getElementById('modalSub').textContent=V.meta.ship+'  \u00b7  '+V.meta.dateRange;
  const body=document.getElementById('modalBody'); body.innerHTML='';
  V.meta.note.forEach(function(p){ body.append(el('p',null,p)); });
  scrim.classList.add('show'); modal.classList.add('show');
}
function closeModal(){ scrim.classList.remove('show'); modal.classList.remove('show'); }
document.getElementById('aboutLink').addEventListener('click', openModal);

/* ===== Panikpakuttuk family story (read-only narrative modal) ===== */
function openFamilyStory(){
  document.getElementById('modalTitle').textContent='The Panikpakuttuk family';
  document.getElementById('modalSub').textContent='Aboard the St. Roch in 1944 \u00b7 home in 1946';
  const body=document.getElementById('modalBody'); body.innerHTML='';
  const blocks=[
    {h:'Who they were'},
    {p:'In August 1944 the RCMP schooner St. Roch hired eight Inuit from Mittimatalik (Pond Inlet) for its record crossing of the Northwest Passage: Joe Panikpakuttuk, his mother Panikpak, his wife Ajaqquti, his stepson Arreak, three children and a young niece. They came aboard with ~17 dogs and a tent on the cargo hatch \u2014 hired only for rations, and recorded as \u201csecond class citizens.\u201d'},
    {h:'What they gave'},
    {p:'Joe\u2019s walrus hunts fed a ship whose canned food had failed. When fog left the captain lost at Prince of Wales Strait, the elder Panikpak read the coast against the chart and found the ship\u2019s position \u2014 \u201cdespite the disbelief of the crew.\u201d Their knowledge helped make the 1944 crossing possible.'},
    {h:'Left behind'},
    {p:'On 17 September 1944 the ship put the family ashore at deserted Herschel Island and sailed on to Vancouver to claim the record. They were never told how long they\u2019d be gone. \u201cHe left and we were alone there,\u201d Joe said. They wintered alone, hunting to survive.'},
    {h:'Carried the wrong way'},
    {p:'The St. Roch\u2019s 1945 Arctic patrol picked them up on 11 August 1945 \u2014 then ran east, not home, to a second winter at Cambridge Bay. That December the Polar Medal was recommended for the crew that had left Joe off its list, while his family wintered a few yards away.'},
    {h:'The long way home, 1946'},
    {p:'They finally went home by dog sled from Cambridge Bay on 22 April 1946, guided by Inuit, through storms, two days without food, Joe gravely ill, and a polar bear in camp. From Fort Ross the HBC ship Nascopie carried them the last stretch.'},
    {h:'Home, two years later'},
    {p:'They reached Pond Inlet in September 1946 \u2014 more than two years out of an \u201c86-day\u201d voyage. Their community had assumed them dead. Joe Panikpakuttuk is still the only Inuk ever awarded the Polar Medal \u2014 granted in 1974, after his death.'},
    {p:'This is a draft. All Inuit content is under the authority of the project\u2019s Inuit consultants and is not cleared for public use; quotations must be verified and attributed first.'},
  ]
  blocks.forEach(function(b){ if(b.h) body.append(el('h3','fs-h',b.h)); if(b.p) body.append(el('p',null,b.p)); });
  scrim.classList.add('show'); modal.classList.add('show');
}
(function(){ const b=document.getElementById('famStoryBtn'); if(b) b.addEventListener('click', openFamilyStory); })();
document.getElementById('modalClose').addEventListener('click', closeModal);
scrim.addEventListener('click',function(){ closeModal(); closeNav(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closeModal(); closeNav(); } });

/* ---------- replay speed ---------- */
let speedMul=1;
const speedSlider=document.getElementById('speedSlider');
const speedVal=document.getElementById('speedVal');
function setSpeedLabel(){ let s=speedMul.toFixed(2).replace(/0+$/,'').replace(/\.$/,''); speedVal.textContent=s+'\u00d7'; }
speedSlider.addEventListener('input',function(){ speedMul=parseFloat(speedSlider.value)||1; setSpeedLabel(); });
setSpeedLabel();
