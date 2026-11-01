import {jobs,retry,drain} from './photos.js';
import {session} from './client.js';
const header=document.querySelector('header');
if(header&&document.getElementById('startSubmitBtn')){
 const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Trip photos';button.style.marginLeft='auto';
 header.insertBefore(button,document.getElementById('menuBtn'));
 const dialog=document.createElement('dialog');dialog.style.cssText='width:min(680px,94vw);max-height:80vh;overflow:auto;border:1px solid #667085;border-radius:16px;padding:24px;background:var(--panel,#101827);color:inherit';
 const title=document.createElement('h2');title.textContent='Trip photos';const list=document.createElement('div'),close=document.createElement('button');close.textContent='Close';close.className='btn';close.onclick=()=>dialog.close();dialog.append(title,list,close);document.body.append(dialog);
 const status=job=>!job?'Not submitted':job.phase==='done'?'Uploaded':job.phase==='confirm'?'Awaiting confirmation':'Pending upload';
 async function render(){
  const rows=await jobs(),pending=rows.filter(j=>j.phase!=='done').length;
  button.hidden=!session();button.textContent=pending?`Photos pending (${pending})`:'Trip photos';list.replaceChildren();
  const grouped=new Map();for(const job of rows){if(!grouped.has(job.fields.tripId))grouped.set(job.fields.tripId,{});grouped.get(job.fields.tripId)[job.action==='km.start'?'start':'finish']=job}
  for(const pair of grouped.values()){
   const row=document.createElement('div');row.style.cssText='padding:14px 0;border-bottom:1px solid #667085;margin-bottom:12px';
   const date=document.createElement('small');date.textContent=new Date((pair.start||pair.finish).created).toLocaleString();
   const text=document.createElement('p');text.textContent=`Start Photo → ${status(pair.start)}  ·  Finish Photo → ${status(pair.finish)}`;row.append(date,text);
   for(const job of [pair.start,pair.finish].filter(j=>j&&j.phase!=='done')){
    const retryButton=document.createElement('button');retryButton.className='btn';retryButton.textContent='Retry '+(job.action==='km.start'?'start':'finish');
    retryButton.onclick=async()=>{retryButton.disabled=true;try{await retry(job);await render()}catch(e){text.textContent=e.message}finally{retryButton.disabled=false}};row.append(retryButton);
   }list.append(row);
  }
  if(!rows.length)list.textContent='No photo uploads on this browser.';
 }
 button.onclick=()=>{void render();dialog.showModal()};
 window.addEventListener('photochange',()=>void render());
 void render();void drain();
}
