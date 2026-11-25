(()=>{
  if(window.top!==window||window.__msmNet)return;window.__msmNet=true;
  const found=new Map();
  const isU=(s,p)=>typeof s==='string'&&s.startsWith(p);
  const walk=(o,d)=>{
    if(!o||d>9)return;
    if(Array.isArray(o)){o.forEach(x=>walk(x,d+1));return}
    if(typeof o!=='object')return;
    const vals=Object.values(o);
    const name=['name','displayName','title','fileName'].map(k=>o[k]).find(v=>typeof v==='string'&&/\.rvt$/i.test(v));
    if(name){
      const lin=vals.find(v=>isU(v,'urn:adsk.wipprod:dm.lineage:'));
      const fol=vals.find(v=>isU(v,'urn:adsk.wipprod:fs.folder:'));
      const k=name.toLowerCase(),prev=found.get(k)||{};
      if(lin||fol)found.set(k,{name,lin:lin||prev.lin||'',fol:fol||prev.fol||''})}
    for(const v of vals)if(v&&typeof v==='object')walk(v,d+1)};
  const feed=t=>{try{if(t&&t.length<20e6&&(t.includes('.rvt')||t.includes('.RVT')))walk(JSON.parse(t),0)}catch(e){}};
  const f=window.fetch;
  window.fetch=async function(...a){const r=await f.apply(this,a);try{r.clone().text().then(feed).catch(()=>{})}catch(e){}return r};
  const xs=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send=function(...a){this.addEventListener('load',()=>{try{if(this.responseType===''||this.responseType==='text')feed(this.responseText);else if(this.responseType==='json'&&this.response)walk(this.response,0)}catch(e){}});return xs.apply(this,a)};
  window.addEventListener('message',e=>{if(e.source===window&&e.data&&e.data.msmAsk)window.postMessage({msmFound:[...found.values()]},location.origin)});

  // ---- filter automation runs here (page context) because Forma's dropdowns ignore events sent from the extension's isolated world ----
  const w=t=>new Promise(r=>setTimeout(r,t));
  const txt=e=>(e.textContent||'').trim();
  const byText=(sel,re)=>[...document.querySelectorAll(sel)].find(e=>re.test(txt(e))&&e.offsetParent!==null);
  const fire=e=>{e.scrollIntoView({block:'center'});['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>e.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window,button:0})))};
  const waitFor=async(fn,ms=15000)=>{const t0=Date.now();while(Date.now()-t0<ms){try{const v=fn();if(v)return v}catch(e){}await w(250)}return null};
  const setVal=(i,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}))};
  async function filters(cur){
    const open=await waitFor(()=>document.querySelector('[data-testid="search-button"],[data-testid="action-header-filter"],button[aria-label="Filter"]'));
    if(open&&!byText('h2,h3,div,span',/^Search and filter settings$/i))fire(open);
    if(!await waitFor(()=>byText('*',/^Search and filter settings$/i)))return 'panel';
    await w(600);
    const all=byText('label,span',cur?/^Current folder$/i:/^All folders$/i);if(all)fire(all);
    for(const [label,opt] of [['Types','Files'],['File types','RVT']]){
      const lab=byText('label,div,span',new RegExp('^'+label+'$','i'));if(!lab)return label+' heading';
      const hdr=lab.closest('[class*=Header]')||lab.parentElement.parentElement;const box=hdr.parentElement.querySelector('[role=combobox]');if(!box)return label+' box';
      fire(box.querySelector('.SelectBox__control')||box);await w(400);
      const inp=box.querySelector('.SelectBox__input,input');if(inp&&opt==='RVT'){setVal(inp,'RVT');await w(500)}
      const o=await waitFor(()=>[...document.querySelectorAll('[role=option],li.SelectBox__option')].find(e=>new RegExp('^'+opt+'$','i').test(txt(e))&&e.offsetParent!==null),4000);if(!o)return label+' option';
      fire(o);await w(300);fire(lab);await w(300)}
    const go=[...document.querySelectorAll('button')].reverse().find(e=>/^search$/i.test(txt(e))&&e.offsetParent!==null&&!/TabTitle/.test(e.className));if(!go)return 'search button';
    fire(go);
    for(let t=0;t<2;t++){if(await waitFor(()=>document.querySelector('.MatrixTable__body')&&/search results/i.test(document.body.innerText),12000))return true;fire(go)}
    return true}
  window.addEventListener('message',async e=>{if(e.source!==window||!e.data||e.data.msmDo!=='filters')return;
    let r;try{r=await filters(!!e.data.cur)}catch(err){r='error: '+(err&&err.message)}
    window.postMessage({msmFiltersDone:r},location.origin)});
})();
