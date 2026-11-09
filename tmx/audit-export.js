import {payrollNames} from './export-names.js';
export function installAuditExport() {
    const summary = document.querySelector('#summaryTab, [data-p="summary"]');
    if (!summary) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Export to Excel';
    button.style.marginInlineStart = 'auto';
    const photos = document.querySelector('#photosBtn, #toggleAllPhotosBtn');
    if (photos) summary.before(photos);
    summary.after(button);
    const tab = document.querySelector('#photoTab, [data-p="audit"]');
    function syncTab() {
        button.hidden = !tab.matches('.primary,.active');
        button.style.display = button.hidden ? 'none' : '';
    }
    new MutationObserver(syncTab).observe(tab, {attributes:true, attributeFilter:['class']});
    syncTab();
    button.onclick = async () => {
        if (!snapshot || !document.querySelector('[data-audit-trip]')) {
            toast('Apply filters with matching trips first');
            return;
        }
        button.disabled = true;
        try {
            const rows = snapshot();
            const fullName = await payrollNames(rows.map(t=>t.engineer),rows.map(t=>t.paidBy));
            const header = ['Trip ID','Date','Engineer','Driver','Vehicle','Project','Area','Task','Start KM','Finish KM','Trip KM','F&B KM','Total KM','Static hours','EGP per 10 KM','Amount spent (EGP)','Deduction (EGP)','Final amount (EGP)','Paid by','PM status','Finance status'];
            const details = [header,...rows.map(t => [t.tripId,t.date,fullName(t.engineer),t.driver,t.vehicle,t.projectName,t.area,t.task,t.startKm,t.finishKm,t.tripKm,t.forthBack,t.totalKm,t.staticHours,t.ratePerKm*10,t.amountSpent,t.deduction,t.finalAmount,fullName(t.paidBy),t.pmStatus,t.financeStatus])];
            const cover = [['Photo Audit','Value'],['Matching trips',rows.length],['Total KM',rows.reduce((v,t)=>v+Number(t.totalKm||0),0)],['Amount spent (EGP)',rows.reduce((v,t)=>v+t.amountSpent,0)]];
            const blob = auditWorkbook(cover, details);
            if (window.auditCall) {
                const data = await new Promise((resolve,reject)=>{
                    const reader = new FileReader();
                    reader.onload = ()=>resolve(reader.result.split(',')[1]);
                    reader.onerror = ()=>reject(reader.error);
                    reader.readAsDataURL(blob);
                });
                await window.auditCall('saveAuditWorkbook',{data});
            } else {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'KM-Photo-Audit.xlsx';
                link.click();
                setTimeout(()=>window.URL.revokeObjectURL(url),60000);
            }
        } catch(error) { toast('Export failed: '+error.message) }
        finally { button.disabled = false }
    };
}

let snapshot;
export function rememberAuditResults(getRows) {
    snapshot = getRows;
}
