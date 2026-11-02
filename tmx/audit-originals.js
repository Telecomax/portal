import {op} from './client.js';

// The list remains usable while thumbnails are replaced by the stored evidence.
const selector='[data-evidence-side]';
const jobs=new WeakMap();


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
                retry.onclick=()=>{retry.remove();start(frame)};
                frame.after(retry);
            }
        }
        throw error;
    });
    jobs.set(frame,job);return job;
}

function start(frame){
    if(frame.isConnected)original(frame).catch(()=>{ /* Retry is offered on the card. */ });
}
function loadAdded(node){
    if(node.nodeType!==1)return;
    if(node.matches(selector))start(node);
    node.querySelectorAll(selector).forEach(start);
}
const root=document.querySelector('#auditList,#tableWrap');
if(root){
    loadAdded(root);
    new MutationObserver(records=>{
        for(const record of records)record.addedNodes.forEach(loadAdded);
    }).observe(root,{childList:true,subtree:true});
}

let closeViewer;
window.addEventListener('audit-close-viewer',()=>closeViewer?.());
function nativeViewerState(open){
    if(window.auditCall)window.auditCall('auditViewerState',{open}).catch(()=>{});
}

function openViewer(frame){
    closeViewer?.();
    const overlay=document.createElement('section'),bar=document.createElement('div'),pane=document.createElement('div');
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const title=frame.dataset.evidenceSide==='start'?'Start photo':'Finish photo';
    overlay.setAttribute('aria-label',title);
    overlay.style.cssText='position:fixed;z-index:2147483647;display:grid;grid-template-rows:auto minmax(0,1fr);box-sizing:border-box;padding:8px;margin:0;background:#091a2b;color:white';
    bar.style.cssText='display:flex;align-items:center;gap:8px;min-height:44px;padding-bottom:6px';
    pane.style.cssText='min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;background:#030813';
    const label=document.createElement('strong'),zoom=document.createElement('button'),close=document.createElement('button');
    label.textContent=title;label.style.marginRight='auto';
    zoom.className=close.className='btn';zoom.disabled=true;zoom.textContent='Actual size';close.textContent='Close';
    bar.append(label,zoom,close);pane.textContent='Loading original photo…';overlay.append(bar,pane);
    const viewport=window.visualViewport;
    function size(){
        Object.assign(overlay.style,{left:(viewport?.offsetLeft||0)+'px',top:(viewport?.offsetTop||0)+'px',
            width:(viewport?.width||window.innerWidth)+'px',height:(viewport?.height||window.innerHeight)+'px'});
    }
    const previousFocus=document.activeElement,background=[...document.body.children].filter(el=>!el.inert);
    background.forEach(el=>el.inert=true);
    const overflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';
    document.body.append(overlay);size();close.focus({preventScroll:true});nativeViewerState(true);
    viewport?.addEventListener('resize',size);window.addEventListener('resize',size);
    let restoreImage=()=>{};
    function escape(event){if(event.key==='Escape'){event.preventDefault();dismiss()}}
    function dismiss(){
        restoreImage();overlay.remove();background.forEach(el=>el.inert=false);
        document.documentElement.style.overflow=overflow;previousFocus?.focus?.({preventScroll:true});
        viewport?.removeEventListener('resize',size);window.removeEventListener('resize',size);
        document.removeEventListener('keydown',escape);closeViewer=null;nativeViewerState(false);
    }
    closeViewer=dismiss;close.onclick=dismiss;document.addEventListener('keydown',escape);
    original(frame).then(image=>{
        if(!overlay.isConnected)return;
        const css=image.style.cssText;
        restoreImage=()=>{image.style.cssText=css;if(frame.isConnected)frame.replaceChildren(image)};
        let natural=false;
        function paint(){
            image.style.cssText=natural?'display:block;margin:0;max-width:none;max-height:none;width:'+image.naturalWidth+'px;height:'+image.naturalHeight+'px':
                'display:block;margin:0;width:100%;height:100%;object-fit:contain';
            zoom.textContent=natural?'Fit to screen':'Actual size';pane.scrollTo(0,0);
        }
        pane.replaceChildren(image);paint();zoom.disabled=false;
        zoom.onclick=()=>{natural=!natural;paint()};
    }).catch(()=>{pane.textContent='Original photo unavailable. Close and retry on the card.'});
}

document.addEventListener('click',event=>{
    const frame=event.target.closest(selector);
    if(!frame)return;
    event.preventDefault();event.stopImmediatePropagation();openViewer(frame);
},true);

