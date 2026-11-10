import {openDrivers} from './drivers.js';
import {progress,result} from './admin-feedback.js';
import {session,write} from './client.js';
import {allUsers,invalidate} from './records.js';
const $=id=>document.getElementById(id);
let users=[],editing=null;
const roles=['engineer','rigger','pm','finance','admin'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(text){$('message').textContent=text}
function form(user){
 editing=user||null;
 $('editorTitle').textContent=user?'Edit User':'Add User';
 $('displayName').value=user?.display_name||'';
 $('fullName').value=user?.full_name||'';
 $('loginName').value=user?.login_name||'';
 $('pin').value='';$('pin').required=!user;
 $('status').value=user?.status||'active';
 $('baseCity').value=user?.base_city||'';
 $('custodyLimit').value=user?.custody_limit??0;
 $('kmAccess').checked=!!user?.km_access;
 $('custodyAccess').checked=!!user?.custody_access;
 for(const role of roles)$('role-'+role).checked=user?.roles.includes(role)||false;
 $('editor').hidden=false;
 $('editor').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
 const query=$('userSearch').value.toLowerCase();
 const filtered=users.filter(u=>[u.display_name,u.login_name].some(v=>v.toLowerCase().includes(query)));
 $('rows').innerHTML=filtered.map(u=>`<tr><td>${esc(u.display_name)}<div class="muted">${esc(u.login_name)}</div></td><td>${esc(u.roles.join(', '))}</td><td>${esc([u.km_access?'KM':'',u.custody_access?'Custody':''].filter(Boolean).join(', ')||'None')}</td><td>${esc(u.status)}</td><td><button class="btn" data-id="${esc(u.id)}">Edit / Reset PIN</button></td></tr>`).join('');
 for(const button of $('rows').querySelectorAll('button'))button.onclick=()=>form(users.find(u=>u.id===button.dataset.id));
}
async function load(){
 users=await allUsers();
 render();
}
function closeOptions(){$('userOptions').style.display='none';$('userSearch').setAttribute('aria-expanded','false')}
function options(){
 const query=$('userSearch').value.toLowerCase(),box=$('userOptions');
 box.replaceChildren();
 for(const user of users.filter(u=>[u.display_name,u.login_name].some(v=>v.toLowerCase().includes(query)))){
  const option=document.createElement('button');option.type='button';option.className='opt';option.setAttribute('role','option');option.style.cssText='display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit';option.textContent=user.display_name+' — '+user.login_name;
  option.onclick=()=>{$('userSearch').value=user.login_name;render();closeOptions();$('userSearch').focus();closeOptions()};box.append(option);
 }
 box.style.display=box.childElementCount?'block':'none';$('userSearch').setAttribute('aria-expanded',String(!!box.childElementCount));
}
$('userSearch').oninput=()=>{render();options()};$('userSearch').onfocus=options;$('userSearch').onclick=options;
$('userSearch').onkeydown=event=>{if(event.key==='Escape')closeOptions();if(event.key==='ArrowDown'){event.preventDefault();$('userOptions').firstElementChild?.focus()}};
document.addEventListener('click',event=>{if(!$('userSearch').parentElement.contains(event.target))closeOptions()});
function tab(id){
 for(const name of ['addTab','editTab','driverTab','editDriverTab']){$(name).classList.toggle('primary',id===name);$(name).setAttribute('aria-selected',String(id===name))}
 $('list').hidden=id!=='editTab';$('editor').hidden=true;$('drivers').hidden=!['driverTab','editDriverTab'].includes(id);message('');closeOptions();
}
$('driverTab').onclick=()=>{tab('driverTab');openDrivers(false).catch(e=>message(e.message))};
$('editDriverTab').onclick=()=>{tab('editDriverTab');openDrivers(true).catch(e=>message(e.message))};
$('editTab').onclick=()=>{tab('editTab');load().catch(e=>message(e.message))};
$('addTab').onclick=()=>{tab('addTab');form(null)};
$('cancel').onclick=()=>{$('editor').hidden=true;$('editTab').click()};
$('generate').onclick=()=>{const value=crypto.getRandomValues(new Uint32Array(1))[0];$('pin').value=String(value%10000).padStart(4,'0');$('pin').type='text'};
$('userForm').onsubmit=async event=>{
 event.preventDefault();
 const selected=roles.filter(r=>$('role-'+r).checked);
 if(!selected.length)return message('Select at least one role.');
 const data={fullName:$('fullName').value.trim(),displayName:$('displayName').value.trim(),loginName:$('loginName').value.trim(),status:$('status').value,
  roles:[...selected,...(editing?.roles.filter(r=>!roles.includes(r))||[])],baseCity:$('baseCity').value.trim(),custodyLimit:Number($('custodyLimit').value),kmAccess:$('kmAccess').checked,custodyAccess:$('custodyAccess').checked};
 if(editing){data.id=editing.id;data.version=editing.credential_version}
 if($('pin').value)data.pin=$('pin').value;
 $('save').disabled=true;message('Saving user…');progress('Saving user…');
 try{await write('users.save',data);invalidate();await load();tab('editTab');message('User saved successfully.');result('User saved successfully.');$('pin').value='';$('pin').type='password'}
 catch(error){message(error.message);result(error.message,false)}finally{$('save').disabled=false}
};
if(!session()?.user.roles.some(r=>['admin','super_admin'].includes(r))){document.querySelector('main').replaceChildren(document.createTextNode('Admin access required.'));}
else $('addTab').click();
