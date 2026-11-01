import {op,write,all,today,session,logout} from './client.js';
import {el,btn,card,form,field,select,options,check,combo,dateFilters,pages,tabs,facts,money,notice,csv} from './ui.js';
export const has=(...allowed)=>session()?.user.roles.some(r=>allowed.includes(r));
export const admin=()=>has('admin','super_admin');
export const managers=()=>admin()||has('pm','finance');
const canPm=()=>admin()||has('pm'),canFinance=()=>admin()||has('finance');
export function balances(box,initial){
 const entries=[];
 if(canPm())entries.push(['Add Solfa',async pane=>{
   const names=(await all('management.engineers')).map(x=>x.name);
   const [f,b]=form(card(pane),'Add Solfa',async()=>{
     if(!names.includes(engineer.value))throw Error('Select an engineer from the list');
     await write('km.solfa',{engineer:engineer.value,date:date.value,amount:amount.value});
     notice('Added '+money(amount.value)+' to Eng. '+engineer.value);amount.value=''});
   const engineer=combo(f,'Choose / search engineer',names,true),date=field(f,'Payment date','date',today(),true),amount=field(f,'Amount (EGP)','number','',true);
   amount.min='0.01';amount.max='10000000';amount.step='.01';f.append(b)
 }]);
 entries.push(['Balances',async pane=>{
   const filter=card(pane),out=el('div');pane.append(out);const date=dateFilters(filter,today().slice(0,7));
   const facets=await op('km.balances.facets',date.data());date.suggest(facets.dates);const names=facets.engineers;
   const engineer=combo(filter,'Choose / search engineer',names);
   let generation=0;async function refresh(){const n=++generation;try{
     const d=await op('km.balances.facets',{...date.data(),engineer:engineer.value});
     if(n===generation){names.splice(0,names.length,...d.engineers);date.suggest(d.dates)}
   }catch(e){notice(e.message,true)}}
   date.wrap.addEventListener('selection',refresh);engineer.addEventListener('change',refresh);
   filter.append(btn('Apply',()=>{const query={engineer:engineer.value,...date.data()};
      return pages(out,offset=>op('km.balances',{...query,offset}), (list,r)=>{
        const row=el('div',null,'balance');for(const [k,v] of [['Engineer',r.name],['Received',money(r.received)],['Spent',money(r.spent)],['Balance',money(r.balance)]]){const col=el('div');col.append(el('small',k),el('strong',v));row.append(col)}list.append(row)
      })}),btn('Reset',()=>{engineer.value='';date.reset();out.replaceChildren()}))
 }]);tabs(box,entries,initial)
}
export function users(box){
 function editor(pane,u,done){
  const [f,b]=form(pane,u?'Save changes':'Add user',async()=>{
    const data={displayName:name.value.trim(),loginName:login.value.trim(),status:status.value,roles:roles.filter(([,c])=>c.checked).map(([r])=>r),
      baseCity:city.value,custodyLimit:Number(limit.value),kmAccess:km.checked,custodyAccess:custody.checked};
    if(!data.roles.length)throw Error('Choose at least one role');
    if(pin.value)data.pin=pin.value;if(u)Object.assign(data,{id:u.id,version:u.credential_version});
    await write('users.save',data);pin.value='';if(u?.id===session().user.id){await logout().catch(()=>{});location.reload();return}
    await done();notice('Saved '+data.displayName)
  });
  const name=field(f,'Display name','text',u?.display_name,true),login=field(f,'Login name','text',u?.login_name,true),
    pin=field(f,u?'New PIN (leave blank to keep current PIN)':'Four-digit PIN','password','',!u);
  pin.pattern='[0-9]{4}';pin.maxLength=4;pin.inputMode='numeric';pin.autocomplete='new-password';
  const status=select(f,'Status',['active','disabled','pending']);status.value=u?.status||'active';
  const roles=['engineer','pm','finance','admin',...(has('super_admin')?['super_admin']:[])].map(r=>[r,check(f,r,u?u.roles.includes(r):r==='engineer')]);
  const city=field(f,'Base city','text',u?.base_city),limit=field(f,'Custody limit (EGP)','number',u?.custody_limit??0),
   km=check(f,'KM access',u?.km_access),custody=check(f,'Custody access',u?.custody_access);f.append(b)
 }
 tabs(box,[['Edit Users',async pane=>{
  async function load(){const list=await all('users.list');pane.replaceChildren();
   const i=combo(pane,'Choose / search user',list.map(u=>u.display_name)),rows=el('div');pane.append(rows);
   function render(){rows.replaceChildren();const matches=list.filter(u=>(u.display_name+' '+u.login_name).toLowerCase().includes(i.value.toLowerCase()));let offset=0;
     const more=btn('Load more',append);function append(){more.remove();for(const u of matches.slice(offset,offset+31)){
       const row=el('div',null,'userrow');row.append(el('b',u.display_name),el('span',u.roles.join(', ')),el('span',[u.km_access&&'KM',u.custody_access&&'Custody'].filter(Boolean).join(' / ')||'None'));
       const edit=btn('Edit / Reset',()=>{const d=el('dialog');document.body.append(d);d.append(el('h2','Edit user'));editor(d,u,async()=>{d.close();await load()});d.append(btn('Close',()=>d.close()));d.onclose=()=>d.remove();d.showModal()});
       edit.disabled=u.roles.includes('super_admin')&&!has('super_admin');row.append(edit);rows.append(row)
     }offset+=31;if(matches.length>offset)rows.append(more)}append()}
   i.addEventListener('input',render);i.addEventListener('change',render);render()
  }await load()
 }],['Add Users',pane=>{function draw(){pane.replaceChildren();editor(card(pane),null,draw)}draw()}]])
}
export async function evidence(data){const r=await op('evidence.read',data);const url=new URL(r.url);
 if(url.protocol!=='https:')throw Error('Invalid photo link');const d=el('dialog');document.body.append(d);
 const img=el('img');img.src=url.href;img.alt='Evidence photo';const link=el('a','Open original');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
 d.append(img,link,btn('Close',()=>d.close()));d.onclose=()=>d.remove();d.showModal()}
