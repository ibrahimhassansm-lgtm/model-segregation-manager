// MSM Forma Agent: runs on your PC, listens on 127.0.0.1 only, and only answers the MSM page.
const http = require('http');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');

const PORT = 8765;
const ORIGIN = 'https://ibrahimhassansm-lgtm.github.io';
const PROFILE = path.join(os.homedir(), '.msm-forma-agent', 'profile');
const HEADLESS = process.env.HEADLESS === '1';
let status = 'Ready';
let busy = false;

// Runs inside the Forma page: sets Files + RVT in the search, scrolls every result, returns "name<TAB>path" lines.
async function inPage() {
  const w = t => new Promise(r => setTimeout(r, t));
  const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) {} await w(250); } return null; };
  const txt = e => (e.textContent || '').trim();
  const byText = (sel, re) => [...document.querySelectorAll(sel)].find(e => re.test(txt(e)) && e.offsetParent !== null);
  const fire = e => { e.scrollIntoView({ block: 'center' }); ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t => e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window, button: 0 }))); };
  const setVal = (i, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); };
  const say = t => { try { window.__msmStatus(t); } catch (e) {} };

  async function filters() {
    const open = await waitFor(() => document.querySelector('button[aria-label*="earch" i],button[title*="earch" i],[aria-label*="earch" i][role=button]') || byText('button', /^search$/i));
    if (open && !byText('h2,h3,div,span', /^Search and filter settings$/i)) fire(open);
    if (!await waitFor(() => byText('*', /^Search and filter settings$/i))) return false;
    const all = byText('label,span', /^All folders$/i); if (all) fire(all);
    for (const [label, opt] of [['Types', 'Files'], ['File types', 'RVT']]) {
      const lab = byText('label,div,span', new RegExp('^' + label + '$', 'i')); if (!lab) return false;
      const hdr = lab.closest('[class*=Header]') || lab.parentElement.parentElement; const box = (hdr && hdr.parentElement && hdr.parentElement.querySelector('[role=combobox]')) || lab.parentElement.querySelector('input,[role=combobox],[role=button]'); if (!box) return false;
      fire((box.querySelector && box.querySelector('.SelectBox__control')) || box); await w(400);
      const inp = box.querySelector && box.querySelector('.SelectBox__input,input');
      if (inp && opt === 'RVT') { setVal(inp, 'RVT'); await w(500); }
      const o = await waitFor(() => [...document.querySelectorAll('[role=option],li.SelectBox__option')].find(e => new RegExp('^' + opt + '$', 'i').test(txt(e)) && e.offsetParent !== null), 4000); if (!o) return false;
      fire(o); await w(300); fire(lab); await w(300);
    }
    const go = [...document.querySelectorAll('button')].reverse().find(e => /^search$/i.test(txt(e)) && e.offsetParent !== null);
    if (!go) return false; fire(go); return true;
  }

  say('Setting up the Forma search');
  const ok = await filters();
  if (!ok) return { error: 'Could not set Files + RVT in the Forma search automatically.' };
  const b = await waitFor(() => document.querySelector('.MatrixTable__body') && /search results/i.test(document.body.innerText) && document.querySelector('.MatrixTable__body'), 25000);
  if (!b) return { error: 'The search results did not appear.' };
  await w(2500);
  const m = new Map();
  const grab = () => document.querySelectorAll('[role=row]').forEach(r => { const c = r.children; if (c.length > 2) { const n = txt(c[1]); if (/\.rvt$/i.test(n)) { const p = txt(c[2]); m.set(n + '|' + p, n + '\t' + p); } } });
  let stale = 0, last = 0;
  while (stale < 15) {
    grab(); say('Scanning… ' + m.size + ' models');
    b.scrollTop += 450; await w(450);
    if (b.scrollTop + b.clientHeight >= b.scrollHeight - 5) {
      const x = [...document.querySelectorAll('button')].find(e => /load more|show more/i.test(txt(e)));
      if (x) x.click(); await w(1500);
    }
    if (m.size === last) stale++; else { stale = 0; last = m.size; }
  }
  grab();
  return { text: [...m.values()].join('\n') };
}

