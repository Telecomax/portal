import {op,write,today,digest} from './client.js';
import {el,field,form,select,options,btn,check,facts,card,pages,money,notice} from './ui.js';
import {expenseFacts,evidence} from './management.js';
import {jpeg,base64,submitTrip,jobs,retry,discardUnsent,drain} from './photos.js';
import {tripCamera} from './camera.js';
function gps(){
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported by this browser.'));
    const requestedAt = Date.now();
    navigator.geolocation.getCurrentPosition(
      pos => {
        const ageMs = Date.now() - pos.timestamp;
        const accuracy = Number(pos.coords.accuracy);
        if (!Number.isFinite(pos.coords.latitude) || !Number.isFinite(pos.coords.longitude) ||
            !Number.isFinite(pos.timestamp) || pos.timestamp < requestedAt - 5000 ||
            ageMs > 15000 || ageMs < -5000) {
          return reject(new Error('Location is outdated. Please try again with GPS enabled.'));
        }
        if (!Number.isFinite(accuracy) || accuracy > 200) {
          return reject(new Error('Location accuracy is too low. Move to an open area and try again.'));
        }
        resolve({accuracy,latitude: Number(pos.coords.latitude.toFixed(7)), longitude: Number(pos.coords.longitude.toFixed(7))});
      },
      err => reject(new Error(err?.code === 1 ? 'Location permission is required to submit the trip.' : 'Could not get a fresh location. Check GPS and try again.')),
      {enableHighAccuracy:true, maximumAge:0, timeout:20000}
    );
  });
}

