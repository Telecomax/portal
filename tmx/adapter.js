import {payrollNames} from './export-names.js';
import {rememberAuditResults} from './audit-export.js';
import {op,write,login,logout,session,today,digest} from './client.js';
import {config,collect,kmRows,expenseRows,engineers,allUsers,memo,invalidate,filterTrips,trip,expense,page,totals,combos,summary,custodyFilter,split,equal} from './records.js';
import {jpeg,base64,submitTrip,jobs,retry,drain} from './photos.js';
import {allowanceView} from './allowance-view.js';
const manager=()=>session()?.user.roles.some(r=>['pm','finance','admin','super_admin'].includes(r));
const administrator=()=>session()?.user.roles.some(r=>['admin','super_admin'].includes(r));
function role(){const roles=session().user.roles;return roles.includes('super_admin')||roles.includes('admin')?'Admin':roles.includes('pm')?'PM':roles.includes('finance')?'Finance':'Engineer'}
export async function identity(){
 const user=session()?.user;if(!user)throw Error('Sign in again');
 let kmAccess=true,custodyAccess=true;
 if(!manager()){
  const allowed=async action=>{try{await op(action,{limit:1,paged:true});return true}catch(e){if(e.status===403||e.status===409)return false;throw e}};
  [kmAccess,custodyAccess]=await Promise.all([allowed('km.open.check'),allowed('custody.history')]);
 }
 return {ok:true,token:'unified:'+user.id,portalToken:'unified:'+user.id,custodyToken:'unified:'+user.id,
  name:user.name,reviewer:user.name,role:role(),kind:manager()?'management':'engineer',kmAccess,custodyAccess};
}
export function seed(info){
 const marker=info.token;
 for(const r of ['pm','admin','finance']){
  if(!administrator()&&!session().user.roles.includes(r)){
   sessionStorage.removeItem('tmx_km_'+r+'_token');sessionStorage.removeItem('tmx_km_'+r+'_name');sessionStorage.removeItem('custody.'+r);continue;
  }
  sessionStorage.setItem('tmx_km_'+r+'_token',marker);sessionStorage.setItem('tmx_km_'+r+'_name',info.name);
  sessionStorage.setItem('custody.'+r,JSON.stringify({token:marker,reviewer:info.name,name:info.name,role:info.role}));
 }
 sessionStorage.setItem('tmx_portal_user',JSON.stringify({kind:info.kind,name:info.name,role:info.role,km:info.kmAccess,custody:info.custodyAccess,portalToken:marker,custodyToken:marker}));
}
async function auth(action,q){
 if(action!=='portalSSO'){await login(q.name||q.engineer,q.pin);invalidate()}
 const info=await identity();
 if(action==='adminLogin'&&!administrator())throw Error('Admin access required');
 if(['pmLogin','financeLogin','managementLogin'].includes(action)&&!manager())throw Error('Management access required');
 if(['login','engineerLogin'].includes(action)&&!session().user.roles.some(r=>['engineer','super_admin'].includes(r)))throw Error('Engineer access required');
 info.engineerToken=info.token;info.engineer=info.name;seed(info);dispatchEvent(new Event('tmx-login'));return info;
}
async function balances(q){
 const result=await collect('km.balances',{engineer:q.filterEngineer||'',months:split(q.filterMonth)});
 return {ok:true,engineers:result.items.map(r=>({...r,totalSolfa:r.received,totalSpent:r.spent,tripCount:r.trips})),
  totals:{totalSolfa:result.received,totalSpent:result.spent,balance:result.balance}};
}
async function kmConfig(){
 const c=await config(),names=manager()?await engineers():[session().user.name];
 return {ok:true,engineers:names,drivers:c.drivers.map(d=>d.name),projects:c.projects.map(p=>p.code),areas:c.areas,
  vehicles:[...new Set(c.drivers.flatMap(d=>d.vehicles||[]))],driverVehicles:Object.fromEntries(c.drivers.map(d=>[d.name.toLowerCase(),d.vehicles||[]])),
  driverDefaults:Object.fromEntries(c.drivers.map(d=>[d.name,d.default_fb_km])),projectRates:Object.fromEntries(c.projects.map(p=>[p.code,p.km_rate]))};
}
async function auditBatch(action,q){
 const side=action==='financeSaveAuditBatch'?'finance':'pm';
 // Retrying a partially completed batch reuses each successful operation's request ID.
 const body={updates:q.updates||[],approvals:q.approvals||[]};
 const batchKey='tmx.batch.'+await digest(new TextEncoder().encode(JSON.stringify([session().user.id,action,body])));
 const batchId=sessionStorage.getItem(batchKey)||crypto.randomUUID();sessionStorage.setItem(batchKey,batchId);
 let index=0,updated=0;
 async function send(action,data){const r=await op(action,data,batchId+'-'+index++);invalidate();return r}
 for(const update of body.updates){
  if(update.startKm!==undefined||update.finishKm!==undefined){
   await send('km.edit',{tripId:update.tripId,...(update.startKm!==undefined?{startKm:update.startKm}:{}),...(update.finishKm!==undefined?{finishKm:update.finishKm}:{})});
  }
  if(update.status!==undefined||update.deduction!==undefined||update.reason!==undefined){
   await send('km.review',{tripId:update.tripId,side,status:update.status||'Pending',...(update.deduction!==undefined?{deduction:update.deduction}:{}),...(update.reason!==undefined?{reason:update.reason}:{})});
  }updated++;
 }
 for(const id of body.approvals){await send('km.review',{tripId:id,side,status:'Approved'});updated++}
 sessionStorage.removeItem(batchKey);return {ok:true,updated};
}
async function readTrips(action,q){
 if(action==='adminRentTrips'){
  const {trips}=await collect('km.list',{},'trips');
  const unpaid=trips.filter(t=>t.status==='Completed'&&t.driver_name?.trim().toLowerCase()==='rent'&&Number(t.rent_amount??0)<=0).map(trip);
  return {ok:true,trips:unpaid};
 }
 const rows=filterTrips(await kmRows(),q).map(trip);
 let selected=rows.filter(t=>t.status!=='Solfa'&&t.status!=='In Progress');
 if(action==='adminApprovedSummary'||action==='financeSummary')selected=selected.filter(t=>t.pmStatus==='Approved'&&t.financeStatus==='Approved');
 if(action==='financeTrips')selected=selected.filter(t=>t.status==='Completed');
 if(q.filterAuditStatus&&q.filterAuditStatus!=='All'){
  const field=action==='financeTrips'?'financeStatus':'pmStatus';selected=selected.filter(t=>equal(t[field],q.filterAuditStatus));
 }
 if(action==='adminTrips'||action==='financeTrips')rememberAuditResults(()=>selected);
 return {...page(selected,q.offset===undefined?{...q,loadAll:true}:q),totals:totals(selected)};
}
async function custodyQueue(action,q){
 const side=action.includes('Finance')?'finance':'pm',f=q.filters||{},all=await expenseRows(),eligible=side==='finance'?all.filter(e=>e.pmStatus==='Approved'):all;
 const rows=custodyFilter(eligible,f,side),s=summary(custodyFilter(eligible,f,side,false),side);
 return {...page(rows.map(expense),f.offset===undefined?{...f,loadAll:true}:f,'rows'),summary:s};
}
async function transferRows(q){
 const rows=(await expenseRows()).filter(e=>q.status==='Transferred'?e.transferStatus==='Transferred':e.pmStatus==='Approved'&&e.financeStatus==='Approved'&&e.transferStatus!=='Transferred');
 return {ok:true,rows:rows.map(expense)};
}
async function dashboard(kind){
 if(!manager()){
  if(kind==='km'){const r=await collect('km.history',{month:today().slice(0,7)},'trips');return {ok:true,myTripsThisMonth:r.trips.filter(t=>t.status!=='Solfa').length,myKmThisMonth:r.trips.reduce((n,t)=>n+Number(t.total_km||0),0)}}
  const r=await collect('custody.history');return {ok:true,myExpenseCount:r.items.length,myExpenseAmount:r.totalAmount};
 }
 if(kind==='km'){
  const rows=await kmRows(),a=await op('allowances.list',{month:today().slice(0,7),filterStatus:'Pending',limit:1});
  return {ok:true,pmAuditPending:rows.filter(t=>t.status==='Completed'&&(!t.pm_status||t.pm_status==='Pending')).length,
   financeAuditPending:rows.filter(t=>t.status==='Completed'&&(!t.finance_status||t.finance_status==='Pending')).length,allowancePendingCount:a.totalMatched,allowancePendingAmount:a.summary.pending};
 }
 const rows=await expenseRows(),ready=rows.filter(t=>t.pmStatus==='Approved'&&t.financeStatus==='Approved'&&t.transferStatus!=='Transferred'),done=rows.filter(t=>t.transferStatus==='Transferred');
 return {ok:true,pmPending:rows.filter(t=>t.pmStatus==='Pending').length,financePending:rows.filter(t=>t.pmStatus==='Approved'&&t.financeStatus==='Pending').length,
  needsTransferCount:ready.length,needsTransferAmount:ready.reduce((s,t)=>s+t.amount,0),transferredCount:done.length,transferredAmount:done.reduce((s,t)=>s+t.amount,0)};
}
function userData(u){return {id:u.id,version:u.credential_version,displayName:u.display_name,loginName:u.login_name,status:u.status,roles:u.roles,baseCity:u.base_city,custodyLimit:u.custody_limit,kmAccess:u.km_access,custodyAccess:u.custody_access}}
async function changeUser(action,q){
 const users=await allUsers();const matches=users.filter(u=>u.display_name===q.name||u.login_name===q.name||u.engineer_name===q.name);
 if(matches.length!==1)throw Error('Select the account by login name in Users Managements');
 const user=matches[0],data=userData(user);
 let pin;
 if(action==='generatePin'||action==='generateManagementPin'){pin=String(crypto.getRandomValues(new Uint32Array(1))[0]%10000).padStart(4,'0');data.pin=pin}
 if(action==='updateEngineer'){data.status=q.active?'active':'disabled';data.custodyLimit=Number(q.limit)}
 if(action==='deleteEngineer')data.status='disabled';
 if(action==='updateManagementUser'){data.roles=[q.role.toLowerCase(),...user.roles.filter(r=>r==='engineer'||r==='super_admin')];data.status=q.active?'active':'disabled';data.kmAccess=q.kmAccess;data.custodyAccess=q.custodyAccess}
 await write('users.save',data);invalidate();return {ok:true,name:user.display_name,pin};
}
export async function dispatch(kind,action,q={}){
 if(['portalLogin','managementLogin','engineerLogin','adminLogin','pmLogin','financeLogin','login','portalSSO'].includes(action))return auth(action,q);
 if(action==='portalDashboardSummary')return dashboard(kind);
 if(action==='getDropdownNames')return {ok:true,names:[]};
 if(action==='getConfig'){if(!session())return {ok:true,categories:[],projects:[]};const c=await config();return {ok:true,...c,projects:c.projects.map(p=>p.code)}}
 if(action==='config'||action==='adminPortalConfig')return session()?kmConfig():{ok:true,engineers:[],drivers:[],projects:[],areas:[]};
 if(action==='adminFilterOptions'||action==='financeFilterOptions'){
  const rows=await kmRows();return {ok:true,combinations:combos(rows),engineers:[...new Set(rows.map(t=>t.engineer_name))],drivers:[...new Set(rows.map(t=>t.driver_name))],projects:[...new Set(rows.map(t=>t.project_code))]};
 }
 if(action==='adminSummary')return balances(q);
 if(['adminTrips','financeTrips','adminApprovedSummary','financeSummary','adminRentTrips'].includes(action))return readTrips(action,q);
 if(action==='adminSaveAuditBatch'||action==='financeSaveAuditBatch')return auditBatch(action,q);
 if(action==='adminSolfa'||action==='adminRent'){
  if(action==='adminRent'&&!(await readTrips('adminRentTrips',{})).trips.some(t=>t.tripId===q.tripId))throw Error('This trip is no longer awaiting rent payment. Refresh the list.');
  const r=await write(action==='adminSolfa'?'km.solfa':'km.rent',action==='adminSolfa'?{engineer:q.engineer,date:q.date,amount:q.amount}:{tripId:q.tripId,rent:q.rent,rentDeduction:q.rentDeduction,rentDeductionDriver:q.rentDeductionDriver});
  invalidate();return r;
 }
 if(action.startsWith('allowance')){
  if(action==='allowanceFilterOptions'||action==='allowanceData')return allowanceView(action,q);
  const items=q.items||[{type:q.type,name:q.name,date:q.date,amount:q.calculatedAmount}];
  const r=await write(action==='allowanceExportLock'?'allowances.export':'allowances.review',{items,status:q.status,reason:q.reason||''});invalidate();return r;
 }
 if(action==='getPMExpenses'||action==='getFinanceExpenses')return custodyQueue(action,q);
 if(action==='getPMFilterOptions'||action==='getFinanceFilterOptions'){
  const side=action==='getPMFilterOptions'?'pm':'finance',rows=await expenseRows();
  return {ok:true,combinations:rows.filter(e=>side==='pm'||e.pmStatus==='Approved').map(e=>({engineer:e.engineer,project:e.project,date:e.date,status:e[side+'Status']}))};
 }
 if(action==='getReceiptImage'||action==='getPMReceiptImage'){
  const r=await op('evidence.read',{expenseId:q.id,variant:'receipt'});return {...r,dataUrl:r.url};
 }
 if(action==='reviewPMExpense'||action==='reviewExpense'){
  const r=await write('custody.review',{id:q.id,side:action==='reviewPMExpense'?'pm':'finance',decision:q.decision,comment:q.comment||'',
   ...(q.receiptValidity?{receiptValidity:q.receiptValidity}:{}),...(q.receiptAmount!==undefined?{receiptAmount:q.receiptAmount}:{}),...(q.receiptDate?{receiptDate:q.receiptDate}:{})});invalidate();return r;
 }
 if(action==='getTransferRows'||action==='getTransferStatusRows')return transferRows(q);
 if(['markTransferred','pmMarkTransferred','financeMarkTransferred'].includes(action)){const r=await write('custody.transfer',{ids:q.ids});invalidate();return r}
 if(action==='getTransferTemplate'){
  const {rows}=await transferRows({status:'Ready'}),amounts=new Map();
  for(const row of rows)amounts.set(row.engineer,(amounts.get(row.engineer)||0)+Number(row.amount));
  const csvCell=value=>'"'+String(value).replaceAll('"','""')+'"';
  const fullName=await payrollNames([...amounts.keys()]);
  return {ok:true,csv:'Engineer,Amount,Reference\r\n'+[...amounts].map(([name,amount])=>[csvCell(fullName(name)),amount.toFixed(2),''].join(',')).join('\r\n')};
 }
 if(action==='getEngineers'||action==='getManagementUsers'){
  const list=await allUsers();return {ok:true,engineers:list.filter(u=>u.roles.includes('engineer')).map(u=>({name:u.engineer_name||u.display_name,active:u.status==='active',limit:u.custody_limit})),
   users:list.map(u=>({name:u.display_name,role:u.roles.includes('admin')?'Admin':u.roles.includes('pm')?'PM':'Finance',active:u.status==='active',kmAccess:u.km_access,custodyAccess:u.custody_access,hasPin:true}))};
 }
 if(['generatePin','generateManagementPin','updateEngineer','deleteEngineer','updateManagementUser'].includes(action))return changeUser(action,q);
 if(action==='createEngineer'){
  const pin=String(crypto.getRandomValues(new Uint32Array(1))[0]%10000).padStart(4,'0');
  await write('users.save',{displayName:q.name,loginName:q.name.toLowerCase(),pin,roles:['engineer'],status:'active',baseCity:'',custodyLimit:0,kmAccess:true,custodyAccess:true});invalidate();return {ok:true,pin};
 }
 if(action==='getMyExpenses'){
  const r=await collect('custody.history');return {...r,items:r.items.map(expense),limit:r.custodyLimit};
 }
 if(action==='submitExpense'){
  const data={...q.payload};delete data.image;
  if(q.payload.image){const image=q.payload.image.startsWith('data:')?q.payload.image:'data:image/jpeg;base64,'+q.payload.image;
   const photo=await jpeg(await (await fetch(image)).blob(),300000),hash=await digest(await photo.arrayBuffer());
   const r=await op('evidence.drive.upload',{app:'custody',contentType:'image/jpeg',base64:await base64(photo)},'receipt-'+hash);data.receiptKey=r.key;
  }
  const r=await write('custody.submit',data);invalidate();return r;
 }
 if(action==='openTrips'){const r=await op('km.open',{limit:31});return {...r,trips:r.trips.map(trip)}}
 if(action==='history'){
  const r=await collect('km.history',{months:split(q.filterMonth)},'trips'),rows=r.trips.map(trip);
  const solfa=rows.reduce((s,t)=>s+t.solfa,0),spent=rows.reduce((s,t)=>s+(['rent'].includes(t.driver?.toLowerCase())||t.paidBy?.toLowerCase()==='refaat fathi'?0:t.amountSpent),0);
  return {ok:true,trips:rows.filter(t=>t.status!=='Solfa'),solfa:rows.filter(t=>t.status==='Solfa'),solfaRows:rows.filter(t=>t.status==='Solfa'),solfaEntries:rows.filter(t=>t.status==='Solfa').map(t=>({date:t.date,amount:t.solfa})),totalSolfa:solfa,totalSpent:spent,balance:solfa-spent};
 }
 if(action==='taskLocation')return write('km.location',{tripId:q.tripId,latitude:q.latitude,longitude:q.longitude,accuracy:q.accuracy});
 if(action==='start'||action==='finish'){
  const prior=(await jobs()).find(j=>j.fields.tripId===q.tripId&&j.action==='km.'+action);
  if(prior){if(prior.phase==='confirm')await retry(prior);return {ok:true,tripId:q.tripId,photoStatus:prior.phase==='done'?'uploaded':'pending'}}
  const fields=action==='start'?{tripId:q.tripId,driver:q.driver,projectName:q.projectName,vehicle:q.vehicle||'',task:q.task,startKm:q.startKm,startLatitude:q.startLatitude,startLongitude:q.startLongitude}:
   {tripId:q.tripId,finishKm:q.finishKm,staticKm:q.staticKm||0,staticHours:q.staticHours||0,overNightStay:!!q.overNightStay,finishLatitude:q.finishLatitude,finishLongitude:q.finishLongitude};
  const image=q[action+'Photo'];if(!image)throw Error('Photo required');
  const r=await submitTrip('km.'+action,fields,await(await fetch(image)).blob());invalidate();return r;
 }
 throw Error('Unsupported operation '+action);
}
export async function signout(){await logout();invalidate()}

