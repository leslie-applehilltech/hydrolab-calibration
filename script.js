// script.js (downloads JSON + uploads to .NET Web API + emails via Mailgun + iOS guidance + attachment support)
async function saveToIndexedDB(entry) {
  const db = await dbPromise;
  await db.add('calibrations', entry);
  console.log("Saved to IndexedDB:", entry);
}

function showConfirmation() {
  const fields = {
    Date: document.getElementById("date").value,
    Calibrator: document.getElementById("calibrator").value,
    "Hydrolab Unit": document.getElementById("unit").value,
  };

  const groupedParams = [
    { label: "pH 7", startId: "ph7_start", endId: "ph7_end" },
    { label: "pH 4", startId: "ph4_start", endId: "ph4_end" },
    { label: "spCond", startId: "spcond_start", endId: "spcond_end" },
    { label: "Chla", startId: "chla_start", endId: "chla_end" },
    { label: "PYC", startId: "pyc_start", endId: "pyc_end" },
  ];

  const condStandard = document.getElementById("cond_standard").value;
  const notes = document.getElementById("notes").value;

  const tbody = document.getElementById("confirmationTableBody");
  tbody.innerHTML = "";

  for (const [label, value] of Object.entries(fields)) {
    tbody.innerHTML += `<tr><th colspan="3">${label}: ${value || "<em>(blank)</em>"}</th></tr>`;
  }

  tbody.innerHTML += `<tr><th colspan="3">Conductivity Standard: ${condStandard || "<em>(blank)</em>"}</th></tr>`;

  tbody.innerHTML += `
    <tr class="table-secondary">
      <th width="40%">Parameter</th>
      <th width="30%">Start Value</th>
      <th width="30%">End Value</th>
    </tr>`;

  groupedParams.forEach((param) => {
    const startVal = document.getElementById(param.startId).value;
    const endVal = document.getElementById(param.endId).value;
    tbody.innerHTML += `
      <tr>
        <td><strong>${param.label}</strong></td>
        <td>${startVal || "-"}</td>
        <td>${endVal || "-"}</td>
      </tr>`;
  });

  tbody.innerHTML += `<tr><td colspan="3"><strong>Notes:</strong> ${notes || "<em>(none)</em>"}</td></tr>`;

  const modal = new bootstrap.Modal(document.getElementById("confirmModal"));
  modal.show();
}

function confirmSave() {
  const data = {
    date: document.getElementById("date").value,
    calibrator: document.getElementById("calibrator").value,
    unit: document.getElementById("unit").value,
    ph7_start: document.getElementById("ph7_start").value,
    ph7_end: document.getElementById("ph7_end").value,
    ph4_start: document.getElementById("ph4_start").value,
    ph4_end: document.getElementById("ph4_end").value,
    cond_standard: document.getElementById("cond_standard").value,
    spcond_start: document.getElementById("spcond_start").value,
    spcond_end: document.getElementById("spcond_end").value,
    chla_start: document.getElementById("chla_start").value,
    chla_end: document.getElementById("chla_end").value,
    pyc_start: document.getElementById("pyc_start").value,
    pyc_end: document.getElementById("pyc_end").value,
    notes: document.getElementById("notes").value,
  };

  const filename = `hydrolab-calibration-${data.date || "entry"}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    alert("iPhone/iPad Users: After downloading, tap the Share icon and select 'Save to Files' → choose your synced SharePoint or OneDrive folder.");
  }

  if (navigator.onLine) {
    const bodyText = encodeURIComponent(JSON.stringify(data, null, 2));
    const subject = `Hydrolab Calibration: ${data.date}`;
    const mailto = `mailto:leslie.matthews@vermont.gov?subject=${subject}&body=${bodyText}`;
    window.location.href = mailto;
    alert("Email app opened. After sending, you may delete the file from Files app.");
  } else {
    alert("Saved locally. When you're back online, open the app again and send the file.");
  }


  document.getElementById("form").reset();
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
}

window.showConfirmation = showConfirmation;
window.confirmSave = confirmSave;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("Service worker registered."))
    .catch(err => console.error("Service worker registration failed:", err));
}

async function loadSavedEntries() {
  const db = await dbPromise;
  const entries = await db.getAll('calibrations');

  const container = document.getElementById('savedEntries');
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = "<p class='text-muted'>No saved entries yet.</p>";
    return;
  }

  entries.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "card mb-3";
    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${entry.date} – ${entry.unit}</h5>
        <p class="card-text">Calibrator: ${entry.calibrator}</p>
        <button class="btn btn-success me-2" onclick="sendEntry(${entry.id})">Send to SharePoint</button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteEntry(${entry.id})">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function deleteEntry(id) {
  const db = await dbPromise;
  await db.delete('calibrations', id);
  await loadSavedEntries();
}

async function sendEntry(id) {
  const db = await dbPromise;
  const entry = await db.get('calibrations', id);
  const body = encodeURIComponent(JSON.stringify(entry, null, 2));
  const subject = `Hydrolab Calibration: ${entry.date}`;
  const mailto = `mailto:leslie.matthews@vermont.com?subject=${subject}&body=${body}`;
  window.location.href = mailto;

  // Optionally auto-delete after opening email
  setTimeout(async () => {
    await deleteEntry(id);
  }, 2000);
}

