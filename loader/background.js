// MSM Forma Scanner loader: fetches the scanner code from GitHub Pages and registers it as user scripts.
const BASE = 'https://ibrahimhassansm-lgtm.github.io/model-segregation-manager/extension/';
const FILES = ['net.js', 'forma.js', 'msm.js'];
const FORMA = ['https://acc.autodesk.com/*'];
const MSM = ['https://ibrahimhassansm-lgtm.github.io/model-segregation-manager/*'];

// chrome.storage is not available inside the user-script world, so give those scripts a small bridge.
const SHIM = `(()=>{if(window.__msmShim)return;window.__msmShim=1;
const call=(op,a)=>new Promise(r=>{try{chrome.runtime.sendMessage({msmStore:op,a},x=>r(x))}catch(e){r(undefined)}});
const L={get:k=>call('get',k).then(x=>x||{}),set:o=>call('set',o).then(()=>{}),remove:k=>call('remove',k).then(()=>{})};
const subs=[];let last={};
setInterval(async()=>{const all=await call('get',null)||{};const ch={};
 for(const k of new Set([...Object.keys(all),...Object.keys(last)])){if(JSON.stringify(all[k])!==JSON.stringify(last[k]))ch[k]={newValue:all[k],oldValue:last[k]}}
 const first=!Object.keys(last).length&&!window.__msmShimInit;window.__msmShimInit=1;last=all;
 if(!first&&Object.keys(ch).length)subs.forEach(f=>{try{f(ch,'local')}catch(e){}})},1000);
window.chrome=window.chrome||{};window.chrome.storage={local:L,onChanged:{addListener:f=>subs.push(f)}};})();\n`;

chrome.runtime.onMessage.addListener((m, s, send) => {
  if (!m || !m.msmStore) return;
  const l = chrome.storage.local;
  if (m.msmStore === 'get') l.get(m.a).then(send);
  else if (m.msmStore === 'set') l.set(m.a).then(() => send(true));
  else if (m.msmStore === 'remove') l.remove(m.a).then(() => send(true));
  return true;
});
if (chrome.userScripts && chrome.userScripts.onUserScriptMessage)
  chrome.userScripts.onUserScriptMessage.addListener((m, s, send) => {
    if (!m || !m.msmStore) return;
    const l = chrome.storage.local;
    if (m.msmStore === 'get') l.get(m.a).then(send);
    else if (m.msmStore === 'set') l.set(m.a).then(() => send(true));
    else if (m.msmStore === 'remove') l.remove(m.a).then(() => send(true));
    return true;
  });

async function badge(t, c) { try { await chrome.action.setBadgeText({ text: t }); if (c) await chrome.action.setBadgeBackgroundColor({ color: c }) } catch (e) {} }

async function update(force) {
  if (!chrome.userScripts) { await badge('OFF', '#c0392b'); return 'off' }
  try { await chrome.userScripts.getScripts() } catch (e) { await badge('OFF', '#c0392b'); return 'off' }
  let code = {};
  try {
    for (const f of FILES) {
      const r = await fetch(BASE + f + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error(f + ' ' + r.status);
      code[f] = await r.text();
    }
  } catch (e) {
    const { msmCode } = await chrome.storage.local.get('msmCode');
    if (!msmCode) { await badge('ERR', '#c0392b'); return 'fetch' }
    code = msmCode; // offline: keep the last good copy
  }
  const sig = FILES.map(f => code[f].length + ':' + code[f].slice(0, 40) + code[f].slice(-40)).join('|');
  const { msmSig } = await chrome.storage.local.get('msmSig');
  const have = (await chrome.userScripts.getScripts()).length === 3;
  if (!force && have && msmSig === sig) { await badge(''); return 'same' }
  try { await chrome.userScripts.configureWorld({ messaging: true }) } catch (e) {}
  try { await chrome.userScripts.unregister() } catch (e) {}
  await chrome.userScripts.register([
    { id: 'net', matches: FORMA, js: [{ code: code['net.js'] }], runAt: 'document_start', world: 'MAIN' },
    { id: 'forma', matches: FORMA, js: [{ code: SHIM + code['forma.js'] }], runAt: 'document_idle', world: 'USER_SCRIPT' },
    { id: 'msm', matches: MSM, js: [{ code: SHIM + code['msm.js'] }], runAt: 'document_start', world: 'USER_SCRIPT' }
  ]);
  await chrome.storage.local.set({ msmCode: code, msmSig: sig, msmUpdated: Date.now() });
  await badge('');
  return 'updated';
}

chrome.runtime.onInstalled.addListener(() => { update(true); chrome.alarms.create('msmUpd', { periodInMinutes: 30 }) });
chrome.runtime.onStartup.addListener(() => { update(false); chrome.alarms.create('msmUpd', { periodInMinutes: 30 }) });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'msmUpd') update(false) });
chrome.action.onClicked.addListener(async () => {
  const r = await update(true);
  if (r === 'off') chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  else { await badge('✓', '#2e8b57'); setTimeout(() => badge(''), 3000) }
});
update(false);
