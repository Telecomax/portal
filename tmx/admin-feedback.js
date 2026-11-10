let box;
function dialog(){
 if(!box){box=document.createElement('dialog');box.className='admin-feedback';box.setAttribute('aria-label','Operation result');box.style.cssText='width:min(440px,90vw);border:1px solid #ccd3dd;border-radius:18px;padding:24px;color:var(--text);background:var(--panel,#fff)';document.body.append(box)}
 return box;
}
export function progress(text){const d=dialog();d.replaceChildren();const h=document.createElement('h2');h.textContent=text;const p=document.createElement('progress');p.setAttribute('aria-label',text);d.append(h,p);d.oncancel=e=>e.preventDefault();if(!d.open)d.showModal();}
export function result(text,success=true){const d=dialog();d.replaceChildren();const h=document.createElement('h2');h.textContent=success?'Succeeded':'Could not complete';const p=document.createElement('p');p.textContent=text;const ok=document.createElement('button');ok.className='btn primary';ok.textContent='OK';ok.onclick=()=>d.close();d.append(h,p,ok);d.oncancel=null;if(!d.open)d.showModal();ok.focus();}
