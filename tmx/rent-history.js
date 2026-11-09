import {payrollNames} from './export-names.js';
import {collect} from './records.js';
import {rentWorkbook} from './rent-workbook.js';

const panel=document.getElementById('rentHistory');
const native=typeof window.auditCall==='function';
panel.innerHTML=`<div class="rh-top"><h2>Rent History</h2><button type="button" id="rhExport" disabled>Export to Excel</button></div>
<div class="rh-grid"><label>Engineer<input id="rhEngineer" placeholder="Choose / search engineer" autocomplete="off"><span class="rh-options" hidden></span></label>
<label>Deduction<select id="rhDeduction"><option value="">All deductions</option><option>On Driver</option><option>On TMX</option></select></label>
<label>Project<input id="rhProject" placeholder="Choose / search project" autocomplete="off"><span class="rh-options" hidden></span></label>
<div><span>Date</span><button type="button" id="rhDate">All dates ▾</button></div></div>
<div id="rhDates" hidden></div><div class="rh-actions"><button id="rhApply">Apply</button><button id="rhReset">Reset</button></div>
<p id="rhNote" role="status"></p><div id="rhCards"></div><button id="rhMore" hidden>Load more</button>`;
const el=id=>document.getElementById(id);
let rows=[],applied=[],months=[],days=[],shown=0,generation=0,ready=false;
const money=new Intl.NumberFormat('en-EG',{minimumFractionDigits:2,maximumFractionDigits:2});
const headings=['Date','Engineer Name','Project','Rent Paid','Total Benzine Amount','Total'];
function values(t){
 const rent=Number(t.rent_amount),fuel=Number(t.amount_spent_exact??t.benzine_amount??0);
 return [t.trip_date,t.engineer_name,t.project_code,rent,fuel,Number(t.total_rent_benzine??(rent+fuel))];
}
function text(tag,value){const n=document.createElement(tag);n.textContent=value;return n}
function options(input,key){
 const list=input.nextElementSibling;
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false')};
 function open(){
  const other=input.id==='rhEngineer'?el('rhProject').value:el('rhEngineer').value;
  const otherKey=key==='engineer_name'?'project_code':'engineer_name';
  const candidates=rows.filter(t=>(!other||t[otherKey]===other)&&(!el('rhDeduction').value||t.rent_deduction===el('rhDeduction').value)&&inDates(t));
  const query=input.value.trim().toLowerCase();
  const names=[...new Set(candidates.map(t=>t[key]).filter(Boolean))].sort();
  const filtered=names.includes(input.value)?names:names.filter(v=>v.toLowerCase().includes(query));
  list.replaceChildren();
  for(const value of ['',...filtered]){
   const b=text('button',value||'All');b.type='button';b.onmousedown=e=>e.preventDefault();
   b.onclick=e=>{e.preventDefault();input.value=value;close()};list.append(b);
  }
  list.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.onfocus=input.onclick=input.oninput=open;
 input.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='ArrowDown'){e.preventDefault();open();list.firstChild?.focus()}};
 input.parentElement.addEventListener('focusout',e=>{if(!input.parentElement.contains(e.relatedTarget))close()});
 document.addEventListener('pointerdown',e=>{if(!input.parentElement.contains(e.target))close()});
}
options(el('rhEngineer'),'engineer_name');options(el('rhProject'),'project_code');
const norm=x=>String(x||'').trim().toLowerCase();
function fields(t){return (!el('rhEngineer').value.trim()||norm(t.engineer_name)===norm(el('rhEngineer').value))&&(!el('rhProject').value.trim()||norm(t.project_code)===norm(el('rhProject').value))&&(!el('rhDeduction').value||t.rent_deduction===el('rhDeduction').value)}
function inDates(t){return !months.length&&!days.length||months.includes(t.trip_date?.slice(0,7))||days.includes(t.trip_date)}
function dateLabel(){el('rhDate').textContent=[...months,...days].join(', ')||'All dates ▾'}
el('rhDate').onclick=async()=>{
 const available=[...new Set(rows.filter(fields).map(t=>t.trip_date).filter(Boolean))].sort().reverse();
 if(native){
  try{const r=await window.auditCall('chooseAuditDates',{months,days,available});if(!r.cancelled){months=r.months||[];days=r.days||[];dateLabel()}}catch(e){el('rhNote').textContent=e.message}return;
 }
 const box=el('rhDates');if(!box.hidden){box.hidden=true;return}
 box.replaceChildren();
 for(const month of [...new Set([...available.map(d=>d.slice(0,7)),...months,...days.map(d=>d.slice(0,7))])].sort().reverse()){
  const group=document.createElement('details');group.append(text('summary',month));
  function choice(value,isMonth){
   const label=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=(isMonth?months:days).includes(value);
   c.onchange=()=>{const a=isMonth?months:days;const next=c.checked?[...a,value]:a.filter(v=>v!==value);if(isMonth)months=next;else days=next;dateLabel()};
   label.append(c,document.createTextNode(isMonth?'Entire month':value));group.append(label);
  }
  choice(month,true);for(const day of [...new Set([...available,...days])].filter(d=>d.startsWith(month)))choice(day,false);
  box.append(group);
 }
 if(!box.childElementCount)box.append(text('span','No matching dates'));
 box.hidden=false;
};
function clear(){
 applied=[];shown=0;el('rhCards').replaceChildren();el('rhExport').disabled=true;el('rhMore').hidden=true;el('rhDates').hidden=true;
 el('rhNote').textContent='Choose filters and press Apply.';
}
function next(){
 for(const t of applied.slice(shown,shown+31)){
  const card=document.createElement('article');values(t).forEach((v,i)=>{const cell=document.createElement('div');cell.append(text('small',headings[i]),text('strong',i>=3?money.format(v)+' EGP':v));card.append(cell)});el('rhCards').append(card);
 }shown=Math.min(shown+31,applied.length);el('rhMore').hidden=shown>=applied.length;
}
el('rhMore').onclick=next;
el('rhApply').onclick=()=>{if(!ready)return;clear();applied=rows.filter(t=>fields(t)&&inDates(t));next();el('rhExport').disabled=!applied.length;el('rhNote').textContent=applied.length?applied.length+' paid rent trips':'No matching rent payments.'};
el('rhReset').onclick=()=>{el('rhEngineer').value=el('rhProject').value=el('rhDeduction').value='';months=[];days=[];dateLabel();clear();if(!ready)load()};
el('rhExport').onclick=async()=>{
 const btn=el('rhExport');btn.disabled=true;
 try{
  const fullName=await payrollNames(applied.map(t=>t.engineer_name));const details=applied.map(t=>{const row=values(t);row[1]=fullName(t.engineer_name);return row});const blob=rentWorkbook([['Rent History','Value'],['Trips',details.length],...headings.slice(3).map((h,i)=>[h+' (EGP)',details.reduce((s,row)=>s+row[i+3],0)])],[headings,...details]);
  if(native){const data=await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result.split(',')[1]);f.onerror=()=>rej(f.error);f.readAsDataURL(blob)});await window.auditCall('saveAuditWorkbook',{data})}
  else{const a=document.createElement('a');a.href=window.URL.createObjectURL(blob);a.download='Rent-History.xlsx';a.click();setTimeout(()=>window.URL.revokeObjectURL(a.href),60000)}
 }catch(e){el('rhNote').textContent='Export failed: '+e.message}finally{btn.disabled=!applied.length}
};
async function load(){
 const id=++generation;rows=[];ready=false;clear();el('rhApply').disabled=true;el('rhNote').textContent='Loading rent filters…';
 try{const r=await collect('km.list',{driver:'Rent'},'trips');if(id!==generation)return;
 rows=r.trips.filter(t=>norm(t.driver_name)==='rent'&&t.status==='Completed'&&Number(t.rent_amount)>0);
 ready=true;el('rhApply').disabled=false;clear();
 }catch(e){if(id===generation)el('rhNote').textContent='Could not load rent history. Press Reset to retry.'}
}
if(native)load();else{
 for(const name of ['Pay','History'])el('rentTab'+name).onclick=()=>{
  const history=name==='History';el('dash').classList.toggle('rh-active',history);panel.hidden=!history;
  el('rentTabPay').setAttribute('aria-pressed',String(!history));el('rentTabHistory').setAttribute('aria-pressed',String(history));
  if(history)load();
 };
}
