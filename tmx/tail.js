// Small integration hooks. All page layouts and styles remain in their original HTML.
(function(){
 const state=JSON.parse(sessionStorage.getItem('telecomax.web.session.v1')||'null');
 if(state && document.getElementById('solfaUpload')){
  const canAdd=state.user.roles.some(r=>['pm','admin','super_admin'].includes(r));
  document.getElementById('solfaUpload').disabled=!canAdd;
 }
 // Original receipt viewer expects a direct original URL. Resolve it only on click.
 window.openOriginalFor=id=>TMX.originalReceipt(id).catch(e=>alert(e.message));
 if(document.getElementById('startSubmitBtn'))void import('/tmx/photo-status.js');
 if(state&&!state.user.roles.some(r=>['admin','super_admin','pm','finance'].includes(r))){
  const style=document.createElement('style');style.textContent='.edit-km{display:none!important}';document.head.append(style);
 }
})();
