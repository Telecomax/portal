import {op,session} from './client.js';
const cache=new Map();
export function invalidate(){cache.clear()}
export function memo(key,load){
 const id=session()?.user.id+':'+key,old=cache.get(id);
 if(old&&old.until>Date.now())return old.value;
 const value=Promise.resolve().then(load).catch(e=>{cache.delete(id);throw e});
 cache.set(id,{value,until:Date.now()+15000});return value;
}
export async function collect(action,body={},key='items'){
 const items=[];let first;
 for(;;){
  const result=await op(action,{...body,offset:items.length,limit:500,paged:true});
  first??=result;const batch=result[key]||[];items.push(...batch);
  if(!result.hasMore)return {...first,[key]:items};
  if(!batch.length)throw Error('Incomplete server page');
 }
}
export const kmRows=()=>memo('km',()=>collect('km.list',{},'trips').then(r=>r.trips));
export const expenseRows=()=>memo('custody',()=>collect('custody.list').then(r=>r.items));
export const config=()=>memo('config',()=>op('config'));
export const allUsers=()=>memo('users',()=>collect('users.list').then(r=>r.items));
// Some endpoints have a fixed 31-record page. Advance by the returned row count.
export const engineers=()=>memo('engineers',()=>collect('management.engineers').then(r=>r.items.map(x=>x.name)));
export const split=value=>String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
export const equal=(a,b)=>!b||String(a||'').trim().toLowerCase()===String(b).trim().toLowerCase();
export function filterTrips(rows,q){
 const months=split(q.filterMonth),dates=split(q.filterDates);
 return rows.filter(t=>(!months.length&&!dates.length||months.includes(t.trip_date?.slice(0,7))||dates.includes(t.trip_date))
  &&equal(t.engineer_name,q.filterEngineer)&&equal(t.driver_name,q.filterDriver)&&equal(t.project_code,q.filterProject)&&equal(t.paid_by,q.filterPaidBy));
}
export function trip(t){
 const rate=Number(t.applied_km_rate||0),spent=Number(t.amount_spent_exact??t.benzine_amount??0),deduction=Number(t.deduction||0);
 const result={...t,tripId:t.source_trip_id,date:t.trip_date,day:t.trip_date?new Date(t.trip_date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',timeZone:'Africa/Cairo'}):'',
  engineer:t.engineer_name,driver:t.driver_name,projectName:t.project_code,vehicle:t.vehicle_id,task:t.task,area:t.area,
  startKm:t.start_odometer,finishKm:t.finish_odometer,tripKm:t.trip_km,trip:t.trip_km,totalKm:t.total_km,
  forthBack:t.forth_back,lastForthBack:t.lastForthBack||0,staticHours:t.static_hours,staticKm:t.static_km,overNightStay:t.overnight,
  startedAt:t.started_at,finishedAt:t.finished_at,amountSpent:spent,benzineAmount:spent,rate,ratePerKm:rate,rateDisplay:(rate*10).toFixed(2)+' EGP / 10 KM',
  deduction,finalAmount:Math.max(0,spent-deduction),rentAmount:t.rent_amount,totalRentBenzine:t.total_rent_benzine,rentDeduction:t.rent_deduction,rentDeductionDriver:t.rent_deduction_driver,
  paidBy:t.paid_by,solfa:Number(t.solfa||0),pmStatus:t.pm_status||'Pending',financeStatus:t.finance_status||'Pending',rejectReason:t.reject_reason||'',
  startLatitude:t.start_latitude,startLongitude:t.start_longitude,finishLatitude:t.finish_latitude,finishLongitude:t.finish_longitude,taskLocations:t.task_locations};
 for(const type of ['start','finish']){
  const url=t.photoPreviews?.[type]?.url||'';
  result[type+'PhotoThumb']=url;
  result[type+'Photo']=url?url.replace(/([?&])sz=[^&]+/,'$1sz=w2400'):'';
 }
 return result;
}
export function expense(e){return {...e,pm:e.pmStatus,fin:e.financeStatus,receiptUrl:'',submitted:e.submitted?new Intl.DateTimeFormat('en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(e.submitted)):'',status:e.pmStatus}}
export function page(rows,q={},key='trips'){
 const offset=Number(q.offset||0),limit=Number(q.limit||31);
 if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1)throw Error('Invalid pagination');
 const values=q.loadAll?rows:rows.slice(offset,offset+limit);
 return {ok:true,[key]:values,totalMatched:rows.length,totalCount:rows.length,hasMore:!q.loadAll&&offset+values.length<rows.length,offset,limit};
}
export function totals(rows){return {trips:rows.length,tripKm:rows.reduce((s,t)=>s+Number(t.tripKm||0),0),totalKm:rows.reduce((s,t)=>s+Number(t.totalKm||0),0),amountSpent:rows.reduce((s,t)=>s+Number(t.amountSpent||0),0)}}
export function combos(rows){return rows.map(t=>({engineer:t.engineer_name,driver:t.driver_name,project:t.project_code,paidBy:t.paid_by,month:t.trip_date?.slice(0,7),date:t.trip_date}))}
export function summary(rows,side){const s={pending:0,approved:0,rejected:0,clarification:0};for(const e of rows){const key=({'Pending':'pending','Approved':'approved','Rejected':'rejected','Needs Clarification':'clarification'})[e[side+'Status']];if(key)s[key]++}return s}
export function custodyFilter(rows,f,side,includeStatus=true){
 return rows.filter(e=>equal(e.engineer,f.engineer)&&equal(e.project,f.project)&&(!f.from||e.date>=f.from)&&(!f.to||e.date<=f.to)&&(!includeStatus||equal(e[side+'Status'],f.status)));
}
