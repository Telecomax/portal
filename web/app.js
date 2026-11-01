import {session,login,logout,op,today} from './client.js';
import {$,el,btn,form,field,card,notice,money} from './ui.js';
import {balances,users,custodyReview,managers,admin,has} from './management.js';
import {trips,expense,history} from './engineer.js';
import {monitor,allowances,audit} from './audit.js';
import {drain} from './photos.js';
const app=document.body.dataset.app,content=$('main'),nav=$('nav'),title=$('#who');
const engineer=()=>has('engineer','super_admin');
const screens=[
 ['trips','Trips App','km',engineer,trips],['history','Trip History','km',engineer,b=>history(b,false)],
 ['expense','New Custody Expense','custody',engineer,expense],['custody-history','Custody History','custody',engineer,b=>history(b,true)],
 ['monitor','Trip Monitoring','km',managers,monitor],['allowances','Allowances Acceptance','km',managers,allowances],
 ['rent','Pay Cars Rent','km',managers,b=>audit(b,'rent')],['audit','KM Finance Audit','km',managers,b=>audit(b,'audit')],
 ['photos','Trip Photo Audit','km',managers,b=>audit(b,'photos')],['balances','Engineer Balances','km',managers,b=>balances(b,tab())],
 ['review','Custody Review','custody',managers,b=>custodyReview(b)],['transfers','Custody Transfer','custody',managers,b=>custodyReview(b,true)],
 ['users','Users Managements','both',admin,users]
];
function tab(){return new URLSearchParams(location.search).get('tab')==='solfa'?'Add Solfa':'Balances'}
function allowed(s){return (app==='portal'||app===s[2]||s[2]==='both'||s[3]!==engineer)&&s[3]()}
function route(){if(location.hash)return location.hash.slice(1);const v=new URLSearchParams(location.search).get('view')||'home';
 return ({start:'trips',finish:'trips',history:app==='custody'?'custody-history':'history',home:app==='custody'&&new URLSearchParams(location.search).has('view')?'expense':'home'})[v]||v}
function go(key){if(location.hash==='#'+key)render();else location.hash=key}
let revision=0, accessOwner, accessPromise;
async function visibleScreens(){
 const visible=screens.filter(allowed),u=session().user;
 if(!engineer())return visible;
 if(accessOwner!==u.id||!accessPromise){
  accessOwner=u.id;
  const permitted=async(action,data)=>{try{await op(action,data);return true}catch(e){if(e.status===403||e.message==='engineer link required')return false;throw e}};
  accessPromise=Promise.all([app==='custody'?false:permitted('km.open.check',{}),app==='km'?false:permitted('custody.history',{limit:1,paged:true})])
   .catch(e=>{accessPromise=null;throw e});
 }
 const [km,custody]=await accessPromise;
 return visible.filter(s=>s[3]!==engineer||(s[2]==='km'?km:custody));
}
async function render(){const epoch=++revision;nav.replaceChildren();content.replaceChildren();notice('');
 if(!session()){accessPromise=null;accessOwner=null;title.textContent='';const c=card(content,'Sign in / دخول');const [f,b]=form(c,'Sign in',async()=>{await login(name.value.trim(),pin.value);pin.value='';await render()});
 const name=field(f,'Login name','text','',true),pin=field(f,'Four-digit PIN','password','',true);pin.maxLength=4;pin.pattern='[0-9]{4}';pin.inputMode='numeric';pin.autocomplete='current-password';f.append(b);return}
 const u=session().user;title.textContent=u.name+' · '+u.roles.join(' / ');
 nav.append(btn('Dashboard',()=>go('home')),btn('Sign out',async()=>{try{await logout()}finally{await render()}}));
 const key=route();let visible;try{visible=await visibleScreens()}catch(e){notice(e.message,true);content.append(btn('Retry',render));return}if(epoch!==revision)return;
 if(key==='home'){
 const panel=el('div',null,'grid');content.append(panel);for(const [id,label] of visible)panel.append(btn(label,()=>go(id)));
 if(managers()&&app==='portal'){const c=card(content,'Today in operations');try{const [a,b]=await Promise.all([op('km.monitor.page',{view:'open',limit:1}),op('custody.review.page',{dates:[today()]})]);if(epoch===revision)c.append(el('p',a.totalMatched+' open trips · '+b.totalCount+' expenses today · '+money(b.totalAmount)))}catch(e){c.append(el('p',e.message))}}
 return}
 const screen=visible.find(s=>s[0]===key);
 if(!screen){content.append(el('h2','Workspace unavailable'),el('p','Choose a card from your dashboard.'));return}
 content.append(el('h1',screen[1]));const pane=el('div');content.append(pane);
 try{await screen[4](pane)}catch(e){if(epoch===revision){notice(e.message,true);pane.append(btn('Retry',render))}}
}
window.addEventListener('hashchange',render);window.addEventListener('signedout',()=>{render();notice('Your session has ended. Please sign in again.',true)});
render();if(session())void drain().catch(()=>{});


