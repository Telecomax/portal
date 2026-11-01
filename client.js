// Each web project forwards these same-origin routes to the Telecomax DEV API.
const key = 'telecomax.web.session.v1';
export const session = () => JSON.parse(sessionStorage.getItem(key) || 'null');
let renewing;
async function post(path, body, token) {
  const response = await fetch('/api/' + path, {method:'POST', cache:'no-store',
    headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})},
    body:JSON.stringify(body)});
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    const error = new Error((result.error || 'Service unavailable').replaceAll('_',' '));
    error.status = response.status;
    throw error;
  }
  return result;
}
function save(value) { sessionStorage.setItem(key, JSON.stringify(value)); return value; }
export async function login(name,pin) { return save(await post('auth/unified-login',{name,pin})); }
export async function logout() {
  if (renewing) await renewing.catch(()=>{});
  const active=session();
  sessionStorage.removeItem(key);
  if(active) await post('auth/unified-logout',{refreshToken:active.refreshToken});
}
async function renew(previous) {
  const active=session();
  if(!active || active.user.id!==previous.user.id) throw Error('Sign in again');
  if(active.token!==previous.token) return active;
  if(!renewing) renewing=post('auth/unified-refresh',{refreshToken:active.refreshToken})
    .then(next=>{if(session()?.refreshToken!==active.refreshToken) throw Error('Session changed');return save(next)})
    .catch(e=>{if(e.status===401 && session()?.refreshToken===active.refreshToken){sessionStorage.removeItem(key);dispatchEvent(new Event('signedout'))}throw e})
    .finally(()=>{renewing=null});
  return renewing;
}
export async function op(action,data={},requestId) {
  const active=session(); if(!active) throw Error('Sign in again');
  const body={action,data,requestId};
  try{return await post('operations',body,active.token)}
  catch(e){if(e.status!==401)throw e; return post('operations',body,(await renew(active)).token)}
}
export async function digest(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
}
// Retain only an opaque request ID and a payload fingerprint after an uncertain response.
// PIN-bearing requests keep their retry identity in memory.
const privateRetries=new Map();
export async function write(action,data) {
  const fingerprint=await digest(new TextEncoder().encode(JSON.stringify([session().user.id,action,data])));
  const k='tmx.retry.'+fingerprint, secret=action==='users.save';
  const id=(secret?privateRetries.get(k):sessionStorage.getItem(k)) || crypto.randomUUID();
  if(secret)privateRetries.set(k,id);else sessionStorage.setItem(k,id);
  const result=await op(action,data,id);
  if(secret)privateRetries.delete(k);else sessionStorage.removeItem(k);
  return result;
}
export const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Cairo'}).format(new Date());
export async function all(action,data={}) {
  const rows=[];
  for(;;){const r=await op(action,{...data,offset:rows.length,limit:31});rows.push(...r.items);
    if(!r.hasMore)return rows;if(!r.items.length)throw Error('Incomplete page');}
}
