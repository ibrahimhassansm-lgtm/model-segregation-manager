(()=>{
  const post=o=>window.postMessage({source:'msm-forma-ext',...o},location.origin);
  const send=async()=>{
    try{const {msmForma}=await chrome.storage.local.get('msmForma');
      if(!msmForma||!msmForma.text||msmForma.sent)return;
      post({type:'forma-list',text:msmForma.text,count:msmForma.count,url:msmForma.url||''});
      await chrome.storage.local.set({msmForma:{...msmForma,sent:true}})}catch(e){}};
  chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.msmForma)setTimeout(send,300)});
  window.addEventListener('message',async e=>{const d=e.data;if(e.source!==window||!d||d.source!=='msm-forma-page')return;
    if(d.type==='ready')send();
    if(d.type==='request-scan'&&d.project){await chrome.storage.local.set({msmReq:{ts:Date.now(),project:d.project}});await chrome.storage.local.remove('msmForma')}});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{post({type:'hello'});send()},1500));
})();
