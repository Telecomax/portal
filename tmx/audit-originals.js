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

let closeViewer;
window.addEventListener('audit-close-viewer',()=>closeViewer?.());
function nativeViewerState(open){
    if(window.auditCall)window.auditCall('auditViewerState',{open}).catch(()=>{});
}

function zoomableImage(pane,image){
    let scale=1,x=0,y=0,fit=1;
    const pointers=new Map();
    let press=null,dragged=false;
    const clamp=(value,bound)=>Math.max(-bound,Math.min(bound,value));
    function draw(){
        const w=pane.clientWidth,h=pane.clientHeight;
        if(!w||!h)return;
        fit=Math.min(w/image.naturalWidth,h/image.naturalHeight);
        const width=image.naturalWidth*fit*scale,height=image.naturalHeight*fit*scale;
        x=clamp(x,Math.max(0,(width-w)/2));y=clamp(y,Math.max(0,(height-h)/2));
        Object.assign(image.style,{width:width+'px',height:height+'px',left:(w-width)/2+x+'px',top:(h-height)/2+y+'px'});
        pane.style.cursor=scale===1?'zoom-in':'zoom-out';
    }
    function zoom(factor,from,to=from){
        const next=Math.max(1,Math.min(8,scale*factor)),ratio=next/scale;
        x=to.x-(from.x-x)*ratio;y=to.y-(from.y-y)*ratio;scale=next;draw();
    }
    function position(e){
        const r=pane.getBoundingClientRect();
        return {x:e.clientX-r.left-r.width/2,y:e.clientY-r.top-r.height/2};
    }
    const middle=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    pane.onpointerdown=e=>{
        if(e.button!==0||pointers.size>=2)return;
        const p=position(e);
        if(!pointers.size){press=p;dragged=false}else dragged=true;
        pointers.set(e.pointerId,p);pane.setPointerCapture(e.pointerId);
    };
    pane.onpointermove=e=>{
        if(!pointers.has(e.pointerId))return;
        const prev=pointers.get(e.pointerId),p=position(e);
        pointers.set(e.pointerId,p);
        const other=[...pointers].find(([id])=>id!==e.pointerId)?.[1];
        if(other){
            const d=distance(prev,other);
            if(d>0)zoom(distance(p,other)/d,middle(prev,other),middle(p,other));
        }else{
            if(press&&distance(p,press)>4)dragged=true;
            x+=p.x-prev.x;y+=p.y-prev.y;draw();
        }
    };
    pane.onpointerup=e=>{
        if(!pointers.delete(e.pointerId))return;
        if(e.pointerType==='mouse'&&e.button===0&&!dragged){
            zoom(scale===1?Math.max(2,1/fit):1/scale,position(e));
        }
    };
    pane.onlostpointercapture=pane.onpointercancel=e=>pointers.delete(e.pointerId);
    pane.onkeydown=e=>{
        if(['+','=','-','0'].includes(e.key)){
            e.preventDefault();zoom(e.key==='0'?1/scale:e.key==='-'?0.5:2,{x:0,y:0});
        }
    };
    image.draggable=false;image.style.cssText='position:absolute;display:block;max-width:none;max-height:none;pointer-events:none;margin:0';
    pane.replaceChildren(image);draw();
    const resize=new ResizeObserver(draw);resize.observe(pane);
    return ()=>resize.disconnect();
}

function openViewer(frame){
    closeViewer?.();
    const overlay=document.createElement('section'),bar=document.createElement('div'),pane=document.createElement('div');
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const title=frame.dataset.evidenceSide==='start'?'Start photo':'Finish photo';
    overlay.setAttribute('aria-label',title);
    overlay.style.cssText='position:fixed;z-index:2147483647;display:grid;grid-template-rows:auto minmax(0,1fr);box-sizing:border-box;padding:8px;margin:0;background:#091a2b;color:white';
    bar.style.cssText='display:flex;align-items:center;gap:8px;min-height:44px;padding-bottom:6px';
    pane.style.cssText='position:relative;min-width:0;min-height:0;overflow:hidden;touch-action:none;user-select:none;background:#030813';
    pane.tabIndex=0;pane.setAttribute('aria-label','Photo: pinch to zoom, or click to toggle zoom. Use + and − on the keyboard.');
    const label=document.createElement('strong'),close=document.createElement('button');
    label.textContent=title;label.style.marginRight='auto';
    close.className='btn';close.textContent='Close';
    bar.append(label,close);pane.textContent='Loading original photo…';overlay.append(bar,pane);
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
        const stop=zoomableImage(pane,image);
        restoreImage=()=>{stop();image.style.cssText=css;if(frame.isConnected)frame.replaceChildren(image)};
    }).catch(()=>{pane.textContent='Original photo unavailable. Close and retry on the card.'});
}

document.addEventListener('click',event=>{
    const frame=event.target.closest(selector);
    if(!frame)return;
    event.preventDefault();event.stopImmediatePropagation();openViewer(frame);
},true);

