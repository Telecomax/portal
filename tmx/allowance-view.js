import {op,today} from './client.js';
import {collect,memo,split} from './records.js';

const norm=value=>String(value||'').trim().toLowerCase();
async function readMonth(month){
 return memo('allowance-view:'+month,async()=>{
  const [ledger,km]=await Promise.all([op('allowances.list',{month,loadAll:true}),collect('km.list',{month},'trips')]);
  const dates=new Map(),byDay=new Map();
  for(const trip of km.trips){
   if(trip.status==='Solfa'||!trip.trip_date)continue;
   const engineer=trip.engineer_name?.trim(),driver=trip.driver_name?.trim(),project=trip.project_code?.trim()||'NSNDT';
   if(engineer){const key=norm(engineer);if(!dates.has(key))dates.set(key,new Set());dates.get(key).add(trip.trip_date)}
   for(const [type,name] of [['Engineer',engineer],['Driver',driver]]){
    if(!name||type==='Driver'&&norm(name)==='rent')continue;
    const key=[type,norm(name),trip.trip_date].join('|');if(!byDay.has(key))byDay.set(key,[]);
    byDay.get(key).push({engineer,driver,project});
   }
  }
  return ledger.records.map(record=>{
   const matches=byDay.get([record.type,norm(record.name),record.date].join('|'))||[];
   const combos=matches.length?matches:(record.projects?.length?record.projects:['']).flatMap(project=>(record.related?.length?record.related:['']).map(person=>({project,engineer:record.type==='Engineer'?record.name:person,driver:record.type==='Driver'?record.name:person})));
   const pairs=combos.map(c=>({...c,month,status:record.status}));
   return {...record,calculatedAmount:record.amount,workingDays:record.type==='Engineer'?(dates.get(norm(record.name))?.size??record.workingDays):record.workingDays,
    projects:[...new Set(pairs.map(c=>c.project).filter(Boolean))],related:[...new Set(pairs.map(c=>record.type==='Engineer'?c.driver:c.engineer).filter(Boolean))],pairs};
  });
 });
}
export async function allowanceView(action,q){
 const months=split(q.filterMonth);if(!months.length)months.push(today().slice(0,7));
 const all=(await Promise.all([...new Set(months)].sort().map(readMonth))).flat();
 if(action==='allowanceFilterOptions')return {ok:true,combinations:all.flatMap(row=>row.pairs)};
 const rows=all.filter(row=>(!q.filterStatus||q.filterStatus===row.status)&&row.pairs.some(pair=>[['engineer',q.filterEngineer],['driver',q.filterDriver],['project',q.filterProject]].every(([key,val])=>!val||norm(val)===norm(pair[key]))));
 const summary={calculated:0,pending:0,approved:0,rejected:0,payable:0};for(const row of rows){const amount=Number(row.amount);summary.calculated+=amount;summary[norm(row.status)]+=amount;if(row.status!=='Rejected')summary.payable+=amount}
 const offset=q.loadAll?0:Number(q.offset||0),limit=Number(q.limit||31);
 return {ok:true,records:q.loadAll?rows:rows.slice(offset,offset+limit),summary,totalMatched:rows.length,offset,limit,hasMore:!q.loadAll&&offset+limit<rows.length};
}
