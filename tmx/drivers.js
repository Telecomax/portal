import {all,write} from './client.js';
const $=id=>document.getElementById(id);
let drivers=[],editing=null,busy=false;
export async function loadDrivers(){drivers=await all('drivers.list');render()}
function render(){
 const box=$('driverRows');box.replaceChildren();
 const query=$('driverSearch').value.toLowerCase();
 for(const d of drivers.filter(x=>x.name.toLowerCase().includes(query))){
  const row=document.createElement('div');row.className='card';
  const text=document.createElement('span');text.textContent=d.name+' — '+(d.vehicles?.length?d.vehicles:[d.vehicle_id]).join(' / ')+(d.active?'':' (inactive)');
  const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='Edit';edit.onclick=()=>form(d);row.append(text,' ',edit);box.append(row);
 }
}
function form(d){
 $('driverDelete').hidden=!d;
 editing=d||null;$('driverName').value=d?.name||'';$('driverName').disabled=!!d;
 $('driverVehicles').value=(d?.vehicles?.length?d.vehicles:d?[d.vehicle_id]:[]).join('\n');
 $('driverDefault').value=d?.vehicle_id||'';$('driverCity').value=d?.base_city||'';
 $('driverFb').value=d?.default_fb_km??'';$('driverActive').checked=d?.active??true;
 $('oldVehicle').value='';$('newVehicle').value='';$('driverCorrection').hidden=!d;
 $('driverEditor').hidden=false;
}
$('driverSearch').oninput=render;$('newDriver').onclick=()=>form(null);
$('driverCancel').onclick=()=>{$('driverEditor').hidden=true};
$('driverForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 let vehicles=$('driverVehicles').value.split('\n').map(x=>x.trim()).filter(Boolean),vehicleId=$('driverDefault').value.trim();
 const oldVehicleId=$('oldVehicle').value.trim(),newVehicleId=$('newVehicle').value.trim();
 if(oldVehicleId&&newVehicleId){vehicles=vehicles.map(x=>x===oldVehicleId?newVehicleId:x);if(vehicleId===oldVehicleId)vehicleId=newVehicleId;}
 const data={name:$('driverName').value.trim(),vehicles,vehicleId:vehicleId||vehicles[0],baseCity:$('driverCity').value.trim(),defaultFbKm:$('driverFb').value.trim()===''?null:Number($('driverFb').value),active:$('driverActive').checked,oldVehicleId,newVehicleId};
 if(editing){data.id=editing.id;data.expected=editing;}
 busy=true;$('driverSave').disabled=true;$('message').textContent='Saving driver…';
 try{const out=await write('drivers.save',data);await loadDrivers();$('driverEditor').hidden=true;$('message').textContent='Driver saved. '+out.correctedTrips+' historical trips corrected.';}
 catch(e){$('message').textContent=e.message;}
 finally{busy=false;$('driverSave').disabled=false;}
};

$('driverDelete').onclick=async()=>{
 if(busy||!editing)return;
 if(!confirm('Delete '+editing.name+' from driver registration? Historical trips, photos and payments will remain available.'))return;
 busy=true;$('driverDelete').disabled=$('driverSave').disabled=true;
 try{await write('drivers.delete',{id:editing.id,expected:editing});editing=null;$('driverEditor').hidden=true;await loadDrivers();$('message').textContent='Driver deleted. Historical records preserved.';}
 catch(e){$('message').textContent=e.message;}
 finally{busy=false;$('driverDelete').disabled=$('driverSave').disabled=false;}
};
