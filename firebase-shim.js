/* Model Segregation Manager – Firebase adapter.
   Provides window.claude.use('db' | 'user' | 'downloads') on top of Firebase Auth + Firestore,
   so the same app file runs on any website (GitHub Pages, SharePoint embed, …). */
(function(){
  const CFG=window.MSM_FIREBASE||{};
  const OWNER=String(CFG.ownerEmail||'').toLowerCase();
  firebase.initializeApp(CFG.firebase);
  const auth=firebase.auth(), fs=firebase.firestore();
  const err=e=>({code:({'permission-denied':'invalid_argument','unauthenticated':'invalid_argument','not-found':'invalid_argument','resource-exhausted':'resource_exhausted','unavailable':'unavailable'})[e&&e.code]||'unavailable',message:(e&&e.message)||String(e)});
  const wrapDoc=s=>({id:s.id,exists:s.exists,data:()=>s.exists?s.data():undefined,metadata:{fromCache:s.metadata.fromCache,hasPendingWrites:s.metadata.hasPendingWrites}});
  function query(ref,st){st=st||{w:[],o:null,l:0};
    const build=()=>{let q=ref;for(const w of st.w)q=q.where(w[0],w[1],w[2]);return q};
    const shape=s=>{let docs=s.docs.map(wrapDoc);if(st.o){const [f,d]=st.o;docs.sort((a,b)=>{const x=a.data()[f],y=b.data()[f];return (x<y?-1:x>y?1:0)*(d==='desc'?-1:1)})}if(st.l)docs=docs.slice(0,st.l);return{docs,size:docs.length,empty:!docs.length,metadata:{fromCache:s.metadata.fromCache,hasPendingWrites:s.metadata.hasPendingWrites},docChanges:()=>[]}};
    return{where:(f,o,v)=>query(ref,{...st,w:[...st.w,[f,o,v]]}),orderBy:(f,d)=>query(ref,{...st,o:[f,d||'asc']}),limit:n=>query(ref,{...st,l:n}),
      get:()=>build().get().then(shape,e=>{throw err(e)}),
      onSnapshot:(n,e)=>build().onSnapshot(s=>n(shape(s)),x=>e&&e(err(x)))};}
  function docRef(r){return{id:r.id,path:r.path,get:()=>r.get().then(wrapDoc,e=>{throw err(e)}),set:d=>r.set(d).catch(e=>{throw err(e)}),update:d=>r.update(d).catch(e=>{throw err(e)}),delete:()=>r.delete().catch(e=>{throw err(e)}),
    onSnapshot:(n,e)=>r.onSnapshot(s=>n(wrapDoc(s)),x=>e&&e(err(x))),collection:p=>colRef(r.collection(p)),acquire:async()=>({acquired:true})}}
  function colRef(c){return Object.assign(query(c),{path:c.path,doc:id=>docRef(id?c.doc(id):c.doc()),add:async d=>docRef(await c.add(d))})}
  const db={doc:p=>docRef(fs.doc(p)),collection:p=>colRef(fs.collection(p))};
  let me=null,roster={};
  const initials=(n,col)=>{const t=(n||'?').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();return 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="${col}"/><text x="20" y="25" font-family="Arial" font-size="15" fill="#fff" text-anchor="middle">${t}</text></svg>`)};
  const colorOf=id=>{let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))%360;return `hsl(${h},45%,42%)`};
  const prof=(id,u)=>({id,name:(u&&(u.name||u.email))||'',avatarUrl:(u&&u.photo)||initials(u&&(u.name||u.email),colorOf(id)),color:colorOf(id),email:(u&&u.email)||null,isMe:me&&id===me.uid,guest:false});
  let userCache=null;const loadUsers=async()=>{if(userCache)return userCache;const s=await fs.collection('users').get();userCache={};s.forEach(d=>userCache[d.id]=d.data());setTimeout(()=>userCache=null,60000);return userCache};
  const isOwner=()=>!!(me&&String(me.email||'').toLowerCase()===OWNER);
  const role=()=>isOwner()?'owner':(me&&roster[me.uid]&&roster[me.uid].role)||null;
  const user={
    isOwner:async()=>isOwner(), canEdit:async()=>isOwner(),
    can:async n=>n==='data.write'?['owner','admin','member'].includes(role()):false,
    id:async()=>me?me.uid:null, name:async()=>me?(me.displayName||me.email||''):'', email:async()=>me?me.email:null, avatarUrl:async()=>me?(me.photoURL||null):null,
    me:async()=>({...prof(me.uid,{name:me.displayName||me.email,email:me.email,photo:me.photoURL}),isOwner:isOwner(),canEdit:isOwner()}),
    profiles:async ids=>{ids=[].concat(ids);const u=await loadUsers().catch(()=>({}));const o={};for(const i of ids)o[i]=prof(i,u[i]);return o},
    search:async q=>{const u=await loadUsers().catch(()=>({}));q=String(q||'').toLowerCase();return Object.entries(u).filter(([id,x])=>!q||String(x.name||'').toLowerCase().includes(q)||String(x.email||'').toLowerCase().includes(q)).slice(0,8).map(([id,x])=>prof(id,x))}
  };
  const downloads={save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);return{status:'saved'}}};
  /* sign-in */
  let readyRes;const ready=new Promise(r=>readyRes=r);
  function gate(){
    let el=document.getElementById('msmGate');
    if(!el){el=document.createElement('div');el.id='msmGate';el.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(10,20,30,.92);display:flex;align-items:center;justify-content:center;font:14px Inter,Segoe UI,sans-serif';document.body.appendChild(el)}
    el.innerHTML=`<div style="background:#fff;color:#14212b;border-radius:12px;padding:28px;width:min(400px,92vw);display:flex;flex-direction:column;gap:12px">
      <h2 style="margin:0;font-size:18px">Model Segregation Manager</h2><p style="margin:0;color:#5b6974">Sign in to continue.</p>
      <button id="gG" style="padding:10px;border-radius:8px;border:1px solid #d5dce2;background:#fff;cursor:pointer;font-weight:600">Sign in with Google</button>
      <div style="text-align:center;color:#8a96a0;font-size:12px">or get a sign-in link by email</div>
      <input id="gE" type="email" placeholder="you@company.com" style="padding:9px;border-radius:8px;border:1px solid #d5dce2">
      <button id="gL" style="padding:10px;border-radius:8px;border:0;background:#245f80;color:#fff;cursor:pointer;font-weight:600">Email me a sign-in link</button>
      <p id="gM" style="margin:0;color:#b42318;font-size:13px"></p></div>`;
    el.querySelector('#gG').onclick=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>el.querySelector('#gM').textContent=e.message);
    el.querySelector('#gL').onclick=()=>{const em=el.querySelector('#gE').value.trim();if(!em)return;auth.sendSignInLinkToEmail(em,{url:location.href.split('#')[0],handleCodeInApp:true}).then(()=>{localStorage.setItem('msmEmail',em);el.querySelector('#gM').style.color='#0b6b43';el.querySelector('#gM').textContent='Check your inbox and open the link on this device.'}).catch(e=>el.querySelector('#gM').textContent=e.message)};
  }
  if(auth.isSignInWithEmailLink(location.href)){let em=localStorage.getItem('msmEmail')||prompt('Confirm your email');auth.signInWithEmailLink(em,location.href).then(()=>history.replaceState(null,'',location.pathname)).catch(e=>alert(e.message))}
  auth.onAuthStateChanged(async u=>{
    if(!u){if(document.body)gate();else addEventListener('DOMContentLoaded',gate);return}
    me=u;const g=document.getElementById('msmGate');if(g)g.remove();
    try{await fs.doc('users/'+u.uid).set({name:u.displayName||u.email,email:u.email||'',photo:u.photoURL||'',last:new Date().toISOString()},{merge:true})}catch(e){}
    fs.doc('team/roster').onSnapshot(s=>{roster=(s.exists&&s.data().members)||{}},()=>{});
    try{const s=await fs.doc('team/roster').get();roster=(s.exists&&s.data().members)||{}}catch(e){}
    if(!isOwner()&&!roster[u.uid]){try{const r=fs.doc('requests/'+u.uid);if(!(await r.get()).exists)await r.set({name:u.displayName||u.email,email:u.email||'',at:new Date().toISOString()})}catch(e){}}
    readyRes();
  });
  window.msmSignOut=()=>auth.signOut().then(()=>location.reload());
  window.claude={use:async n=>{await ready;return n==='db'?db:n==='user'?user:n==='downloads'?downloads:null}};
})();
