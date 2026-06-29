const V = VOYAGE, C = V.colors;
/* ===== dual-screen sync (role + BroadcastChannel with localStorage fallback) =====
   ?role=detail  -> follower window: receives the ship position, locks to zoom 10, hides chrome.
   anything else -> overview/master: drives playback and broadcasts each frame.            */
const SYNC_KEY='stroch-sync-v1';
const TAB_ID=Math.random().toString(36).slice(2,9);
const ROLE=(new URLSearchParams(location.search)).get('role')==='detail'?'detail':'overview';
const IS_DETAIL=ROLE==='detail', IS_MASTER=!IS_DETAIL;
const DETAIL_Z=10;
let detailFollow=true;     // detail screen: keep the ship centred (toggled off when the viewer pans away)
let _detailZoomed=false;   // detail screen: apply the initial zoom 10 once, then respect the viewer's own zoom
document.body.classList.add('role-'+ROLE);
let _bc=null; try{ _bc=('BroadcastChannel' in window)?new BroadcastChannel(SYNC_KEY):null; }catch(_e){ _bc=null; }
let _seq=0, _lastSyncTs=0;
const _lastSeqFrom={};
function syncSend(msg){
  msg.seq=++_seq; msg.tab=TAB_ID; msg.role=ROLE;
  if(_bc){ try{ _bc.postMessage(msg); }catch(_e){} }
  try{ localStorage.setItem(SYNC_KEY, JSON.stringify(msg)); }catch(_e){}
}
function broadcastFrame(mode, t, isPlaying){
  if(!IS_MASTER) return;
  const now=performance.now();
  if(isPlaying && now-_lastSyncTs<30) return;   // ~33fps cap while playing; discrete updates always send
  _lastSyncTs=now;
  syncSend({type:'frame', mode:mode, t:t, playing:isPlaying});   // mode: 'stroch' | 'family'
}
function syncListen(handler){
  function dispatch(msg){
    if(!msg||!msg.type||msg.tab===TAB_ID) return;
    if(msg.type==='frame'){ const last=_lastSeqFrom[msg.tab]||-1; if(msg.seq<=last) return; _lastSeqFrom[msg.tab]=msg.seq; }
    handler(msg);
  }
  if(_bc) _bc.onmessage=function(e){ dispatch(e.data); };
  window.addEventListener('storage', function(e){ if(e.key!==SYNC_KEY||!e.newValue) return; try{ dispatch(JSON.parse(e.newValue)); }catch(_e){} });
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement.style;
Object.entries(C.years).forEach(function(e){ root.setProperty('--c'+e[0], e[1]); });
root.setProperty('--cwinter', C.winter);
root.setProperty('--routeV1', C.routeV1); root.setProperty('--routeV2', C.routeV2);
root.setProperty('--frost', C.frost); root.setProperty('--brass', C.brass);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function el(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function colorForStop(s){ return s.year==='winter' ? C.winter : C.years[s.year]; }
// Infer a display type for a stop from existing data (winterLabel / desc / position).
// Returns 'winter'|'endpoint'|'anchorage'|'settlement' or null (=> default style). Never throws.
function inferStopType(s){
  try{
    if(s.winterLabel!=null) return 'winter';
    var voy=V.voyages[s._vi], n=voy?voy.stops.length:0;            // endpoint = first/last stop of its voyage (Vancouver / Halifax termini)
    if(s.n===1 || (n && s.n===n)) return 'endpoint';
    var d=(s.desc||[]).join(' ').toLowerCase();
    if(/anchor/.test(d)) return 'anchorage';                       // log mentions anchoring
    if(/\b(post|town|village|detachment|dockyard|harbour)\b/.test(d)) return 'settlement';
  }catch(_e){}
  return null;
}
function fmtCoord(lat,lng){ const la=Math.abs(lat).toFixed(3)+'\u00b0'+(lat>=0?'N':'S'); const lo=Math.abs(lng).toFixed(3)+'\u00b0'+(lng>=0?'E':'W'); return la+'  '+lo; }
function fmtDate(ms){ const d=new Date(ms); return d.getUTCDate()+' '+MONTHS[d.getUTCMonth()]+' '+d.getUTCFullYear(); }

function notifyUnity(method, arg) {
  if (window.uwb && typeof uwb.ExecuteJsMethod === 'function') {
    uwb.ExecuteJsMethod(method, arg);
  }
}