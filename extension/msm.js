(()=>{
  const send=async()=>{
    try{const {msmForma}=await chrome.storage.local.get('msmForma');
      if(!msmForma||!msmForma.text||msmForma.sent)return;
      window.postMessage({source:'msm-forma-ext',type:'forma-list',text:msmForma.text,count:msmForma.count},location.origin);
      await chrome.storage.local.set({msmForma:{...msmForma,sent:true}})}catch(e){}};
  window.postMessage({source:'msm-forma-ext',type:'hello'},location.origin);
  chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.msmForma)setTimeout(send,300)});
  window.addEventListener('message',e=>{if(e.source===window&&e.data&&e.data.source==='msm-forma-page'&&e.data.type==='ready')send()});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{window.postMessage({source:'msm-forma-ext',type:'hello'},location.origin);send()},1500));
})();
