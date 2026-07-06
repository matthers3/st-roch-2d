const ESRI='https://services.arcgisonline.com/ArcGIS/rest/services/';
function esri(path,native){ return L.tileLayer(ESRI+path+'/MapServer/tile/{z}/{y}/{x}',{maxZoom:16,maxNativeZoom:native,attribution:'Tiles &copy; Esri'}); }
const oceanBase=esri('Ocean/World_Ocean_Base',13);
const oceanRef =esri('Ocean/World_Ocean_Reference',13);
const ocean=L.layerGroup([oceanBase,oceanRef]);
const sat=esri('World_Imagery',19);
const topo=esri('World_Topo_Map',19);
const labels=esri('Reference/World_Boundaries_and_Places',16);
const hillshade=L.tileLayer(ESRI+'Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',{maxZoom:16,maxNativeZoom:16,opacity:.45,attribution:'Hillshade &copy; Esri'});
const light=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:16,attribution:'&copy; OpenStreetMap &copy; CARTO'});
const dark =L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:16,attribution:'&copy; OpenStreetMap &copy; CARTO'});
const map=L.map('map',{layers:[ocean],minZoom:2,maxZoom:16,zoomControl:false,worldCopyJump:false,attributionControl:true});

const STOPS=[], markers=[], itemEls=[], routeLayers=[], voyTrails=[];
V.voyages.forEach(function(voy){
  const latlngs=voy.legs.flat();
  const color=C[voy.lineKey];
  const casing=L.polyline(latlngs,{color:C.routeCasing,weight:6,opacity:.7,lineJoin:'round',lineCap:'round'}).addTo(map);
  const core=L.polyline(latlngs,{color:color,weight:2.8,opacity:.95,lineJoin:'round',lineCap:'round'}).addTo(map);
  routeLayers.push({casing:casing,core:core,latlngs:latlngs,color:color});
  voyTrails.push({casing:L.polyline([],{color:C.routeCasing,weight:6,opacity:.7,lineJoin:'round',lineCap:'round'}),core:L.polyline([],{color:color,weight:2.8,opacity:.98,lineJoin:'round',lineCap:'round'})});
});
V.voyages.forEach(function(voy,vi){
  voy.stops.forEach(function(s){
    s._vi=vi; const gi=STOPS.length; s._gi=gi; STOPS.push(s);
    const isW=s.year==='winter';
    const stype=inferStopType(s); const tcls=stype?(' stop-marker--'+stype):'';
    const html='<div class="stop-marker'+(isW?' winter':'')+tcls+'" style="background:'+colorForStop(s)+'">'+(isW?'<span class="flake">\u2744</span>':'')+'<span class="num">'+s.n+'</span></div>';
    const icon=L.divIcon({className:'stop-div',html:html,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-15]});
    const m=L.marker([s.lat,s.lng],{icon:icon,title:s.n+'. '+s.place,riseOnHover:true}).addTo(map);
    m.bindPopup(function(){ return makePopup(s,voy); },{maxWidth:320,className:'voyage-popup'});
    m.on('click',function(){ selectStop(gi,{fly:false,openPopup:false}); });
    markers[gi]=m;
  });
});
const allLatLngs=[].concat.apply([], routeLayers.map(function(r){ return r.latlngs; }));
const bounds=L.latLngBounds(allLatLngs);
map.fitBounds(bounds,{padding:[44,44]});
let userZooming=false;
map.on('zoomstart', function(){ userZooming=true; });
map.on('zoomend', function(){ userZooming=false; });
STOPS.forEach(function(s){ s.dateMs = Date.parse(s.date+'T00:00:00Z'); });

function makePopup(s,voy){
  const w=el('div','pop');
  const eb=el('div','pop-eb');
  eb.append(el('span',null,'Voyage '+voy.code+' \u00b7 Stop '+s.n));
  const dot=el('span','pop-dot'); dot.style.background=colorForStop(s); eb.append(dot);
  eb.append(el('span','pop-phase', s.winterLabel ? s.winterLabel : s.year));
  w.append(eb);
  w.append(el('h3','pop-place', s.place));
  const meta=el('div','pop-meta');
  meta.append(el('span','pop-date', s.dateLabel));
  meta.append(el('span','pop-coord', fmtCoord(s.lat,s.lng)));
  w.append(meta);
  const d=el('div','pop-desc'+((s.desc&&s.desc.length)?'':' pop-muted'));
  if(s.desc&&s.desc.length){ s.desc.forEach(function(p){ d.append(el('p',null,p)); }); }
  else d.append(el('p',null,'Logged position on the voyage.'));
  w.append(d);
  return w;
}
