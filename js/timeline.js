const timelineEl=document.getElementById('timeline');
V.voyages.forEach(function(voy,vi){
  const vh=el('div','voyage-head'+(vi===0?' first':''));
  vh.append(el('div','voyage-code','Voyage '+voy.code));
  vh.append(el('div','voyage-title', voy.title));
  vh.append(el('div','voyage-sub', voy.sub));
  timelineEl.append(vh);
  voy.groups.forEach(function(g){
    const wrap=el('div','group');
    const head=el('div','group-head');
    head.append(el('div','group-title', g.title));
    head.append(el('div','group-sub', g.sub));
    wrap.append(head);
    const items=el('div','group-items');
    voy.stops.forEach(function(s){
      if(s.group!==g.id) return;
      const gi=s._gi, isW=s.year==='winter';
      const b=el('button','stop-item'); b.type='button';
      const chip=el('span','chip'+(isW?' winter':'')); chip.style.background=colorForStop(s);
      chip.append(el('span','chip-num', String(s.n)));
      if(isW) chip.append(el('span','chip-flake','\u2744'));
      b.append(chip);
      const tx=el('span','stop-tx');
      tx.append(el('span','stop-place', s.place));
      tx.append(el('span','stop-date', s.dateLabel + (s.winterLabel?'  \u00b7  '+s.winterLabel:'')));
      b.append(tx);
      b.addEventListener('click',function(){ selectStop(gi,{fly:true,openPopup:true}); });
      items.append(b); itemEls[gi]=b;
    });
    wrap.append(items); timelineEl.append(wrap);
  });
});
