import {session,op,write} from './client.js';
import {progress,result} from './admin-feedback.js';
const $=id=>document.getElementById(id);
let kind='KM',rows=[],projects=[],today='',editing=null,busy=false;
const money=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:6});
function tomorrow(){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
async function load(){
 $('addRate').disabled=$('refreshRates').disabled=true;$('rateMessage').textContent='Loading rates…';
 try{const out=await op('rates.list');rows=out.items;projects=out.projects;today=out.today;render();$('rateMessage').textContent=''}
 catch(e){$('rateMessage').textContent=e.message;throw e}finally{$('addRate').disabled=!today;$('refreshRates').disabled=false}
}
function render(){
 const box=$('rateRows');box.replaceChildren();const relevant=rows.filter(r=>r.kind===kind);
 const visible=relevant.filter(r=>r.effective_from>today||r===relevant.filter(x=>x.subject===r.subject&&x.effective_from<=today).sort((a,b)=>b.effective_from.localeCompare(a.effective_from))[0]);
 for(const row of visible){
  const future=row.effective_from>today,card=document.createElement('article');card.className='card';
  const title=document.createElement('h2');title.textContent=row.subject+' · '+(future?'Scheduled':'Current');
  const date=document.createElement('p');date.className='muted';date.textContent='Effective from '+row.effective_from;
  const value=document.createElement('div');value.className='rate-value';value.style.whiteSpace='pre-line';value.textContent=kind==='KM'?money(Number(row.rate_per_km)*10)+' EGP / 10 KM':`Normal: ${money(row.normal_amount)} EGP\nFriday: ${money(row.friday_amount)} EGP\nSaturday: ${money(row.saturday_amount)} EGP`;
  const actions=document.createElement('div');actions.className='rate-actions';const edit=document.createElement('button');edit.className='btn primary';edit.textContent='Edit';edit.onclick=()=>form(row);
  const del=document.createElement('button');del.className='btn danger';del.textContent='Delete';del.disabled=!future;del.title=future?'Delete unused future schedule':'Current and historical rates are protected';del.onclick=()=>remove(row);
  actions.append(edit,del);card.append(title,date,value,actions);box.append(card);
 }
 if(!visible.length)box.textContent='No rates found for this category.';
}
function form(row){
 editing=row?.effective_from>today?row:null;$('rateTitle').textContent=editing?'Edit scheduled rate':'Schedule future rate';
 $('kmFields').hidden=kind!=='KM';$('allowanceFields').hidden=kind==='KM';
 $('rateProject').replaceChildren(...projects.map(code=>{const o=document.createElement('option');o.value=o.textContent=code;return o}));$('rateProject').value=row?.subject||projects[0]||'';
 $('rateAmount').value=row?.rate_per_km!=null?Number(row.rate_per_km)*10:'';$('rateDistance').value=10;
 $('rateNormal').value=row?.normal_amount??'';$('rateFriday').value=row?.friday_amount??'';$('rateSaturday').value=row?.saturday_amount??'';
 for(const id of ['rateAmount','rateDistance','rateProject'])$(id).required=kind==='KM';for(const id of ['rateNormal','rateFriday','rateSaturday'])$(id).required=kind!=='KM';
 $('rateDate').min=tomorrow();$('rateDate').value=editing?.effective_from||tomorrow();$('rateEditor').showModal();
}
async function mutate(action,data){
 if(busy)return;busy=true;progress(action==='rates.delete'?'Deleting schedule…':'Saving rate…');$('rateSave').disabled=true;
 try{await write(action,data);$('rateEditor').close();await load();result(action==='rates.delete'?'Future rate deleted.':'Future rate saved successfully. Existing history is unchanged.')}
 catch(e){result(e.message,false)}finally{busy=false;$('rateSave').disabled=false}
}
function remove(row){if(confirm('Delete this future rate schedule? The current rate remains in effect.'))mutate('rates.delete',{kind:row.kind,id:row.id,expected:row.expected})}
$('rateForm').onsubmit=e=>{
 e.preventDefault();const data={kind,subject:$('rateProject').value,effectiveFrom:$('rateDate').value};if(editing){data.id=editing.id;data.expected=editing.expected}
 if(kind==='KM'){data.ratePerKm=Number($('rateAmount').value)/Number($('rateDistance').value);if(!Number.isFinite(data.ratePerKm)||data.ratePerKm<=0)return result('Enter a valid amount and distance.',false)}
 else{data.normal=Number($('rateNormal').value);data.friday=Number($('rateFriday').value);data.saturday=Number($('rateSaturday').value)}mutate('rates.save',data);
};
$('rateCancel').onclick=()=>{$('rateEditor').close()};$('addRate').onclick=()=>form(null);$('refreshRates').onclick=()=>load().catch(()=>{});
for(const tab of document.querySelectorAll('[data-kind]'))tab.onclick=()=>{kind=tab.dataset.kind;for(const t of document.querySelectorAll('[data-kind]')){t.classList.toggle('primary',t===tab);t.setAttribute('aria-selected',String(t===tab))}render()};
if(!session()?.user.roles.some(r=>['admin','super_admin'].includes(r)))document.querySelector('main').replaceChildren(document.createTextNode('Admin access required.'));
else load().catch(()=>{});
