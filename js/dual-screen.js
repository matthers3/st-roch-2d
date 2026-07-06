/* ===================== dual-screen control + Arctic tile prefetch ===================== */
(function(){
  function pLat(p){ return Array.isArray(p)?p[0]:p.lat; }
  function pLng(p){ return Array.isArray(p)?p[1]:p.lng; }

  if(IS_MASTER){
    /* ---- master: answer detail windows, broadcast frames (frames go out from renderFrame/pause) ---- */
    const dualBtn=document.getElementById('dualBtn');
    function markConnected(on){ if(dualBtn){ dualBtn.classList.toggle('dual-on', on); dualBtn.title = on ? 'Detail screen connected — click to focus it' : 'Open detail screen on a second display'; } }
    syncListen(function(msg){
      if(msg.role!=='detail') return;
      if(msg.type==='hello'){ markConnected(true);   // catch a late-joining detail up, in whichever mode we're showing
        if(familyMode) syncSend({type:'frame', mode:'family', t:famCurT, playing:famPlaying});
        else syncSend({type:'frame', mode:'stroch', t:curT, playing:playing});
      }
      else if(msg.type==='bye'){ markConnected(false); }
    });

    /* ---- the 'Dual screen' button: open ?role=detail and push it to the secondary display ---- */
    let detailWin=null;
    function placeOnSecondScreen(){
      function heuristic(){ try{ const w=window.screen.availWidth||1280; if(detailWin && !detailWin.closed) detailWin.moveTo(w,0); }catch(_e){} }
      if('getScreenDetails' in window){
        window.getScreenDetails().then(function(sd){
          const scr=(sd.screens||[]).filter(function(s){ return !s.isPrimary; })[0];
          if(scr && detailWin && !detailWin.closed){ try{ detailWin.moveTo(scr.availLeft, scr.availTop); detailWin.resizeTo(scr.availWidth, scr.availHeight); }catch(_e){ heuristic(); } }
          else heuristic();
        }).catch(heuristic);
      } else heuristic();
    }
    function openDetail(){
      if(detailWin && !detailWin.closed){ detailWin.focus(); return; }
      const base=location.href.split('#')[0].split('?')[0];
      detailWin=window.open(base+'?role=detail'+location.hash, 'stroch-detail', 'popup,width=960,height=720');   // opened synchronously so it isn't blocked
      if(detailWin) placeOnSecondScreen();                                                                      // reposition after (may prompt for window-management permission)
    }
    if(dualBtn) dualBtn.addEventListener('click', openDetail);

    /* ---- preload Arctic ocean tiles (zoom 5-10) into the shared browser cache ----
       Manual prefetch (not a Service Worker): a single self-contained index.html can't ship a
       separate SW file and SWs don't run from file://. Loading the tiles as Image() populates the
       HTTP cache, which is shared with the detail window. The route spans ~113deg of longitude, so
       z>=7 is fetched as a 1-tile corridor along the course rather than the whole bounding box. */
    function startTilePrefetch(){
      const conn=navigator.connection||{};
      if(conn.saveData || navigator.onLine===false) return;
      const TEMPLATE=ESRI+'Ocean/World_Ocean_Base/MapServer/tile';   // base chart only; reference labels stream live
      const ZOOM_ORDER=[5,6,10,9,8,7];   // overview-follow (z5) and detail-follow (z10) get cached first
      const CORRIDOR_R=1, MAX_URLS=2600, CONC=6;
      const seen=new Set(), urls=[];
      function lonX(lon,z){ return (lon+180)/360*Math.pow(2,z); }
      function latY(lat,z){ const r=lat*Math.PI/180; return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z); }
      function add(z,x,y){ const n=Math.pow(2,z); if(x<0||y<0||x>=n||y>=n||urls.length>=MAX_URLS) return; const k=z+'/'+x+'/'+y; if(seen.has(k)) return; seen.add(k); urls.push(TEMPLATE+'/'+z+'/'+y+'/'+x); }
      const route=allLatLngs;
      ZOOM_ORDER.forEach(function(z){
        if(urls.length>=MAX_URLS) return;
        if(z<=6){
          const x0=Math.floor(lonX(bounds.getWest(),z)), x1=Math.floor(lonX(bounds.getEast(),z));
          const y0=Math.floor(latY(bounds.getNorth(),z)), y1=Math.floor(latY(bounds.getSouth(),z));
          for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) add(z,x,y);
        } else {
          for(let i=0;i<route.length-1 && urls.length<MAX_URLS;i++){
            const ax=lonX(pLng(route[i]),z), ay=latY(pLat(route[i]),z), bx=lonX(pLng(route[i+1]),z), by=latY(pLat(route[i+1]),z);
            const steps=Math.max(1, Math.ceil(Math.hypot(bx-ax,by-ay)/0.5));
            for(let s=0;s<=steps;s++){ const tx=Math.floor(ax+(bx-ax)*s/steps), ty=Math.floor(ay+(by-ay)*s/steps); for(let dx=-CORRIDOR_R;dx<=CORRIDOR_R;dx++) for(let dy=-CORRIDOR_R;dy<=CORRIDOR_R;dy++) add(z,tx+dx,ty+dy); }
          }
        }
      });
      if(!urls.length) return;
      const total=urls.length; let done=0, idx=0, active=0;
      function pump(){
        while(active<CONC && idx<total){
          active++; const img=new Image(); try{ img.fetchPriority='low'; }catch(_e){} img.decoding='async';
          img.onload=img.onerror=function(){ active--; done++; if(done>=total) return; pump(); };
          img.src=urls[idx++];
        }
      }
      pump();
    }
    if('requestIdleCallback' in window) requestIdleCallback(startTilePrefetch, {timeout:3500}); else setTimeout(startTilePrefetch, 1600);

  } else {
    /* ---- detail (follower) window: position + mode come from the master, but pan / zoom / basemap stay local ---- */
    document.title='St. Roch · Detail screen';
    let _detailMode='stroch';
    function applyDetailFrame(msg){
      const mode = msg.mode || 'stroch';
      if(mode!==_detailMode){ _detailMode=mode; _detailZoomed=false; }   // re-apply the initial zoom when the journey switches
      if(mode==='family'){
        if(!familyMode) enterFamily();    // build the family layers + enter family mode on this screen
        famShowPlay();                    // show the family ship + trail (the following view)
        famCurT=msg.t; famRenderFrame(msg.t);
      } else {
        if(familyMode) exitFamily();
        if(!engaged) engage();
        curT=msg.t; renderFrame(msg.t);
      }
    }
    syncListen(function(msg){ if(msg.type==='frame') applyDetailFrame(msg); });
    /* 'Follow' toggle: on = keep the ship centred; drag the map to explore (auto-switches to free look) */
    const CH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>';
    const followBtn=el('button','detail-follow on'); followBtn.type='button'; followBtn.innerHTML=CH_SVG+'<span>Following</span>';
    function activeShip(){ return (_detailMode==='family' && typeof famShip!=='undefined' && famShip) ? famShip : ship; }
    function updateFollowBtn(){ followBtn.classList.toggle('on', detailFollow); followBtn.lastChild.textContent = detailFollow?'Following':'Free look'; followBtn.title = detailFollow?'Following the ship — click for free look':'Click to follow the ship again'; }
    followBtn.addEventListener('click', function(){ detailFollow=!detailFollow; if(detailFollow){ const s=activeShip(); if(s) map.setView(s.getLatLng(), map.getZoom(), {animate:true}); } updateFollowBtn(); });
    map.on('dragstart', function(){ if(detailFollow){ detailFollow=false; updateFollowBtn(); } });   // panning away = explore freely
    (document.querySelector('.map-wrap')||document.body).appendChild(followBtn);
    updateFollowBtn();
    engage(); renderFrame(0);              // show the St. Roch ship at the start until the master sends its first frame
    syncSend({type:'hello'});             // ask the master to catch us up (it replies with the right journey/mode)
    window.addEventListener('pagehide', function(){ syncSend({type:'bye'}); });
    setTimeout(function(){ map.invalidateSize(); }, 80);
  }
})();
