function xlsxEsc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function xlsxCol(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function xlsxSheet(rows){
 let xmlRows=rows.map((row,ri)=>'<row r="'+(ri+1)+'">'+row.map((v,ci)=>{
   let ref=xlsxCol(ci+1)+(ri+1);
   if(typeof v==='number'&&isFinite(v))return '<c r="'+ref+'"><v>'+v+'</v></c>';
   return '<c r="'+ref+'" t="inlineStr"><is><t>'+xlsxEsc(v)+'</t></is></c>';
 }).join('')+'</row>').join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+xmlRows+'</sheetData></worksheet>';
}
function crc32(bytes){
 let table=crc32.table||(crc32.table=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})());
 let c=0xffffffff;for(let b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;
}
function u16(n){return [n&255,(n>>>8)&255]} function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function makeZip(files){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0;
 for(const f of files){
  const name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32(data);
  const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);
  parts.push(local);
  const cen=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
  central.push(cen);offset+=local.length;
 }
 const csize=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csize),...u32(offset),...u16(0)]);
 return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export function payroll(rows){ const engGroups=Object.create(null),drvGroups=Object.create(null);
  rows.forEach(r=>(r.projects&&r.projects.length?r.projects:['—']).forEach(pr=>{
   const target=r.type==='Engineer'?engGroups:drvGroups;
   const k=r.name+'|'+pr;if(!target[k])target[k]={name:r.name,project:pr,total:0};target[k].total+=Number(r.amount)||0;
  }));
  const engCover=[['Engineer Name','Total Amount','Project'],...Object.values(engGroups).map(x=>[x.name,x.total,x.project])];
  const drvCover=[['Driver Name','Total Amount','Project'],...Object.values(drvGroups).map(x=>[x.name,x.total,x.project])];
  const engDetails=[['Engineer Name','Date','Day','Area','Base City','Project','Allowance Amount','Status'],
   ...rows.filter(r=>r.type==='Engineer').flatMap(r=>(r.projects&&r.projects.length?r.projects:['—']).map(pr=>[r.name,r.date,r.day,r.area,r.baseCity||'',pr,Number(r.amount)||0,r.status]))];
  const drvDetails=[['Driver Name','Date','Day','Area','Base City','Project','Allowance Amount','Status'],
   ...rows.filter(r=>r.type==='Driver').flatMap(r=>(r.projects&&r.projects.length?r.projects:['—']).map(pr=>[r.name,r.date,r.day,r.area,r.baseCity||'',pr,Number(r.amount)||0,r.status]))];
  const files=[
   {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},
   {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
   {name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Engineers Cover" sheetId="1" r:id="rId1"/><sheet name="Driver Cover" sheetId="2" r:id="rId2"/><sheet name="In Details Engineers" sheetId="3" r:id="rId3"/><sheet name="In Details Drivers" sheetId="4" r:id="rId4"/></sheets></workbook>'},
   {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/></Relationships>'},
   {name:'xl/worksheets/sheet1.xml',data:xlsxSheet(engCover)},
   {name:'xl/worksheets/sheet2.xml',data:xlsxSheet(drvCover)},
   {name:'xl/worksheets/sheet3.xml',data:xlsxSheet(engDetails)},
   {name:'xl/worksheets/sheet4.xml',data:xlsxSheet(drvDetails)}
  ];
return makeZip(files)
}