export function custodyReview(box,transfer=false){
 const filters=card(box),r1=el('div',null,'filterrow'),r2=el('div',null,'filterrow'),buttons=el('div',null,'tabs'),out=el('div');
 filters.append(r1,r2,buttons);box.append(out);const eng=select(r1,'Engineer',[],'All'),date=dateFilters(r1,today().slice(0,7)),
 project=select(r2,'Project',[],'All'),pm=select(r2,'PM',[],'All'),fin=select(r2,'Finance',[],'All');
 const query=()=>({engineer:eng.value,project:project.value,pmStatus:pm.value,financeStatus:fin.value,...date.data()});
 let generation=0;async function related(){const g=++generation;try{const r=await op('custody.review.facets',query());if(g!==generation)return;date.suggest(r.dates);
   for(const [i,k] of [[eng,'engineers'],[project,'projects'],[pm,'pmStatuses'],[fin,'financeStatuses']])options(i,[...new Set([i.value,...r[k]].filter(Boolean))])}catch(e){notice(e.message,true)}}
 for(const i of [eng,project,pm,fin])i.onchange=related;date.wrap.addEventListener('selection',related);related();
 async function apply(){const q=query(),selected=new Map();const results=el('div');out.replaceChildren();
   if(transfer)out.append(btn('Transfer selected',async()=>{if(!selected.size)throw Error('Select approved expenses');if(!confirm('Mark '+selected.size+' expenses transferred?'))return;
     const r=await write('custody.transfer',{ids:[...selected.keys()]});await apply();notice('Transferred '+r.count+' expenses · '+r.batchId)}),
     btn('Download selected CSV',()=>csv('custody-transfers.csv',[['Engineer','Date','Amount','Project'],...[...selected.values()].map(e=>[e.engineer,e.date,e.amount,e.project])])));out.append(results);
   await pages(results,offset=>op('custody.review.page',{...q,offset}),(list,r)=>{const c=card(list,r.engineer+' · '+money(r.amount));expenseFacts(c,r);
     if(transfer){if(r.pmStatus==='Approved'&&r.financeStatus==='Approved'&&r.transferStatus!=='Transferred'){const cb=check(c,'Select for transfer');cb.onchange=()=>cb.checked?selected.set(r.id,r):selected.delete(r.id)}return}
     for(const side of ['pm','finance'])if(side==='pm'?canPm():canFinance())c.append(btn('Review as '+(side==='pm'?'PM':'Finance'),()=>{
       const d=el('dialog');document.body.append(d);d.append(el('h2','Review expense'));
       const [f,b]=form(d,'Save decision',async()=>{await write('custody.review',{id:r.id,side,decision:decision.value,comment:comment.value,...(side==='finance'?{receiptValidity:valid.value,receiptAmount:amt.value,receiptDate:day.value}:{})});d.close();await apply();notice('Decision saved')});
       const decision=select(f,'Decision',['Approved','Rejected','Needs Clarification']),comment=field(f,'Comment');let valid,amt,day;
       if(side==='finance'){valid=select(f,'Receipt validity',['Not Checked','Valid','Invalid','No Receipt']);valid.value=r.receiptValidity||'Not Checked';amt=field(f,'Receipt amount','number',r.receiptAmount??'');day=field(f,'Receipt date','date',r.receiptDate||'')}
       f.append(b);d.append(btn('Cancel',()=>d.close()));d.onclose=()=>d.remove();d.showModal()
     }))
   })
 }
 buttons.append(btn('Apply',apply),btn('Reset',()=>{for(const i of [eng,project,pm,fin])i.value='';date.reset();out.replaceChildren()}))
}
export function expenseFacts(c,r){facts(c,[['Date',r.date],['Project',r.project],['Category',r.category],['Description',r.description],['PM',r.pmStatus],['Finance',r.financeStatus],['Transfer',r.transferStatus],['Flag',r.flag],['Comment',r.financeComment]]);
 if(r.hasReceipt)c.append(btn('View receipt',()=>evidence({expenseId:r.id,variant:'receipt'})))}
