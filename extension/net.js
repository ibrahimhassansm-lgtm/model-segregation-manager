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
})();
