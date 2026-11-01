import {op,session,digest} from './client.js';
let database;
function db(){return database??=new Promise((resolve,reject)=>{const req=indexedDB.open('tmx-trip-evidence-v1',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('jobs',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function store(mode,act){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('jobs',mode);const req=act(tx.objectStore('jobs'));tx.oncomplete=()=>resolve(req.result);tx.onabort=()=>reject(tx.error||Error('Photo storage unavailable'))})}
export async function jpeg(file,limit=80000){if(!file)throw Error('Choose a photo');
 const image=await createImageBitmap(file);
 try{const canvas=document.createElement('canvas');let scale=Math.min(1,1600/Math.max(image.width,image.height));
 for(let attempt=0;attempt<12;attempt++){canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.8));if(blob&&blob.size<=limit)return blob;scale*=0.78}
 throw Error('Choose a smaller photo')}finally{image.close()}}
export async function base64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
const change=()=>dispatchEvent(new Event('photochange'));
export async function jobs(){const owner=session()?.user.id;return (await store('readonly',s=>s.getAll())).filter(j=>j.owner===owner).sort((a,b)=>b.created-a.created)}
async function save(j){await store('readwrite',s=>s.put(j));change()}
function sameOwner(j){if(j.owner!==session()?.user.id)throw Error('Sign in to the original account')}
export async function commit(job){
 sameOwner(job);const r=await op('km.submitPendingPhoto',{action:job.action,fields:job.fields},job.id);
 if(job.action==='km.start' && r.tripStatus==='In Progress' && !r.confirmedOpenTrips?.some(t=>t.source_trip_id===job.fields.tripId))throw Error('Open trip confirmation missing');
 job.phase='upload';await save(job);return r
}
export async function submitTrip(action,fields,file){
 const owner=session().user.id,blob=await jpeg(file);
 const pending=(await jobs()).find(j=>j.phase==='confirm');
 if(pending)throw Error('Resolve the previous pending trip in Photo progress first');
 const job={owner,action,fields:{...fields,photoBytes:blob.size,photoSha256:await digest(await blob.arrayBuffer())},blob,id:crypto.randomUUID(),phase:'confirm',created:Date.now()};
 await save(job);let r;try{r=await commit(job)}catch(e){
 if(e.status>=400&&e.status<500&&![401,408,429].includes(e.status)){await store('readwrite',s=>s.delete(job.id));change()}throw e}
 void drain();return r
}
let running=false;
export async function drain(){if(running||!session())return;running=true;
 try{for(const j of await jobs()){if(j.phase==='done')continue;sameOwner(j);try{
 if(j.phase==='confirm'){const s=await op('km.pendingPhoto.status',{photoRequestId:j.id});if(!s.found)continue;j.phase='upload';await save(j)}
 sameOwner(j);await op('km.pendingPhoto.upload',{photoRequestId:j.id,base64:await base64(j.blob)});
 j.phase='done';delete j.blob;delete j.fields.photoSha256;await save(j)
 }catch{continue}}}finally{running=false}}
export async function retry(j){sameOwner(j);if(j.phase==='confirm')await commit(j);await drain();change()}
export async function discardUnsent(j){sameOwner(j);if(j.phase!=='confirm')throw Error('This trip was already confirmed');const r=await op('km.pendingPhoto.status',{photoRequestId:j.id});if(r.found)throw Error('Trip confirmed. Retry the photo upload.');await store('readwrite',s=>s.delete(j.id));change()}
window.addEventListener('online',drain);setInterval(()=>{if(session()&&navigator.onLine)void drain().catch(()=>{})},30000);
