import {op} from './client.js';

// The list remains usable while thumbnails are replaced by the stored evidence.
const selector='[data-evidence-side]';
const waiting=new Set(), jobs=new WeakMap();
let active=0;

async function resolveImage(frame,viaBridge){
    const tripId=frame.closest('[data-audit-trip]').dataset.auditTrip;
    const descriptor=await op('evidence.read',{tripId,photoType:frame.dataset.evidenceSide,variant:'original',viaBridge});
    const image=new Image();
    image.alt=(frame.dataset.evidenceSide==='start'?'Start':'Finish')+' odometer photo';
    await new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=()=>reject(Error('Original photo could not be loaded'));
        image.src=descriptor.url;
    });
    return image;
}

function original(frame){
    if(jobs.has(frame))return jobs.get(frame);
    const job=(async()=>{
        let image;
        try{image=await resolveImage(frame,true)}
        catch(first){
            if(first.message==='not found'||first.message==='not_found')throw first;
            image=await resolveImage(frame,false);
        }
        if(!frame.isConnected)return image;
        const previous=frame.querySelector('img');
        image.className=previous?.className||'';
        image.style.cssText='width:100%;height:100%;object-fit:contain;cursor:zoom-in';
        image.dataset.full=image.src;
        frame.replaceChildren(image);
        return image;
    })().catch(error=>{
        jobs.delete(frame);
        if(frame.isConnected&&!(error.message==='not found'||error.message==='not_found')){
            if(!frame.nextElementSibling?.classList.contains('original-retry')){
                const retry=document.createElement('button');retry.type='button';retry.className='btn original-retry';
                retry.textContent=frame.querySelector('img')?'Preview shown · Retry original':'Retry original photo';
                retry.onclick=()=>{retry.remove();waiting.add(frame);drain()};
                frame.after(retry);
            }
        }
        throw error;
    });
    jobs.set(frame,job);return job;
}

function drain(){
    while(active<2&&waiting.size){
        const frame=waiting.values().next().value;waiting.delete(frame);
        if(!frame.isConnected||!frame.getClientRects().length)continue;
        active++;
        original(frame).catch(()=>{}).finally(()=>{active--;drain()});
    }
}

const visibility=new IntersectionObserver(entries=>{
    for(const {target,isIntersecting} of entries){
        if(isIntersecting)waiting.add(target);else waiting.delete(target);
    }
    drain();
},{rootMargin:'100px 0px'});
function observe(node){
    if(node.nodeType!==1)return;
    if(node.matches(selector))visibility.observe(node);
    for(const frame of node.querySelectorAll(selector))visibility.observe(frame);
}
function forget(node){
    if(node.nodeType!==1)return;
    const frames=node.matches(selector)?[node]:node.querySelectorAll(selector);
    for(const frame of frames){visibility.unobserve(frame);waiting.delete(frame)}
}
const root=document.querySelector('#auditList,#tableWrap');
if(root){
    observe(root);
    new MutationObserver(records=>{for(const record of records){
        for(const removed of record.removedNodes)forget(removed);
        for(const added of record.addedNodes)observe(added);
    }})
        .observe(root,{childList:true,subtree:true});
}

function openViewer(frame){
    const dialog=document.createElement('dialog');
    dialog.style.cssText='width:96vw;height:90vh;max-width:none;max-height:94vh;padding:10px;box-sizing:border-box;background:#091a2b;color:white;border:1px solid #495566;border-radius:12px';
    const tools=document.createElement('div');tools.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px';
    const title=document.createElement('strong');title.textContent=frame.dataset.evidenceSide==='start'?'Start photo':'Finish photo';title.style.marginRight='auto';
    const zoom=document.createElement('button'),close=document.createElement('button');
    zoom.className=close.className='btn';zoom.disabled=true;zoom.textContent='Fit to screen';close.textContent='Close';
    close.onclick=()=>dialog.close();tools.append(title,zoom,close);
    const pane=document.createElement('div');pane.style.cssText='overflow:auto;height:calc(100% - 52px);background:#030813;overscroll-behavior:contain';
    pane.textContent='Loading original photo…';dialog.append(tools,pane);document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
    original(frame).then(source=>{
        if(!dialog.open)return;
        // Keep the decoded image: re-requesting a short-lived URL here could
        // fail after an auditor has spent several minutes reviewing a trip.
        const image=source,cardStyle=image.style.cssText;let natural=true;
        dialog.addEventListener('close',()=>{
            image.style.cssText=cardStyle;
            if(frame.isConnected)frame.replaceChildren(image);
        },{once:true});
        function paint(){
            image.style.cssText=natural?'display:block;max-width:none;max-height:none;width:'+source.naturalWidth+'px;height:auto':'display:block;width:100%;height:100%;object-fit:contain';
            zoom.textContent=natural?'Fit to screen':'Actual size';
        }
        pane.replaceChildren(image);paint();zoom.disabled=false;
        zoom.onclick=()=>{natural=!natural;paint()};
    }).catch(()=>{pane.textContent='Original photo unavailable. Close and retry on the card.'});
}
document.addEventListener('click',event=>{
    const frame=event.target.closest(selector);
    if(!frame||!frame.querySelector('img'))return;
    event.preventDefault();event.stopImmediatePropagation();openViewer(frame);
},true);