export function tripFacts(c,t){facts(c,[['Date',t.trip_date],['Engineer',t.engineer_name],['Driver',t.driver_name],['Vehicle',t.vehicle_id],['Project',t.project_code],['Task',t.task],['Area',t.area],['Status',t.status],['Started',t.started_at],['Finished',t.finished_at],['Start KM',t.start_odometer],['Finish KM',t.finish_odometer],['Total KM',t.total_km],['Static hours',t.static_hours],['Spent (EGP)',t.amount_spent_exact],['PM',t.pm_status],['Finance',t.finance_status],['Photo upload',t.photoUploadStatus]]);
 for(const [label,lat,lng] of [['Start location',t.start_latitude,t.start_longitude],['Finish location',t.finish_latitude,t.finish_longitude],...(t.task_locations||[]).map((l,i)=>['Task location '+(i+1),l.latitude,l.longitude])]){
  if(lat==null||lng==null||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))continue;const link=el('a',label);link.href='https://maps.google.com/?q='+encodeURIComponent(lat+','+lng);link.target='_blank';link.rel='noopener noreferrer';c.append(link)}
}
export async function trips(box){
 const [cfg,result]=await Promise.all([op('config'),op('km.open',{limit:31})]);box.replaceChildren();
 const t=result.trips[0],start=!t, c=card(box,start?'Start Trip':'Finish Trip');
 if(t)tripFacts(c,t);
 const [f,b]=form(c,start?'Start trip':'Finish trip',async()=>{
   const selectedPhoto=image.file();const coords=await gps(),fields=start?{tripId:crypto.randomUUID(),driver:driver.value,vehicle:vehicle.value,projectName:project.value,task:task.value,
    startKm:Number(km.value),startLatitude:coords.latitude,startLongitude:coords.longitude}:{
    tripId:t.source_trip_id,finishKm:Number(km.value),staticHours:Number(hours.value),staticKm:Number(staticKm.value),overNightStay:overnight.checked,finishLatitude:coords.latitude,finishLongitude:coords.longitude};
   const r=await submitTrip(start?'km.start':'km.finish',fields,selectedPhoto);await trips(box);notice(start?'Trip started':'Trip finished · '+money(r.amountToPay))
 });
 let driver,vehicle,project,task,hours,overnight,staticKm;
 if(start){driver=select(f,'Driver',cfg.drivers.map(d=>d.name),'Choose driver');driver.required=true;
   vehicle=select(f,'Vehicle',[],'Select driver first');driver.onchange=()=>{const d=cfg.drivers.find(d=>d.name===driver.value),skip=['rent','item transfer'].includes(driver.value.toLowerCase());options(vehicle,d?.vehicles||[],'Choose vehicle');vehicle.required=!skip;vehicle.disabled=skip;image.setDriver(driver.value)};
   project=select(f,'Project',cfg.projects.map(p=>p.code),'Choose project');project.required=true;task=field(f,'Task','text','',true)
 }
 const km=field(f,start?'Starting odometer':'Finish odometer','number','',true);km.min=String(t?.start_odometer||0);
 const image=tripCamera(f,start?'Start photo':'Finish photo',gps);image.setDriver(t?.driver_name||'');
 if(t){overnight=check(f,'Overnight stay');hours=field(f,'Static hours','number','0',true);hours.min='0';hours.max='24';staticKm=field(f,'Static KM','number','0');staticKm.min='0';
   const estimate=el('output');function calc(){const delta=Number(km.value)-Number(t.start_odometer),rate=Number(t.applied_km_rate);
   estimate.textContent=km.value&&delta>=0?'Trip '+delta.toLocaleString()+' KM · Static payment '+money(Number(hours.value)*10*rate)+' · Estimated amount '+money((delta+Number(hours.value)*10)*rate+(overnight.checked?0:Number(t.lastForthBack||0)*rate)):''}
   f.append(estimate);for(const i of [km,hours,overnight])i.oninput=calc;
   c.append(btn('Record task location',async()=>{const p=await gps();const r=await write('km.location',{tripId:t.source_trip_id,latitude:p.latitude,longitude:p.longitude,accuracy:p.accuracy});notice([r.city,r.governorate].filter(Boolean).join(' · '))}))
 }f.append(b);
 const progress=card(box,'Trip photos');async function draw(){const list=await jobs();progress.replaceChildren(el('h2','Trip photos'));
 const grouped=new Map();for(const j of list){const id=j.fields.tripId;if(!grouped.has(id))grouped.set(id,{});grouped.get(id)[j.action]=j}
 for(const pair of [...grouped.values()].slice(0,31)){const row=el('div',null,'filterrow');for(const [a,label] of [['km.start','Start'],['km.finish','Finish']]){
 const j=pair[a];const cell=el('div',label+' Photo → '+(!j?'—':j.phase==='done'?'Uploaded':'Pending'));if(j&&j.phase!=='done'){cell.append(btn('Retry',async()=>{await retry(j);await trips(box)}));
 if(j.phase==='confirm')cell.append(btn('Discard unsubmitted request',async()=>{if(confirm('Discard this unsubmitted request?'))await discardUnsent(j)}))}row.append(cell)}progress.append(row)}
 if(!list.length)progress.append(el('p','No photos queued on this browser.'))}
 await draw();const listener=()=>{if(progress.isConnected)void draw().catch(e=>notice(e.message,true));else window.removeEventListener('photochange',listener)};window.addEventListener('photochange',listener);void drain().catch(()=>{})
}
export function history(box,custody){const filter=card(box),month=field(filter,'Month','month',today().slice(0,7)),out=el('div');box.append(out);
 const load=()=>{const m=month.value;return pages(out,offset=>op(custody?'custody.history':'km.history.page',{months:m?[m]:[],offset,limit:31,paged:true}),(list,r)=>{
 const c=card(list,custody?money(r.amount):[r.trip_date,r.project_code].filter(Boolean).join(' · '));if(custody)expenseFacts(c,r);else{tripFacts(c,r);photoButtons(c,r)}},r=>custody?r.totalCount+' expenses · Outstanding '+money(r.outstanding)+' of '+money(r.custodyLimit):r.totalMatched+' trips')};filter.append(btn('Apply',load));return load()}
export function photoButtons(c,t){for(const type of ['start','finish'])c.append(btn('View '+type+' photo',()=>evidence({tripId:t.source_trip_id,photoType:type,variant:'original'})))}
export async function expense(box){const cfg=await op('config');await op('custody.history',{limit:1,paged:true});
 const [f,b]=form(card(box,'Submit expense'),'Submit expense',async()=>{
  if(!file.files.length&&!reason.value.trim())throw Error('Choose a receipt or enter why it is missing');
  let receiptKey;if(file.files.length){const photo=await jpeg(file.files[0],300000);
   const upload=await op('evidence.drive.upload',{app:'custody',contentType:'image/jpeg',base64:await base64(photo)},'receipt-'+await digest(await photo.arrayBuffer()));receiptKey=upload.key}
  await write('custody.submit',{date:date.value,amount:amount.value,category:category.value,project:project.value,description:desc.value,...(receiptKey?{receiptKey}:{noReceiptReason:reason.value})});f.reset();date.value=today();notice('Expense submitted')
 });
 const date=field(f,'Expense date','date',today(),true),amount=field(f,'Amount (EGP)','number','',true);amount.min='0.01';amount.step='.01';
 const project=select(f,'Project',cfg.projects.map(p=>p.code),'Choose project'),category=select(f,'Category',cfg.categories,'Choose category');project.required=category.required=true;
 const desc=field(f,'Description','text','',true),file=field(f,'Receipt','file');file.accept='image/*';const reason=field(f,'Reason if there is no receipt');f.append(b)
}



