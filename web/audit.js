import {op,write,today} from './client.js';
import {el,btn,card,field,select,options,check,dateFilters,pages,facts,money,notice,form} from './ui.js';
import {tripFacts,photoButtons} from './engineer.js';
import {admin,has} from './management.js';
import {payroll} from './payroll.js';
export function monitor(box){
 const f=card(box),view=select(f,'View',['Open trips','Today','All trips']),eng=select(f,'Engineer',[],'All'),project=select(f,'Project',[],'All'),date=dateFilters(f),out=el('div');box.append(out);
 const mode=()=>({'Open trips':'open','Today':'today','All trips':'all'})[view.value];let generation=0;
 async function related(){const g=++generation;try{date.wrap.hidden=mode()!=='all';const r=await op('km.monitor.facets',{view:mode(),today:today(),engineer:eng.value,project:project.value,months:date.data().months.join(','),dates:date.data().dates.join(',')});
 if(g===generation){date.suggest(r.dates);options(eng,[...new Set([eng.value,...r.engineers].filter(Boolean))]);options(project,[...new Set([project.value,...r.projects].filter(Boolean))])}}catch(e){notice(e.message,true)}}
 for(const i of [view,eng,project])i.onchange=related;date.wrap.addEventListener('selection',related);related();
 f.append(btn('Apply',()=>{const q={view:mode(),today:today(),filterEngineer:eng.value,filterProject:project.value,filterMonth:date.data().months.join(','),filterDates:date.data().dates.join(','),includePhotoStatus:true};
 return pages(out,offset=>op('km.monitor.page',{...q,offset,limit:31}),(list,t)=>tripFacts(card(list,t.engineer_name),t))}))
}
export function audit(box,kind){
 const f=card(box),month=field(f,'Month','month',today().slice(0,7)),eng=field(f,'Engineer'),project=field(f,'Project'),out=el('div');box.append(out);
 async function load(){const q={month:month.value,engineer:eng.value,project:project.value,...(kind==='rent'?{driver:'Rent'}:{})};
 await pages(out,offset=>op('km.list',{...q,offset,limit:31}),(list,t)=>{const c=card(list,t.engineer_name+' · '+t.trip_date);tripFacts(c,t);photoButtons(c,t);
 if(kind==='rent'){facts(c,[['Rent paid',money(t.rent_amount)]]);if(admin()){
 const [f,b]=form(c,'Save rent',async()=>{await write('km.rent',{tripId:t.source_trip_id,rent:Number(amount.value),rentDeduction:ded.value,rentDeductionDriver:driver.value});await load();notice('Rent saved')});
 const amount=field(f,'Rent amount','number',t.rent_amount||'',true);amount.min='.01';const ded=select(f,'Deduction',['On TMX','On Driver']),driver=field(f,'Deduction driver');f.append(b)}return}
 if(kind==='audit' && admin()){const details=el('details');details.append(el('summary','Edit odometer'));c.append(details);
 const [f,b]=form(details,'Save KM',async()=>{await write('km.edit',{tripId:t.source_trip_id,startKm:Number(start.value),finishKm:Number(end.value)});await load();notice('Trip updated')});
 const start=field(f,'Start KM','number',t.start_odometer,true),end=field(f,'Finish KM','number',t.finish_odometer,true);f.append(b)}
 const sides=['pm','finance'].filter(side=>admin()||has(side));if(!sides.length)return;
 const detail=el('details');detail.append(el('summary','Review trip'));c.append(detail);
 const [rf,b]=form(detail,'Save decision',async()=>{await write('km.review',{tripId:t.source_trip_id,side:side.value,status:status.value,reason:reason.value,deduction:Number(deduction.value)});await load();notice('Trip review saved')});
 const side=select(rf,'Review as',sides),status=select(rf,'Decision',['Pending','Approved','Rejected']),deduction=field(rf,'Deduction (EGP)','number',t.deduction??0),reason=field(rf,'Reason','text',t.reject_reason||'');rf.append(b)
 })}
 f.append(btn('Apply',load))
}
export function allowances(box){const f=card(box),month=field(f,'Month','month',today().slice(0,7),true),eng=field(f,'Engineer'),drv=field(f,'Driver'),project=field(f,'Project'),status=select(f,'Status',['Pending','Approved','Rejected'],'All'),out=el('div');box.append(out);
 async function load(){const q={month:month.value,filterEngineer:eng.value,filterDriver:drv.value,filterProject:project.value,filterStatus:status.value},selected=new Map();
 const toolbar=el('div'),list=el('div');out.replaceChildren(toolbar,list);
 if(admin()||has('pm')){
 const decision=select(toolbar,'Decision',['Approved','Rejected','Pending']),reason=field(toolbar,'Reason');
 toolbar.append(btn('Review selected',async()=>{if(!selected.size)throw Error('Select allowances first');await write('allowances.review',{items:[...selected.values()],status:decision.value,reason:reason.value});await load();notice('Allowances updated')}),
 btn('Export approved payroll',async()=>{const data=await op('allowances.list',{...q,filterStatus:'Approved',loadAll:true});const records=data.records.filter(r=>!r.exportLocked);
 if(!records.length)throw Error('No approved records to export');if(records.length>500)throw Error('Narrow the filters to 500 records per export');
 const blob=payroll(records);if(!confirm('Export and lock '+records.length+' approved records?'))return;
 const r=await write('allowances.export',{items:records.map(({type,name,date,amount,revision})=>({type,name,date,amount,revision}))});const a=el('a','Download payroll '+r.batchId);a.href=URL.createObjectURL(blob);a.download='Payroll-'+r.batchId+'.xlsx';toolbar.append(a);a.click();notice('Payroll locked · '+r.batchId)}))}
 await pages(list,offset=>op('allowances.list',{...q,offset,limit:31}),(rows,r)=>{const c=card(rows,r.name+' · '+money(r.amount));facts(c,[['Date',r.date],['Role',r.type],['Status',r.status],['Area',r.area],['Projects',r.projects],['Reason',r.reason],['Payroll batch',r.exportBatch]]);
 if(r.exportLocked && r.exportBatch)c.append(btn('Download payroll batch',async()=>{
 const all=await op('allowances.list',{month:q.month,loadAll:true});const records=all.records.filter(x=>x.exportBatch===r.exportBatch);
 if(!records.length)throw Error('Payroll batch unavailable');const a=el('a');a.href=URL.createObjectURL(payroll(records));a.download='Payroll-'+r.exportBatch+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
 }));
 if((admin()||has('pm'))&&!r.exportLocked){const i=check(c,'Select');i.onchange=()=>i.checked?selected.set(r.id,{type:r.type,name:r.name,date:r.date,revision:r.revision,amount:r.amount}):selected.delete(r.id)}},r=>r.totalMatched+' records · Payable '+money(r.summary.payable))
 }f.append(btn('Apply',load))}


