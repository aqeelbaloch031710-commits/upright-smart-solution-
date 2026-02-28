document.addEventListener("DOMContentLoaded", () => {
    let tenants = JSON.parse(localStorage.getItem("uss_tenants")) || [];
    let invoices = JSON.parse(localStorage.getItem("uss_invoices")) || [];
    let activeID = null;
    let shareFile = null;

    const fmt = (v) => "PKR " + Number(v || 0).toLocaleString();

    // Fix Date Format to DD-MM-YYYY
    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const parts = dateStr.split("-"); // Handles YYYY-MM-DD or YYYY-MM
        return parts.reverse().join("-");
    };

    function refreshUI() {
        // Dashboard Stats
        document.getElementById("statTenants").innerText = tenants.length;
        document.getElementById("statRent").innerText = fmt(tenants.reduce((s, t) => s + Number(t.fixedRent), 0));
        
        let paidTotal = 0, unpaidTotal = 0;
        invoices.forEach(i => {
            let total = Number(i.rent)+Number(i.elec)+Number(i.gas)+Number(i.maint)+Number(i.arr)+Number(i.oth);
            i.status === "PAID" ? paidTotal += total : unpaidTotal += total;
        });
        document.getElementById("statPaid").innerText = fmt(paidTotal);
        document.getElementById("statPending").innerText = fmt(unpaidTotal);

        // Tenant Table
        document.getElementById("tenantBody").innerHTML = tenants.map(t => `
            <tr>
                <td>${t.name}</td><td>${t.unit}</td>
                <td>
                    <button class="btn-sm" onclick="loadTenant(${t.id})">Bill</button>
                    <button class="btn-sm btn-danger" onclick="delTenant(${t.id})">Delete</button>
                </td>
            </tr>`).join('');
    }

    window.saveTenant = () => {
        const t = {
            id: Date.now(), name: document.getElementById("tName").value,
            unit: document.getElementById("tUnit").value, phone: document.getElementById("tPhone").value,
            cnic: document.getElementById("tCnic").value, elec: document.getElementById("tElec").value,
            gas: document.getElementById("tGas").value, since: document.getElementById("tSince").value,
            dep: document.getElementById("tDep").value, fixedRent: document.getElementById("tFixedRent").value
        };
        if(!t.name || !t.unit) return alert("Please fill Name and Unit Number");
        tenants.push(t);
        localStorage.setItem("uss_tenants", JSON.stringify(tenants));
        refreshUI();
        alert("Tenant Record Saved Successfully!");
    };

    window.delTenant = (id) => {
        if(confirm("Warning: This will permanently remove the tenant and all their bills. Proceed?")) {
            tenants = tenants.filter(t => t.id !== id);
            invoices = invoices.filter(i => i.tenantId !== id);
            localStorage.setItem("uss_tenants", JSON.stringify(tenants));
            localStorage.setItem("uss_invoices", JSON.stringify(invoices));
            refreshUI();
            if(activeID === id) {
                activeID = null;
                document.getElementById("activeName").innerText = "Select Tenant";
            }
        }
    };

    window.loadTenant = (id) => {
        activeID = id;
        const t = tenants.find(x => x.id === id);
        document.getElementById("activeName").innerText = t.name;
        document.getElementById("bRent").value = t.fixedRent;
        // Auto-calculate arrears from all unpaid bills
        const arrears = invoices.filter(i => i.tenantId === id && i.status === "UNPAID")
            .reduce((s, i) => s + (Number(i.rent)+Number(i.elec)+Number(i.gas)+Number(i.maint)+Number(i.arr)+Number(i.oth)), 0);
        document.getElementById("bArr").value = arrears;
        renderHistory(id);
    };

    window.generateInvoice = () => {
        if(!activeID) return alert("Please select a tenant from the list first!");
        const inv = {
            id: Date.now(), tenantId: activeID, month: document.getElementById("bMonth").value,
            rent: document.getElementById("bRent").value || 0, elec: document.getElementById("bElec").value || 0,
            gas: document.getElementById("bGas").value || 0, maint: document.getElementById("bMaint").value || 0,
            arr: document.getElementById("bArr").value || 0, oth: document.getElementById("bOth").value || 0,
            status: document.getElementById("bStatus").value
        };
        invoices.push(inv);
        localStorage.setItem("uss_invoices", JSON.stringify(invoices));
        createPDF(inv.id);
        renderHistory(activeID);
        refreshUI();
    };

   // Inside window.createPDF
doc.setFont("helvetica", "bold");
// Change color if partially paid
if(inv.status === "PARTIALLY PAID") {
    doc.setTextColor(255, 140, 0); // Orange color for partial
} else if (inv.status === "PAID") {
    doc.setTextColor(0, 128, 0); // Green for paid
} else {
    doc.setTextColor(255, 0, 0); // Red for unpaid
}

doc.text("Payment Status: " + inv.status, 20, y+15);
doc.setTextColor(0, 0, 0); // Reset to black
    
        // --- PDF BLUE HEADER ---
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold"); doc.setFontSize(22);
        doc.text("Upright Smart Solution", 105, 20, {align: "center"});
        doc.setFontSize(12); doc.text("PROPERTY MONTHLY STATEMENT", 105, 30, {align: "center"});

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Receipt No: USS-${inv.id} | Period: ${formatDate(inv.month)}`, 105, 48, {align: "center"});
        doc.line(20, 52, 190, 52);

        // --- TWO COLUMN REARRANGED LAYOUT ---
        let leftX = 20, rightX = 110, y = 62;

        // Left Side: Tenant Details
        doc.setFont("helvetica", "bold"); doc.text("TENANT DETAILS", leftX, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Name:", leftX, y);
        doc.setFont("helvetica", "normal"); doc.text(t.name, leftX + 15, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("CNIC:", leftX, y);
        doc.setFont("helvetica", "normal"); doc.text(t.cnic, leftX + 15, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Phone:", leftX, y);
        doc.setFont("helvetica", "normal"); doc.text(t.phone, leftX + 15, y);

        // Right Side: Property Details
        y = 62;
        doc.setFont("helvetica", "bold"); doc.text("Rented Property Details", rightX, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Premises on rented:", rightX, y);
        doc.setFont("helvetica", "normal"); doc.text(t.unit, rightX + 45, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Surety Deposit:", rightX, y);
        doc.setFont("helvetica", "normal"); doc.text(fmt(t.dep), rightX + 45, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Monthly Rent:", rightX, y);
        doc.setFont("helvetica", "normal"); doc.text(fmt(t.fixedRent), rightX + 45, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Rented Since:", rightX, y);
        doc.setFont("helvetica", "normal"); doc.text(formatDate(t.since), rightX + 45, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Electricity A/C:", rightX, y);
        doc.setFont("helvetica", "normal"); doc.text(t.elec, rightX + 45, y);
        y += 8;
        doc.setFont("helvetica", "bold"); doc.text("Gas A/C No:", rightX, y);
        doc.setFont("helvetica", "normal"); doc.text(t.gas, rightX + 45, y);

        // --- BILLING TABLE ---
        y += 15;
        doc.setFillColor(240, 240, 240); doc.rect(20, y, 170, 10, 'F');
        doc.setFont("helvetica", "bold"); doc.text("Description", 25, y+7); doc.text("Amount (PKR)", 150, y+7);
        
        const items = [
            ["Current Monthly Rent", fmt(inv.rent)], ["Electricity Bill", fmt(inv.elec)],
            ["Gas Bill", fmt(inv.gas)], ["Other Charges", fmt(inv.oth)],
            ["Previous Arrears", fmt(inv.arr)], ["Maintenance / Repairing", fmt(inv.maint)]
        ];

        y += 18;
        items.forEach(item => {
            doc.setFont("helvetica", "normal"); doc.text(item[0], 25, y);
            doc.setFillColor(255, 255, 0); doc.rect(148, y-5, 40, 7, 'F'); // Yellow Highlight
            doc.text(item[1], 150, y);
            y += 10;
        });

        doc.setFont("helvetica", "bold");
        doc.setFillColor(255, 255, 0); doc.rect(148, y-5, 40, 10, 'F'); // Total Highlight
        doc.text("Grand Total to Pay", 25, y+2); doc.text(fmt(total), 150, y+2);
        
        doc.text("Payment Status: " + inv.status, 20, y+15);
        y += 40;
        doc.text("________________", 25, y); doc.text("Signature Landlord", 25, y+5);
        doc.text("________________", 140, y); doc.text("Signature Tenant", 140, y+5);

        // Automatic Computer Download
        const fileName = `Invoice_${t.name}_${inv.month}.pdf`;
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = fileName;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);

        // Prepare for WhatsApp Share
        shareFile = new File([blob], fileName, { type: 'application/pdf' });
        document.getElementById("waBtn").style.display = "block";
    };

    window.shareToWhatsApp = async () => {
        if (navigator.share && shareFile) {
            try {
                await navigator.share({ files: [shareFile], title: 'Invoice', text: 'Invoice from Upright Smart Solution' });
            } catch (err) { alert("Sharing cancelled."); }
        } else {
            alert("Sharing not supported on this browser.");
        }
    };

    function renderHistory(tid) {
        document.getElementById("invoiceBody").innerHTML = invoices.filter(i => i.tenantId === tid).map(i => `
            <tr><td>${formatDate(i.month)}</td><td>${fmt(Number(i.rent)+Number(i.elec)+Number(i.gas)+Number(i.maint)+Number(i.arr)+Number(i.oth))}</td>
            <td class="status-${i.status}">${i.status}</td>
            <td><button class="btn-sm" onclick="createPDF(${i.id})">Save</button>
            <button class="btn-sm btn-danger" onclick="delInvoice(${i.id})">X</button></td></tr>`).join('');
    }

    window.delInvoice = (id) => {
        if(confirm("Remove this invoice record?")) {
            invoices = invoices.filter(i => i.id !== id);
            localStorage.setItem("uss_invoices", JSON.stringify(invoices));
            renderHistory(activeID); refreshUI();
        }
    };

    refreshUI();
});
