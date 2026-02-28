/* ================= HELPERS ================= */
const fmt = v => "PKR " + Number(v || 0).toLocaleString();

const formatDate = d => {
  if (!d) return "N/A";
  return d.split("-").reverse().join("-");
};

/* ================= STORAGE ================= */
let tenants = JSON.parse(localStorage.getItem("uss_tenants")) || [];
let invoices = JSON.parse(localStorage.getItem("uss_invoices")) || [];
let activeID = null;
let shareFile = null;

/* ================= UI REFRESH ================= */
function refreshUI() {
  document.getElementById("statTenants").innerText = tenants.length;

  document.getElementById("statRent").innerText =
    fmt(tenants.reduce((s, t) => s + Number(t.fixedRent || 0), 0));

  let paid = 0, unpaid = 0;
  invoices.forEach(i => {
    const total =
      Number(i.rent || 0) +
      Number(i.elec || 0) +
      Number(i.gas || 0) +
      Number(i.maint || 0) +
      Number(i.arr || 0) +
      Number(i.oth || 0);

    i.status === "PAID" ? paid += total : unpaid += total;
  });

  document.getElementById("statPaid").innerText = fmt(paid);
  document.getElementById("statPending").innerText = fmt(unpaid);

  document.getElementById("tenantBody").innerHTML = tenants.map(t => `
    <tr>
      <td>${t.name}</td>
      <td>${t.unit}</td>
      <td>
        <button class="btn-sm" onclick="loadTenant(${t.id})">Bill</button>
        <button class="btn-sm btn-danger" onclick="delTenant(${t.id})">X</button>
      </td>
    </tr>
  `).join("");
}

/* ================= TENANTS ================= */
function saveTenant() {
  const t = {
    id: Date.now(),
    name: tName.value.trim(),
    phone: tPhone.value.trim(),
    cnic: tCnic.value.trim(),
    unit: tUnit.value.trim(),
    elec: tElec.value.trim(),
    gas: tGas.value.trim(),
    since: tSince.value,
    dep: tDep.value,
    fixedRent: tFixedRent.value
  };

  if (!t.name || !t.unit) {
    alert("Tenant Name and Unit are required");
    return;
  }

  tenants.push(t);
  localStorage.setItem("uss_tenants", JSON.stringify(tenants));
  refreshUI();
  alert("Tenant saved successfully");
}

function delTenant(id) {
  if (!confirm("Delete tenant and all invoices?")) return;

  tenants = tenants.filter(t => t.id !== id);
  invoices = invoices.filter(i => i.tenantId !== id);

  localStorage.setItem("uss_tenants", JSON.stringify(tenants));
  localStorage.setItem("uss_invoices", JSON.stringify(invoices));

  activeID = null;
  document.getElementById("activeName").innerText = "Select Tenant";
  document.getElementById("invoiceBody").innerHTML = "";

  refreshUI();
}

function loadTenant(id) {
  activeID = id;
  const t = tenants.find(x => x.id === id);

  document.getElementById("activeName").innerText = t.name;
  document.getElementById("bRent").value = t.fixedRent;

  const arrears = invoices
    .filter(i => i.tenantId === id && i.status === "UNPAID")
    .reduce((s, i) => s +
      Number(i.rent || 0) +
      Number(i.elec || 0) +
      Number(i.gas || 0) +
      Number(i.maint || 0) +
      Number(i.arr || 0) +
      Number(i.oth || 0), 0);

  document.getElementById("bArr").value = arrears;
  renderHistory(id);
}

/* ================= INVOICES ================= */
function generateInvoice() {
  if (!activeID) {
    alert("Select a tenant first");
    return;
  }

  const inv = {
    id: Date.now(),
    tenantId: activeID,
    month: bMonth.value,
    rent: bRent.value,
    elec: bElec.value,
    gas: bGas.value,
    maint: bMaint.value,
    arr: bArr.value,
    oth: bOth.value,
    status: bStatus.value
  };

  invoices.push(inv);
  localStorage.setItem("uss_invoices", JSON.stringify(invoices));

  createPDF(inv.id);
  renderHistory(activeID);
  refreshUI();
}

function renderHistory(id) {
  document.getElementById("invoiceBody").innerHTML =
    invoices.filter(i => i.tenantId === id).map(i => `
      <tr>
        <td>${formatDate(i.month)}</td>
        <td>${fmt(
          Number(i.rent) + Number(i.elec) + Number(i.gas) +
          Number(i.maint) + Number(i.arr) + Number(i.oth)
        )}</td>
        <td class="status-${i.status}">${i.status}</td>
        <td>
          <button class="btn-sm" onclick="createPDF(${i.id})">PDF</button>
          <button class="btn-sm btn-danger" onclick="delInvoice(${i.id})">X</button>
        </td>
      </tr>
    `).join("");
}

function delInvoice(id) {
  if (!confirm("Delete this invoice?")) return;
  invoices = invoices.filter(i => i.id !== id);
  localStorage.setItem("uss_invoices", JSON.stringify(invoices));
  renderHistory(activeID);
  refreshUI();
}

/* ================= PDF (MATCHES GIVEN STYLE) ================= */
function createPDF(id) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const inv = invoices.find(i => i.id === id);
  const t = tenants.find(x => x.id === inv.tenantId);

  const total =
    Number(inv.rent) +
    Number(inv.elec) +
    Number(inv.gas) +
    Number(inv.oth) +
    Number(inv.arr) +
    Number(inv.maint);

  let y = 20;

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
    105, y, { align: "center" }
  );

  y += 6;
  doc.line(20, y, 190, y);
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

  y += 10;
  doc.line(20, y, 190, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Description", 25, y);
  doc.text("Amount (PKR)", 160, y);

  y += 4;
  doc.line(20, y, 190, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  [
    ["Monthly Rent", inv.rent],
    ["Electricity Bill", inv.elec],
    ["Gas Bill", inv.gas],
    ["Other Charges", inv.oth],
    ["Arrears", inv.arr],
    ["Maintenance / Service Fee", inv.maint]
  ].forEach(r => {
    doc.text(r[0], 25, y);
    doc.text(fmt(r[1]), 160, y);
    y += 7;
  });

  y += 3;
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Total Amount to Pay", 25, y);
  doc.text(fmt(total), 160, y);

  y += 8;
  doc.text(`Status: ${inv.status}`, 25, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.text("__________________________", 25, y);
  doc.text("Signature Landlord", 25, y + 5);

  doc.text("__________________________", 130, y);
  doc.text("Signature Tenant", 130, y + 5);

  y += 18;
  doc.setFontSize(9);
  doc.text(
    "This is a computer generated document and does not require a physical stamp.",
    105, y, { align: "center" }
  );

  const fileName = `Invoice_${t.name}_${inv.month}.pdf`;
  doc.save(fileName);
}

/* ================= INIT ================= */
refreshUI();
