(()=>{
  if(window.top!==window)return;
  const w=t=>new Promise(r=>setTimeout(r,t));
  const waitFor=async(fn,ms=15000)=>{const t0=Date.now();while(Date.now()-t0<ms){try{const v=fn();if(v)return v}catch(e){}await w(250)}return null};
  const txt=e=>(e.textContent||'').trim();
  const byText=(sel,re)=>[...document.querySelectorAll(sel)].find(e=>re.test(txt(e))&&e.offsetParent!==null);
  const fire=e=>{e.scrollIntoView({block:'center'});e.click()};
  const setVal=(i,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}))};
  const btn=document.createElement('button');
  btn.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#0696d7;color:#fff;border:0;border-radius:6px;padding:10px 14px;font:600 13px sans-serif;cursor:pointer;box-shadow:0 2px 8px #0004';
  const say=t=>{btn.textContent=t};say('Scan models for MSM');document.body.appendChild(btn);

  async function filters(){
    const open=await waitFor(()=>document.querySelector('[aria-label*="earch" i][role=button],button[aria-label*="earch" i],button[title*="earch" i]')||byText('button',/^search$/i));
    if(open&&!byText('h2,h3,div,span',/^Search and filter settings$/i))fire(open);
    if(!await waitFor(()=>byText('*',/^Search and filter settings$/i)))return false;
    const all=byText('label,span',/^All folders$/i);if(all)fire(all);
    for(const [label,opt] of [['Types','Files'],['File types','RVT']]){
      const lab=byText('label,div,span',new RegExp('^'+label+'$','i'));if(!lab)return false;
      const box=lab.parentElement.querySelector('input,[role=combobox],[role=button]')||lab.nextElementSibling;if(!box)return false;
      fire(box);await w(400);
      const inp=document.activeElement&&document.activeElement.tagName==='INPUT'?document.activeElement:box.querySelector&&box.querySelector('input');
      if(inp&&opt==='RVT'){setVal(inp,'RVT');await w(500)}
      const o=await waitFor(()=>byText('[role=option],li,label',new RegExp('^'+opt+'$','i')),4000);if(!o)return false;fire(o);await w(300);
      document.body.click();await w(300)}
    const go=[...document.querySelectorAll('button')].reverse().find(e=>/^search$/i.test(txt(e))&&e.offsetParent!==null);if(!go)return false;fire(go);return true}

  async function scan(){
    const b=await waitFor(()=>document.querySelector('.MatrixTable__body')&&/search results/i.test(document.body.innerText)&&document.querySelector('.MatrixTable__body'),20000);
    if(!b)return null;await w(2500);const m=new Map();
    const grab=()=>document.querySelectorAll('[role=row]').forEach(r=>{const c=r.children;if(c.length>2){const n=txt(c[1]);if(/\.rvt$/i.test(n)){const p=txt(c[2]);m.set(n+'|'+p,n+'\t'+p)}}});
    let stale=0,last=0;
    while(stale<15){grab();say('Scanning… '+m.size);b.scrollTop+=450;await w(450);
      if(b.scrollTop+b.clientHeight>=b.scrollHeight-5){const x=[...document.querySelectorAll('button')].find(e=>/load more|show more/i.test(txt(e)));if(x)x.click();await w(1500)}
      if(m.size===last)stale++;else{stale=0;last=m.size}}
    grab();return[...m.values()].join('\n')}

  async function run(auto){
    btn.disabled=true;
    if(auto){say('Setting up the search…');const ok=await filters();
      if(!ok){say('Set Files + RVT in Search, then press this button');btn.disabled=false;return}}
    let text=await scan();
    if(text){
      const ids=await new Promise(res=>{const h=e=>{if(e.source===window&&e.data&&e.data.msmFound){window.removeEventListener('message',h);res(e.data.msmFound)}};window.addEventListener('message',h);window.postMessage({msmAsk:1},location.origin);setTimeout(()=>{window.removeEventListener('message',h);res([])},1500)});
      const by=new Map(ids.map(x=>[x.name.toLowerCase(),x]));let linked=0;
      text=text.split('\n').map(l=>{const n=l.split('\t')[0].toLowerCase(),x=by.get(n);
        if(x&&x.lin){linked++;const u=location.origin+location.pathname+'?'+(x.fol?'folderUrn='+encodeURIComponent(x.fol)+'&':'')+'entityId='+encodeURIComponent(x.lin)+'&viewModel=detail&moduleId=folders';return l+'\t'+u}return l}).join('\n');
      window.__msmLinked=linked}
    if(text===null){say('Open Search > Files > RVT > Search first');btn.disabled=false;setTimeout(()=>say('Scan models for MSM'),4000);return}
    const count=text?text.split('\n').length:0;
    try{await chrome.storage.local.set({msmForma:{text,ts:Date.now(),count}});await chrome.storage.local.remove('msmReq')}catch(e){}
    try{await navigator.clipboard.writeText(text)}catch(e){}
    say('✓ '+count+' models sent to MSM'+(window.__msmLinked?' ('+window.__msmLinked+' with exact links)':''));btn.disabled=false;
    if(auto)setTimeout(()=>{try{window.close()}catch(e){}},1500);
    setTimeout(()=>say('Scan models for MSM'),6000)}

  btn.onclick=()=>run(false);
  (async()=>{try{const {msmReq}=await chrome.storage.local.get('msmReq');
    if(msmReq&&Date.now()-msmReq.ts<120000&&location.href.includes(msmReq.project))run(true)}catch(e){}})();
})();
