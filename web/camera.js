import {el,btn,field} from './ui.js';
export function tripCamera(form,label,location){
 let captured,stream;
 const chooser=field(form,label+' from gallery','file');chooser.accept='image/*';
 const hint=el('p','A photo is required.'),preview=el('img');preview.alt=label;preview.hidden=true;let objectURL;
 function reset(){captured=null;chooser.value='';preview.hidden=true;if(objectURL)URL.revokeObjectURL(objectURL);hint.textContent='A photo is required.'}
 function show(file){if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);preview.src=objectURL;preview.hidden=false;hint.textContent='Photo ready'}
 chooser.onchange=()=>{captured=null;if(chooser.files[0])show(chooser.files[0])};
 const open=btn('Take '+label.toLowerCase(),async()=>{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  const d=el('dialog'),video=el('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.srcObject=stream;
  function close(){stream?.getTracks().forEach(t=>t.stop());stream=null;window.removeEventListener('hashchange',close);if(d.open)d.close();d.remove()}
  d.onclose=close;window.addEventListener('hashchange',close,{once:true});
  d.append(video,btn('Capture',async()=>{if(!video.videoWidth)throw Error('Camera is starting');const canvas=el('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);
   const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.85));if(!blob)throw Error('Capture failed');await location();captured=blob;chooser.value='';show(blob);close()}),btn('Cancel',close));
  document.body.append(d);d.showModal()
 });
 form.append(open,preview,hint);
 return {setDriver(name){reset();chooser.parentNode.hidden=!['rent','item transfer','unlocated car'].includes(String(name).trim().toLowerCase())},
   file(){const photo=captured||(!chooser.parentNode.hidden&&chooser.files[0]);if(!photo)throw Error('Take an odometer photo before submitting');return photo}}
}
