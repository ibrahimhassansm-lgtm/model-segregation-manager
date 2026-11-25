(()=>{
  if(window.top!==window)return;
  const w=t=>new Promise(r=>setTimeout(r,t));
  const waitFor=async(fn,ms=15000)=>{const t0=Date.now();while(Date.now()-t0<ms){try{const v=fn();if(v)return v}catch(e){}await w(250)}return null};
  const txt=e=>(e.textContent||'').trim();
  const byText=(sel,re)=>[...document.querySelectorAll(sel)].find(e=>re.test(txt(e))&&e.offsetParent!==null);
  const fire=e=>{e.scrollIntoView({block:'center'});['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>e.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window,button:0})))};
  const setVal=(i,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}))};
  const btn=document.createElement('button');
  btn.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#0696d7;color:#fff;border:0;border-radius:6px;padding:10px 14px;font:600 13px sans-serif;cursor:pointer;box-shadow:0 2px 8px #0004';
  const say=t=>{btn.textContent=t};say('Scan models for MSM');document.body.appendChild(btn);

  async function filters(){
    say('Step 1: opening Search');const open=await waitFor(()=>document.querySelector('[data-testid="search-button"],[data-testid="action-header-filter"],button[aria-label="Filter"]')||document.querySelector('button[aria-label*="earch" i],button[title*="earch" i]'));
    if(open&&!byText('h2,h3,div,span',/^Search and filter settings$/i))fire(open);
    if(!await waitFor(()=>byText('*',/^Search and filter settings$/i)))return false;
    say('Step 2: setting filters');const all=byText('label,span',/^All folders$/i);if(all)fire(all);
    for(const [label,opt] of [['Types','Files'],['File types','RVT']]){
      const lab=byText('label,div,span',new RegExp('^'+label+'$','i'));if(!lab)return false;
      const hdr=lab.closest('[class*=Header]')||lab.parentElement.parentElement;const box=(hdr&&hdr.parentElement&&hdr.parentElement.querySelector('[role=combobox]'))||lab.parentElement.querySelector('input,[role=combobox],[role=button]');if(!box)return false;
      fire(box.querySelector&&box.querySelector('.SelectBox__control')||box);await w(400);
      const inp=box.querySelector&&box.querySelector('.SelectBox__input,input');
      if(inp&&opt==='RVT'){setVal(inp,'RVT');await w(500)}
      const o=await waitFor(()=>[...document.querySelectorAll('[role=option],li.SelectBox__option')].find(e=>new RegExp('^'+opt+'$','i').test(txt(e))&&e.offsetParent!==null),4000);if(!o)return false;fire(o);await w(300);
      fire(lab);await w(300)}
    say('Step 3: pressing Search');const go=[...document.querySelectorAll('button')].reverse().find(e=>/^search$/i.test(txt(e))&&e.offsetParent!==null&&!/TabTitle/.test(e.className));if(!go){say('Search button not found');return false}fire(go);
    for(let t=0;t<2;t++){const ok=await waitFor(()=>document.querySelector('.MatrixTable__body')&&/search results/i.test(document.body.innerText),12000);if(ok)return true;say('Pressing Search again');fire(go)}
    return true}

  async function scan(){
    say('Step 4: waiting for results');const b=await waitFor(()=>document.querySelector('.MatrixTable__body')&&/search results/i.test(document.body.innerText)&&document.querySelector('.MatrixTable__body'),30000);
    if(!b){say('Results did not appear');return null}await w(2500);const m=new Map();
    const grab=()=>document.querySelectorAll('[role=row]').forEach(r=>{const c=r.children;if(c.length>2){const n=txt(c[1]);if(/\.rvt$/i.test(n)){const p=txt(c[2]);m.set(n+'|'+p,n+'\t'+p)}}});
    let stale=0,last=0;
    while(stale<15){grab();say('Scanning… '+m.size);b.scrollTop+=450;await w(450);
      if(b.scrollTop+b.clientHeight>=b.scrollHeight-5){const x=[...document.querySelectorAll('button')].find(e=>/load more|show more/i.test(txt(e)));if(x)x.click();await w(1500)}
      if(m.size===last)stale++;else{stale=0;last=m.size}}
    grab();return[...m.values()].join('\n')}

  async function run(auto){try{await run2(auto)}catch(e){say('Error: '+(e&&e.message||e)+' (send me this text)');btn.disabled=false}}
  async function run2(auto){
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
    if(text===null){btn.disabled=false;return}
    const count=text?text.split('\n').length:0;
    try{await chrome.storage.local.set({msmForma:{text,ts:Date.now(),count,url:location.origin+location.pathname}});await chrome.storage.local.remove('msmReq')}catch(e){}
    try{await navigator.clipboard.writeText(text)}catch(e){}
    say('✓ '+count+' models sent to MSM'+(window.__msmLinked?' ('+window.__msmLinked+' with exact links)':''));btn.disabled=false;
    if(auto)setTimeout(()=>{try{window.close()}catch(e){}},1500);
    setTimeout(()=>say('Scan models for MSM'),6000)}

  btn.onclick=()=>run(!(document.querySelector('.MatrixTable__body')&&/search results/i.test(document.body.innerText)));
  let started=false;
  const watch=async()=>{
    for(let i=0;i<300&&!started;i++){
      try{const {msmReq}=await chrome.storage.local.get('msmReq');
        if(!msmReq||Date.now()-msmReq.ts>600000)return;
        if(location.href.includes(msmReq.project)&&document.querySelector('.MatrixTable__body, [role=tree], [role=row]')){started=true;await w(1500);run(true);return}
        if(i===0)say('Waiting for you to sign in…')}catch(e){return}
      await w(2000)}};
  watch();
})();
