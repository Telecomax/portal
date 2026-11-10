import {all,write} from './client.js';
import {progress,result} from './admin-feedback.js';
const $=id=>document.getElementById(id);
let drivers=[],editing=null,busy=false,editMode=false;
export async function loadDrivers(){drivers=await all('drivers.list');render()}
export async function openDrivers(edit){
 editMode=edit;$('driverFilters').hidden=!edit;$('driverRows').hidden=!edit;closeOptions();
 if(!edit){form(null);return}
 $('driverEditor').hidden=true;$('driverRows').textContent='Loading drivers…';await loadDrivers();
}
function render(){
 const box=$('driverRows');box.replaceChildren();const query=$('driverSearch').value.toLowerCase();
 for(const d of drivers.filter(x=>x.name.toLowerCase().includes(query))){
  const row=document.createElement('div');row.className='card driver-row';
  const text=document.createElement('span');text.textContent=d.name+' — '+(d.vehicles?.length?d.vehicles:[d.vehicle_id]).join(' / ')+(d.active?'':' (inactive)');
  const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='Edit';edit.onclick=()=>form(d);row.append(text,edit);box.append(row);
 }
}
function form(d){
 $('driverDelete').hidden=!d;editing=d||null;$('driverTitle').textContent=d?'Edit Driver':'Add Driver';
 $('driverName').value=d?.name||'';$('driverName').disabled=!!d;
 $('driverVehicles').value=(d?.vehicles?.length?d.vehicles:d?[d.vehicle_id]:[]).join('\n');
 $('driverDefault').value=d?.vehicle_id||'';$('driverCity').value=d?.base_city||'';
 $('driverFb').value=d?.default_fb_km??'';$('driverActive').checked=d?.active??true;
 $('oldVehicle').value='';$('newVehicle').value='';$('driverCorrection').hidden=!d;$('driverEditor').hidden=false;
}
function closeOptions(){$('driverOptions').style.display='none';$('driverSearch').setAttribute('aria-expanded','false')}
function options(full=false){
 const box=$('driverOptions');box.replaceChildren();
 function option(label,action){const b=document.createElement('button');b.type='button';b.className='opt';b.setAttribute('role','option');b.style.cssText='display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit';b.textContent=label;b.onclick=()=>{action();closeOptions()};box.append(b)}
 option('All Drivers',()=>{$('driverSearch').value='';render()});const q=full?'':$('driverSearch').value.toLowerCase();
 for(const d of drivers.filter(x=>x.name.toLowerCase().includes(q)))option(d.name,()=>{$('driverSearch').value=d.name;render();form(d)});
 box.style.display='block';$('driverSearch').setAttribute('aria-expanded','true');
}
$('driverSearch').oninput=()=>{render();options()};$('driverSearch').onclick=()=>options(true);$('driverSearch').onfocus=()=>options(true);
$('driverSearch').onkeydown=e=>{if(e.key==='Escape')closeOptions();if(e.key==='ArrowDown'){e.preventDefault();$('driverOptions').firstElementChild?.focus()}};
document.addEventListener('click',e=>{if(!$('driverSearch').parentElement.contains(e.target))closeOptions()});
$('driverCancel').onclick=()=>{if(editMode)$('driverEditor').hidden=true;else $('editTab').click()};
$('driverForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 let vehicles=$('driverVehicles').value.split('\n').map(x=>x.trim()).filter(Boolean),vehicleId=$('driverDefault').value.trim();
 const oldVehicleId=$('oldVehicle').value.trim(),newVehicleId=$('newVehicle').value.trim();
 if(Boolean(oldVehicleId)!==Boolean(newVehicleId))return result('Enter both the old and correct vehicle IDs.',false);
 if(oldVehicleId&&newVehicleId){vehicles=vehicles.map(x=>x===oldVehicleId?newVehicleId:x);if(vehicleId===oldVehicleId)vehicleId=newVehicleId;}
 const data={name:$('driverName').value.trim(),vehicles,vehicleId:vehicleId||vehicles[0],baseCity:$('driverCity').value.trim(),defaultFbKm:$('driverFb').value.trim()===''?null:Number($('driverFb').value),active:$('driverActive').checked,oldVehicleId,newVehicleId};
 if(editing){data.id=editing.id;data.expected=editing;}
 busy=true;$('driverSave').disabled=true;progress('Saving driver…');
 try{const out=await write('drivers.save',data);if(editMode){await loadDrivers();$('driverEditor').hidden=true}else form(null);const text='Driver saved. '+out.correctedTrips+' historical trips corrected.';$('message').textContent=text;result(text)}
 catch(e){$('message').textContent=e.message;result(e.message,false)}finally{busy=false;$('driverSave').disabled=false}
};
$('driverDelete').onclick=async()=>{
 if(busy||!editing||!confirm('Delete '+editing.name+' from driver registration? Historical trips, photos and payments will remain available.'))return;
 busy=true;$('driverDelete').disabled=$('driverSave').disabled=true;progress('Deleting driver…');
 try{await write('drivers.delete',{id:editing.id,expected:editing});editing=null;$('driverEditor').hidden=true;await loadDrivers();const text='Driver deleted. Historical records preserved.';$('message').textContent=text;result(text)}
 catch(e){$('message').textContent=e.message;result(e.message,false)}finally{busy=false;$('driverDelete').disabled=$('driverSave').disabled=false}
};
