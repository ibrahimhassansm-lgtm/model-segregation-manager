(()=>{
  if(window.top!==window)return;
  const w=t=>new Promise(r=>setTimeout(r,t));
  const btn=document.createElement('button');
  btn.textContent='Scan models for MSM';
  btn.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#0696d7;color:#fff;border:0;border-radius:6px;padding:10px 14px;font:600 13px sans-serif;cursor:pointer;box-shadow:0 2px 8px #0004';
  document.body.appendChild(btn);
  const say=t=>{btn.textContent=t};
  btn.onclick=async()=>{
    const b=document.querySelector('.MatrixTable__body');
    if(!b||!/search results/i.test(document.body.innerText)){
      say('Open Search > Files > RVT > Search first');setTimeout(()=>say('Scan models for MSM'),4000);return}
    btn.disabled=true;const m=new Map();
    const grab=()=>document.querySelectorAll('[role=row]').forEach(r=>{const c=r.children;
      if(c.length>2){const n=c[1].textContent.trim();if(/\.rvt$/i.test(n)){const p=c[2].textContent.trim();m.set(n+'|'+p,n+'\t'+p)}}});
    let stale=0,last=0;
    while(stale<15){grab();say('Scanning… '+m.size);b.scrollTop+=450;await w(450);
      if(b.scrollTop+b.clientHeight>=b.scrollHeight-5){
        const x=[...document.querySelectorAll('button')].find(e=>/load more|show more/i.test(e.textContent));
        if(x)x.click();await w(1500)}
      if(m.size===last)stale++;else{stale=0;last=m.size}}
    grab();
    const text=[...m.values()].join('\n');
    try{await chrome.storage.local.set({msmForma:{text,ts:Date.now(),count:m.size}})}catch(e){}
    try{await navigator.clipboard.writeText(text)}catch(e){}
    say('✓ '+m.size+' models sent to MSM');btn.disabled=false;
    setTimeout(()=>say('Scan models for MSM'),6000)};
})();
