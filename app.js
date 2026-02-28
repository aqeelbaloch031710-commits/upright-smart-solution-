window.createPDF = (id) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const inv = invoices.find(x => x.id === id);
    const t = tenants.find(x => x.id === inv.tenantId);

    const total =
        Number(inv.rent) +
        Number(inv.elec) +
        Number(inv.gas) +
        Number(inv.oth) +
        Number(inv.arr) +
        Number(inv.maint);

    let y = 20;

    /* ===== HEADER ===== */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Upright Smart Solution", 105, y, { align: "center" });

    y += 8;
    doc.setFontSize(12);
    doc.text("PROPERTY MONTHLY STATEMENT", 105, y, { align: "center" });

    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
        `Receipt No: USS-${inv.id}   |   Billing Period: ${formatDate(inv.month)}`,
        105,
        y,
        { align: "center" }
    );

    y += 6;
    doc.line(20, y, 190, y);

    /* ===== TENANT + PROPERTY DETAILS ===== */
    y += 10;

    doc.text(`Tenant's Name: ${t.name}`, 20, y);
    doc.text(`Premises On Rent: ${t.unit}`, 120, y);

    y += 7;
    doc.text(`Phone Number: ${t.phone}`, 20, y);
    doc.text(`Surety Deposit: ${fmt(t.dep)}`, 120, y);

    y += 7;
    doc.text(`CNIC: ${t.cnic}`, 20, y);
    doc.text(`Monthly Rent: ${fmt(t.fixedRent)}`, 120, y);

    y += 7;
    doc.text(`Electricity A/C No: ${t.elec}`, 20, y);
    doc.text(`Rented Since: ${formatDate(t.since)}`, 120, y);

    y += 7;
    doc.text(`Gas A/C No: ${t.gas}`, 20, y);

    /* ===== BILL TABLE HEADER ===== */
    y += 10;
    doc.line(20, y, 190, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Description", 25, y);
    doc.text("Amount (PKR)", 160, y);

    y += 4;
    doc.line(20, y, 190, y);
    doc.setFont("helvetica", "normal");

    /* ===== BILL ITEMS ===== */
    const rows = [
        ["Monthly Rent", fmt(inv.rent)],
        ["Electricity Bill", fmt(inv.elec)],
        ["Gas Bill", fmt(inv.gas)],
        ["Other Charges", fmt(inv.oth)],
        ["Arrears", fmt(inv.arr)],
        ["Maintenance / Service Fee", fmt(inv.maint)]
    ];

    y += 8;
    rows.forEach(r => {
        doc.text(r[0], 25, y);
        doc.text(r[1], 160, y);
        y += 7;
    });

    y += 3;
    doc.line(20, y, 190, y);

    /* ===== TOTAL ===== */
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount to Pay", 25, y);
    doc.text(fmt(total), 160, y);

    y += 8;
    doc.text(`Status: ${inv.status}`, 25, y);

    /* ===== SIGNATURES ===== */
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.text("__________________________", 25, y);
    doc.text("Signature Landlord", 25, y + 5);

    doc.text("__________________________", 130, y);
    doc.text("Signature Tenant", 130, y + 5);

    /* ===== FOOTER ===== */
    y += 18;
    doc.setFontSize(9);
    doc.text(
        "This is a computer generated document and does not require a physical stamp.",
        105,
        y,
        { align: "center" }
    );

    /* ===== DOWNLOAD ===== */
    const fileName = `Invoice_${t.name}_${inv.month}.pdf`;
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    shareFile = new File([blob], fileName, { type: "application/pdf" });
    document.getElementById("waBtn").style.display = "block";
};
