const readoutEl=document.getElementById('readout');
const roDate=document.getElementById('ro-date');
const roStatus=document.getElementById('ro-status');
function setReadout(big,small){ roDate.textContent=big; roStatus.textContent=small; readoutEl.classList.add('show'); }
setReadout('1940 \u2013 1944','Select a stop, or fly both voyages');

const logcard=document.getElementById('logcard');
function flashCard(){ logcard.classList.add('show'); if(!reduceMotion){ logcard.classList.remove('flash'); void logcard.offsetWidth; logcard.classList.add('flash'); } }
function showLogCard(s){
  const voy=V.voyages[s._vi];
  document.getElementById('lc-dot').style.background=colorForStop(s);
  document.getElementById('lc-eb-text').textContent='Voyage '+voy.code+'  \u00b7  Stop '+s.n+'  \u00b7  '+(s.winterLabel?s.winterLabel:s.year);
  document.getElementById('lc-place').textContent=s.place;
  document.getElementById('lc-date').textContent=s.dateLabel;
  document.getElementById('lc-coord').textContent=fmtCoord(s.lat,s.lng);
  const d=document.getElementById('lc-desc'); d.innerHTML='';
  if(s.desc&&s.desc.length){ s.desc.forEach(function(p){ d.append(el('p',null,p)); }); }
  else d.append(el('p','lc-muted','Logged position on the voyage.'));
  d.scrollTop=0; flashCard();
}
function showTransitionCard(){
  document.getElementById('lc-dot').style.background=C.routeV2;
  document.getElementById('lc-eb-text').textContent='Between the voyages';
  document.getElementById('lc-place').textContent='Two years at Halifax';
  document.getElementById('lc-date').textContent='1942 \u2013 1944';
  document.getElementById('lc-coord').textContent='';
  const d=document.getElementById('lc-desc'); d.innerHTML='';
  d.append(el('p',null,'After reaching Halifax in October 1942, the St. Roch served on the east coast before setting out again in July 1944 \u2014 this time racing home to Vancouver through the deeper northern channels in a single season.'));
  d.scrollTop=0; flashCard();
}
function hideLogCard(){ logcard.classList.remove('show'); }
document.getElementById('logcardClose').addEventListener('click', hideLogCard);
(function(){
  let drag=null;
  logcard.addEventListener('pointerdown', function(e){
    if(e.target.closest('.lc-desc') || e.target.closest('.logcard-close')) return;
    const wrap=document.querySelector('.map-wrap').getBoundingClientRect();
    const r=logcard.getBoundingClientRect();
    drag={dx:e.clientX-r.left, dy:e.clientY-r.top};
    logcard.style.right='auto'; logcard.style.bottom='auto';
    logcard.style.left=(r.left-wrap.left)+'px'; logcard.style.top=(r.top-wrap.top)+'px';
    logcard.classList.add('dragging');
    try{ logcard.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  logcard.addEventListener('pointermove', function(e){
    if(!drag) return;
    const wrap=document.querySelector('.map-wrap').getBoundingClientRect();
    let x=e.clientX-drag.dx-wrap.left, y=e.clientY-drag.dy-wrap.top;
    x=Math.max(6, Math.min(x, wrap.width-logcard.offsetWidth-6));
    y=Math.max(6, Math.min(y, wrap.height-logcard.offsetHeight-6));
    logcard.style.left=x+'px'; logcard.style.top=y+'px';
  });
  function endDrag(e){ if(!drag) return; drag=null; logcard.classList.remove('dragging'); try{ logcard.releasePointerCapture(e.pointerId); }catch(_){} }
  logcard.addEventListener('pointerup', endDrag);
  logcard.addEventListener('pointercancel', endDrag);
})();