function walk(o, d, found) {
  if (!o || d > 9) return;
  if (Array.isArray(o)) { o.forEach(x => walk(x, d + 1, found)); return; }
  if (typeof o !== 'object') return;
  const vals = Object.values(o);
  const name = ['name', 'displayName', 'title', 'fileName'].map(k => o[k]).find(v => typeof v === 'string' && /\.rvt$/i.test(v));
  if (name) {
    const lin = vals.find(v => typeof v === 'string' && v.startsWith('urn:adsk.wipprod:dm.lineage:'));
    const fol = vals.find(v => typeof v === 'string' && v.startsWith('urn:adsk.wipprod:fs.folder:'));
    const k = name.toLowerCase(), prev = found.get(k) || {};
    if (lin || fol) found.set(k, { lin: lin || prev.lin || '', fol: fol || prev.fol || '' });
  }
  for (const v of vals) if (v && typeof v === 'object') walk(v, d + 1, found);
}

async function scan(projectUrl, project) {
  status = 'Opening Chrome';
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome', headless: HEADLESS, viewport: null, args: ['--window-size=1200,850']
  });
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    const found = new Map();
    page.on('response', async r => {
      try {
        const ct = r.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        const t = await r.text();
        if (t.length < 20e6 && /\.rvt/i.test(t)) walk(JSON.parse(t), 0, found);
      } catch (e) {}
    });
    await page.exposeFunction('__msmStatus', s => { status = s; });
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
    status = 'Waiting for Forma (sign in here if asked)';
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 10 * 60 * 1000) throw new Error('Timed out waiting for Forma to load. Sign in in the Chrome window and try again.');
      try {
        const u = page.url();
        if (u.includes(project) && await page.$('.MatrixTable__body, [role=tree], [role=row]')) break;
      } catch (e) { /* page was navigating (sign-in redirect); check again */ }
      await new Promise(r => setTimeout(r, 2000));
    }
    await new Promise(r => setTimeout(r, 1500));
    let res;
    for (let i = 0; i < 6; i++) {
      try { res = await page.evaluate(inPage); break; }
      catch (e) {
        if (!/context was destroyed|navigation|Target closed/i.test(String(e.message)) || i === 5) throw e;
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    if (res.error) throw new Error(res.error);
    await new Promise(r => setTimeout(r, 800));
    const base = projectUrl.split('?')[0];
    const files = (res.text ? res.text.split('\n') : []).map(l => {
      const [name, p] = l.split('\t');
      const x = found.get(name.toLowerCase());
      const url = x && x.lin ? base + '?' + (x.fol ? 'folderUrn=' + encodeURIComponent(x.fol) + '&' : '') + 'entityId=' + encodeURIComponent(x.lin) + '&viewModel=detail&moduleId=folders' : '';
      return { name, path: p || '', url };
    });
    return files;
  } finally {
    await ctx.close().catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && origin !== ORIGIN) { res.writeHead(403); return res.end(); }
  const h = {
    'Access-Control-Allow-Origin': ORIGIN, 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true', 'Content-Type': 'application/json'
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  if (req.url === '/ping') { res.writeHead(200, h); return res.end(JSON.stringify({ ok: true, version: '1.0.1' })); }
  if (req.url === '/status') { res.writeHead(200, h); return res.end(JSON.stringify({ busy, status })); }
  if (req.url === '/scan' && req.method === 'POST') {
    let body = ''; req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      if (busy) { res.writeHead(409, h); return res.end(JSON.stringify({ error: 'A scan is already running.' })); }
      let j; try { j = JSON.parse(body || '{}'); } catch (e) { j = {}; }
      const url = String(j.url || ''), project = String(j.project || '');
      if (!/^https:\/\/([a-z0-9-]+\.)*autodesk\.com\//i.test(url) || !/^[0-9a-f-]{36}$/i.test(project)) {
        res.writeHead(400, h); return res.end(JSON.stringify({ error: 'Bad Forma project link.' }));
      }
      busy = true;
      try {
        const files = await scan(url, project.toLowerCase());
        status = 'Done: ' + files.length + ' models';
        res.writeHead(200, h); res.end(JSON.stringify({ files }));
      } catch (e) {
        status = 'Failed';
        res.writeHead(500, h); res.end(JSON.stringify({ error: String(e.message || e) }));
      } finally { busy = false; }
    });
    return;
  }
  res.writeHead(404, h); res.end(JSON.stringify({ error: 'Not found' }));
});
server.listen(PORT, '127.0.0.1', () => console.log('MSM Forma Agent is running on http://127.0.0.1:' + PORT + '\nKeep this window open, then press "Scan with local agent" in MSM.'));
