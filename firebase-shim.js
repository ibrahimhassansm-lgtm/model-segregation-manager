/* Sandbox adapter: no Firebase, authentication or network writes. */
(function(){
'use strict';
const KEY='msm.sandbox.v140.documents';
const copy=x=>JSON.parse(JSON.stringify(x));
const profile={id:'sandbox-admin',name:'Sandbox Admin',email:'admin@example.invalid',isOwner:true,canEdit:true,isMe:true,color:'#245f80',guest:false};
const seed={'projectcfg/demo-tower':{company:'DEMO',project:'T01',name:'Sample Tower',disciplines:['GN','ARC','STR','INT','MEC','PLU','ELE'],zones:[{code:'SW',label:'Site Wide'},{code:'OA',label:'Overall'},{code:'BA',label:'Building A'}],groups:[],sets:{},setOrder:[]},'team/roster':{members:{},invites:{}}};
for(const [i,d,z,t,ov,at] of [[1,'GN','SW','Datum model',[],[]],[2,'ARC','BA','Main model',['GN-SW-DAT'],[]],[3,'STR','BA','Main model',['GN-SW-DAT','ARC-BA-MAIN'],[]],[4,'MEC','BA','Main model',['GN-SW-DAT','ARC-BA-MAIN','STR-BA-MAIN'],[]],[5,'PLU','BA','Main model',['ARC-BA-MAIN','STR-BA-MAIN'],[]],[6,'ELE','BA','Main model',['ARC-BA-MAIN','MEC-BA-MAIN'],[]],[7,'INT','BA','Main model',['ARC-BA-MAIN'],[]]]){seed['projects/demo-tower/models/m'+i]={name:'DEMO-T01-'+d+'-'+z+'-'+(i===1?'DAT':'MAIN'),disc:d,zone:z,sub:'–',type:t,ov,at,group:'',set:'',parent:'',desc:'Sample model',content:'',levels:'',order:i*10}}
let data;try{const raw=localStorage.getItem(KEY);data=raw?JSON.parse(raw):copy(seed);if(!raw)localStorage.setItem(KEY,JSON.stringify(data))}catch(e){data=copy(seed);console.warn('Sandbox storage unavailable',e)}
const listeners=new Set(), meta={fromCache:false,hasPendingWrites:false};
const snap=p=>({id:p.split('/').pop(),exists:Object.hasOwn(data,p),data:()=>Object.hasOwn(data,p)?copy(data[p]):undefined,metadata:meta});
function listen(read,fn,err){const l={read,fn,err,last:null};listeners.add(l);queueMicrotask(()=>emit(l));return()=>listeners.delete(l)}
function emit(l){if(!listeners.has(l))return;try{const s=l.read(),key=JSON.stringify(s.docs?s.docs.map(d=>[d.id,d.data()]):[s.exists,s.data()]);if(key!==l.last){l.last=key;l.fn(s)}}catch(e){if(l.err)l.err(e);else console.error(e)}}
function save(next){localStorage.setItem(KEY,JSON.stringify(next));data=next;for(const l of listeners)queueMicrotask(()=>emit(l))}
function doc(p){return {id:p.split('/').pop(),path:p,get:async()=>snap(p),set:async d=>save({...data,[p]:copy(d)}),update:async d=>{if(!Object.hasOwn(data,p))throw Error('Document missing');save({...data,[p]:{...data[p],...copy(d)}})},delete:async()=>{const n={...data};delete n[p];save(n)},onSnapshot:(f,e)=>listen(()=>snap(p),f,e),collection:c=>col(p+'/'+c),acquire:async()=>({acquired:true})}}
function col(p,w=[],o=null,n=0){const read=()=>{let ds=Object.keys(data).filter(k=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/')).map(snap);for(const [f,op,v] of w){if(op!=='==')throw Error('Unsupported query: '+op);ds=ds.filter(d=>d.data()[f]===v)}if(o)ds.sort((a,b)=>{const x=a.data()[o[0]],y=b.data()[o[0]];return(x<y?-1:x>y?1:0)*(o[1]==='desc'?-1:1)});if(n)ds=ds.slice(0,n);return{docs:ds,size:ds.length,empty:!ds.length,metadata:meta,docChanges:()=>[]}};return{path:p,doc:id=>doc(p+'/'+(id||crypto.randomUUID())),add:async d=>{const r=doc(p+'/'+crypto.randomUUID());await r.set(d);return r},where:(f,op,v)=>col(p,[...w,[f,op,v]],o,n),orderBy:(f,d='asc')=>col(p,w,[f,d],n),limit:k=>col(p,w,o,k),get:async()=>read(),onSnapshot:(f,e)=>listen(read,f,e)}}
const user={me:async()=>({...profile}),isOwner:async()=>true,canEdit:async()=>true,can:async()=>true,id:async()=>profile.id,name:async()=>profile.name,email:async()=>profile.email,avatarUrl:async()=>null,profiles:async ids=>Object.fromEntries([].concat(ids).map(id=>[id,id===profile.id?profile:{id,name:id,email:null}])),search:async()=>[]};
const downloads={save:async({filename,data})=>{const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);return{status:'saved'}}};
window.MSM_FIREBASE={ownerEmail:'',notifyEmail:'',firebase:null};
window.claude={use:async n=>({db:{doc,collection:col},user,downloads})[n]||null};
window.msmSignOut=()=>location.reload();
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{data=JSON.parse(e.newValue);for(const l of listeners)emit(l)}catch{}}});
})();