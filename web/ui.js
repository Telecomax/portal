export const $=s=>document.querySelector(s);
export function el(tag,text,klass){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(klass)n.className=klass;return n}
export function notice(message,bad=false){const n=$('#notice');n.textContent=message;n.className=bad?'error':''}
export function btn(label,fn){const b=el('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){notice(e.message,true)}finally{b.disabled=false}};return b}
export function field(box,label,type='text',value='',required=false) {
  const l=el('label',label),i=el('input');i.type=type;i.value=value;i.required=required;
  if(type==='number')i.step='any';l.append(i);box.append(l);return i
}
export function options(i,values,empty='All'){const old=i.value;i.replaceChildren();
  if(empty!==null)i.add(new Option(empty,''));for(const v of values)i.add(new Option(v,v));if([...i.options].some(o=>o.value===old))i.value=old}
export function select(box,label,values,empty=null){const l=el('label',label),i=el('select');options(i,values,empty);l.append(i);box.append(l);return i}
export function check(box,label,value=false){const l=el('label',null,'check'),i=el('input');i.type='checkbox';i.checked=value;l.append(i,document.createTextNode(label));box.append(l);return i}
export function combo(box,label,names,required=false){
  const i=field(box,label,'search','',required),list=el('div',null,'suggestions');i.autocomplete='off';i.parentNode.append(list);
  function show(filtered){list.replaceChildren();for(const name of names.filter(n=>!filtered||n.toLowerCase().includes(i.value.toLowerCase()))){
    const b=btn(name,()=>{i.value=name;list.hidden=true;i.dispatchEvent(new Event('change'))});b.onpointerdown=e=>e.preventDefault();list.append(b)}
    list.hidden=!list.childElementCount}
  list.hidden=true;i.onfocus=()=>show(false);i.onclick=()=>show(false);i.oninput=()=>show(true);
  i.parentNode.onfocusout=e=>{if(!i.parentNode.contains(e.relatedTarget))list.hidden=true};
  i.onkeydown=e=>{if(e.key==='Escape')list.hidden=true;if(e.key==='ArrowDown'){e.preventDefault();list.firstChild?.focus()}};
  return i
}
export function card(box,title){const n=el('section',null,'card');if(title)n.append(el('h2',title));box.append(n);return n}
export function form(box,submit,fn){const f=el('form');box.append(f);const b=el('button',submit,'primary');b.type='submit';f.onsubmit=async e=>{
  e.preventDefault();if(b.disabled)return;b.disabled=true;f.setAttribute('aria-busy','true');notice('Please wait…');
  try{await fn()}catch(error){notice(error.message,true)}finally{b.disabled=false;f.removeAttribute('aria-busy')}};return [f,b]}
export function facts(box,entries){const dl=el('dl');for(const [label,v] of entries)if(v!==undefined&&v!==null&&v!==''){dl.append(el('dt',label),el('dd',String(v)))}box.append(dl)}
export function tabs(box,entries,initial){const bar=el('div',null,'tabs'),body=el('div');box.append(bar,body);
  for(const [name,render] of entries){const b=btn(name,()=>{bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const pane=el('div');body.replaceChildren(pane);notice('');return render(pane)});bar.append(b)}
  ;(Array.from(bar.children).find(b=>b.textContent===initial)||bar.firstChild)?.click()}
export function pages(box,request,render,summary){
  const rows=el('div'),foot=el('div'),head=el('p');box.replaceChildren(head,rows,foot);let offset=0;
  async function load(){const r=await request(offset),batch=r.items||r.trips||r.records||[];
    if(!offset)head.textContent=summary?summary(r):((r.totalCount??r.totalMatched??batch.length)+' results');
    batch.forEach(row=>render(rows,row));offset+=batch.length;foot.replaceChildren();
    if(r.hasMore&&batch.length)foot.append(btn('Load more',load))}
  return load()
}
export function dateFilters(box,initial=''){const months=new Set(initial?[initial]:[]),dates=new Set();
 const pickers=[],wrap=el('details'),summary=el('summary','Dates'),chips=el('div',null,'tabs');wrap.append(summary);box.append(wrap);
 function refresh(){chips.replaceChildren();for(const set of [months,dates])for(const v of set)chips.append(btn(v+' ×',()=>{set.delete(v);refresh()}));summary.textContent='Dates · '+(months.size+dates.size||'All');wrap.dispatchEvent(new Event('selection'))}
 for(const [label,type,set] of [['Whole month','month',months],['Individual day','date',dates]]){const i=field(wrap,label,type),hints=el('datalist');hints.id=crypto.randomUUID();i.setAttribute('list',hints.id);wrap.append(hints);pickers.push([type,hints]);wrap.append(btn('Add '+(type==='month'?'month':'day'),()=>{if(i.value){set.add(i.value);i.value='';refresh()}}))}
 const count=el('small');wrap.append(chips,count);refresh();
 function suggest(values){count.textContent=values.length+' matching dates';for(const [type,hints] of pickers){hints.replaceChildren();for(const v of new Set(values.map(d=>type==='month'?d.slice(0,7):d)))hints.append(new Option(v,v))}}
 return {suggest,data:()=>({months:[...months],dates:[...dates]}),reset:()=>{months.clear();dates.clear();refresh()},wrap}}
export function money(v){return Number(v||0).toLocaleString('en-EG',{minimumFractionDigits:2,maximumFractionDigits:2})+' EGP'}
export function csv(name,rows){const value=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};const a=el('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(value).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
