/* ================= SAFE SELECTOR ================= */
const $ = id => document.getElementById(id);

/* ================= HELPERS ================= */
const fmt = n => "PKR " + (Number(n) || 0).toLocaleString();

const formatDate = d => {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
};

/* ================= STORAGE ================= */
let tenants = JSON.parse(localStorage.getItem("tenants")) || [];
let invoices = JSON.parse(localStorage.getItem("invoices")) || [];
let activeTenant = null;

/* ================= DASHBOARD ================= */
function refreshStats() {
  if ($("statTenants")) $("statTenants").innerText = tenants.length;

  let paid = 0, unpaid = 0;
  invoices.forEach(i => {
    const total = calcTotal(i);
    i.status === "PAID" ? paid += total : unpaid += total;
  });

  if ($("statPaid")) $("statPaid").innerText = fmt(paid);
  if ($("statPending")) $("statPending").innerText = fmt(unpaid);
}

/* ================= TENANT ================= */
function saveTenant() {
  const t = {
    id: Date.now(),
    name: $("tName").value.trim(),
    phone: $("tPhone").value.trim(),
    cnic: $("tCnic").value.trim(),
    unit: $("tUnit").value.trim(),
    elec: $("tElec").value.trim(),
    gas: $("tGas").value.trim(),
    since: $("tSince").value,
    dep: $("tDep").value,
    rent: $("tFixedRent").value
  };

  if (!t.name || !t.unit) {
    alert("Tenant Name & Unit required");
    return;
  }

  tenants.push(t);
  localStorage.setItem("tenants", JSON.stringify(tenants));
  clearTenantForm();
  renderTenantList();
  refreshStats();
}

/* ================= CLEAR FORM ================= */
function clearTenantForm() {
  ["tName","tPhone","tCnic","tUnit","tElec","tGas","tSince","tDep","tFixedRent"]
    .forEach(id => $(id).value = "");
}

/* ================= TENANT LIST ================= */
function renderTenantList() {
  if (!$("tenantBody")) return;

  $("tenantBody").innerHTML = tenants.map(t => `
    <tr>
      <td>${t.name}</td>
      <td>${t.unit}</td>
      <td>
        <button class="btn-sm" onclick="selectTenant(${t.id})">Bill</button>
        <button class="btn-sm btn-danger" onclick="deleteTenant(${t.id})">X</button>
      </td>
    </tr>
  `).join("");
}

/* ================= SELECT TENANT ================= */
function selectTenant(id) {
  activeTenant = tenants.find(t => t.id === id);
  if (!activeTenant) return;

  if ($("activeName")) $("activeName").innerText = activeTenant.name;
  if ($("bRent")) $("bRent").value = activeTenant.rent || 0;

  renderInvoiceHistory();
}

/* ================= DELETE TENANT ================= */
function deleteTenant(id) {
  if (!confirm("Delete tenant & invoices?")) return;

  tenants = tenants.filter(t => t.id !== id);
  invoices = invoices.filter(i => i.tenantId !== id);

  localStorage.setItem("tenants", JSON.stringify(tenants));
  localStorage.setItem("invoices", JSON.stringify(invoices));

  activeTenant = null;
  renderTenantList();
  renderInvoiceHistory();
  refreshStats();
}

/* ================= INVOICE ================= */
function calcTotal(i) {
  return (
    Number(i.rent || 0) +
    Number(i.elec || 0) +
    Number(i.gas || 0) +
    Number(i.maint || 0) +
    Number(i.arr || 0) +
    Number(i.other || 0)
  );
}

function generateInvoice() {
  if (!activeTenant) {
    alert("Select tenant first");
    return;
  }

  if (!$("bMonth").value) {
    alert("Select billing month");
    return;
  }

  const inv = {
    id: Date.now(),
    tenantId: activeTenant.id,
    month: $("bMonth").value,
    rent: $("bRent").value,
    elec: $("bElec").value,
    gas: $("bGas").value,
    maint: $("bMaint").value,
    arr: $("bArr").value,
    other: $("bOth").value,
    status: $("bStatus").value
  };

  invoices.push(inv);
  localStorage.setItem("invoices", JSON.stringify(invoices));
  renderInvoiceHistory();
  refreshStats();
  createPDF(inv);
}

/* ================= HISTORY ================= */
function renderInvoiceHistory() {
  if (!$("invoiceBody") || !activeTenant) return;

  $("invoiceBody").innerHTML = invoices
    .filter(i => i.tenantId === activeTenant.id)
    .map(i => `
      <tr>
        <td>${formatDate(i.month)}</td>
        <td>${fmt(calcTotal(i))}</td>
        <td class="status-${i.status}">${i.status}</td>
        <td>
          <button class="btn-sm" onclick="createPDF(${i.id})">PDF</button>
        </td>
      </tr>
    `).join("");
}

/* ================= PDF ================= */
function createPDF(invOrId) {
  const inv = typeof invOrId === "object"
    ? invOrId
    : invoices.find(i => i.id === invOrId);

  if (!inv) return;

  const t = tenants.find(x => x.id === inv.tenantId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;

  doc.setFontSize(16);
  doc.text("Upright Smart Solution", 105, y, { align: "center" });

  y += 8;
  doc.setFontSize(11);
  doc.text("PROPERTY MONTHLY STATEMENT", 105, y, { align: "center" });

  y += 10;
  doc.setFontSize(10);
  doc.text(`Tenant: ${t.name}`, 20, y);
  doc.text(`Unit: ${t.unit}`, 120, y);

  y += 8;
  doc.text(`Billing Month: ${formatDate(inv.month)}`, 20, y);
  doc.text(`Status: ${inv.status}`, 120, y);

  y += 10;
  doc.line(20, y, 190, y);
  y += 8;

  [
    ["Monthly Rent", inv.rent],
    ["Electricity", inv.elec],
    ["Gas", inv.gas],
    ["Maintenance", inv.maint],
    ["Arrears", inv.arr],
    ["Other", inv.other]
  ].forEach(r => {
    doc.text(r[0], 25, y);
    doc.text(fmt(r[1]), 160, y);
    y += 7;
  });

  y += 5;
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFont(undefined, "bold");
  doc.text("Total", 25, y);
  doc.text(fmt(calcTotal(inv)), 160, y);

  doc.save(`Invoice_${t.name}_${inv.month}.pdf`);
}

/* ================= INIT ================= */
renderTenantList();
refreshStats();
