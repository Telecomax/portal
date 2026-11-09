import {op} from './client.js';
// Resolve at export time; never rewrite screen names or identities used for approvals.
export async function payrollNames(names,optional=[]){
 const required=[...new Set(names.map(n=>String(n??'').trim()).filter(Boolean))];
 const requested=[...new Set([...required,...optional.map(n=>String(n??'').trim()).filter(Boolean)])],map=new Map();
 for(let i=0;i<requested.length;i+=500){
  const out=await op('exports.names',{names:requested.slice(i,i+500)});
  for(const item of out.items||[])if(item.fullName)map.set(item.name,item.fullName);
 }
 const missing=required.filter(n=>!map.has(n));
 if(missing.length)throw Error('Add a unique Full Name in Users Management for: '+missing.join(', '));
 return name=>map.get(String(name??'').trim())||String(name??'');
}
