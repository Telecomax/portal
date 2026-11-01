/* Explicit adapter transport for the original HTML pages. Other fetches use the browser unchanged. */
(function(){
 const nativeFetch=window.fetch.bind(window);
 const module=import('/tmx/adapter.js');
 const stored=JSON.parse(sessionStorage.getItem('telecomax.web.session.v1')||'null');
 const nativeKeys=['tmx_portal_user','tmx_km_pm_token','tmx_km_pm_name','tmx_km_admin_token','tmx_km_admin_name','tmx_km_finance_token','tmx_km_finance_name','tmx_km_engineer_token','tmx_km_engineer_name','custody.pm','custody.finance','custody.admin'];
 nativeKeys.push('tmx_km_app_admin_token','tmx_km_app_admin_name','tmx_km_app_finance_token','tmx_km_app_finance_name');
 if(!stored){
  for(const key of nativeKeys)sessionStorage.removeItem(key);
  localStorage.removeItem('tmx_portal_user_persist');
  for(const key of ['custody.session','custody.cfg','custody.names']){localStorage.removeItem(key);sessionStorage.removeItem(key)}
  if(location.hash.includes('sso='))history.replaceState(null,'',location.pathname+location.search);
 }else if(!location.pathname.endsWith('/portal.html')&&location.pathname!=='/index.html'&&location.pathname!=='/'){
  // Reuse the unified session when opening an original module in the same origin.
  if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#sso=unified');
 }
 window.TMX={
  async fetch(input,init){
   const url=new window.URL(String(input),location.href);
   if(!url.pathname.startsWith('/_legacy/'))return nativeFetch(input,init);
   const kind=url.pathname.split('/').pop();
   const raw=init?.body?JSON.parse(init.body):Object.fromEntries(url.searchParams);
   const q=raw.data||raw;
   try{const api=await module;const result=await api.dispatch(kind,raw.action,q);return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}})}
   catch(error){return new Response(JSON.stringify({ok:false,error:error.message,expired:error.status===401}),{headers:{'Content-Type':'application/json'}})}
  },
  async originalReceipt(id){const {op}=await import('/tmx/client.js');const r=await op('evidence.read',{expenseId:id});const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.click()},
  async logout(){try{await(await module).signout()}finally{
   for(const key of nativeKeys)sessionStorage.removeItem(key);localStorage.removeItem('tmx_portal_user_persist');
   for(const key of ['custody.session','custody.cfg','custody.names']){localStorage.removeItem(key);sessionStorage.removeItem(key)}
   location.replace('/index.html');
  }}
 };
 document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  const label=target.textContent.trim();
  if(/^(log\s*out|sign\s*out|خروج)$/i.test(label)){event.preventDefault();event.stopImmediatePropagation();void TMX.logout()}
 },true);
 window.addEventListener('signedout',()=>{location.replace('/index.html')});
 window.addEventListener('tmx-login',()=>setTimeout(()=>{
  if(typeof window.refreshLists==='function')void window.refreshLists(true);
  if(typeof window.init==='function')void window.init();
 },0));
 window.addEventListener('DOMContentLoaded',()=>{
  window.openOriginalFor=id=>TMX.originalReceipt(id).catch(e=>alert(e.message));
  // The legacy sites store local drafts under sheet-era keys. Keep those separate
  // from the DEV queue so an old submission cannot be replayed into the new database.
  if(typeof window.refreshLists==='function'&&stored)void window.refreshLists(true);
 });
})();

