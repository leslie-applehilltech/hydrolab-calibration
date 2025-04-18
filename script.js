// --- script.js (with sync button logic) ---

// Assumes auth.js is loaded globally before this script
const siteId = "applehilltech376.sharepoint.com,cfac46a8-b47a-4f57-a68d-eee8e5f5b7cd,5767f226-f9fd-4c6c-93a8-423e704fa331";
const driveId = "b!qEasz3q0V0-mje7o5fW3zSbyZ1f9-WxMk6hCPnBPozEB19cLT3iPTr3S53F-vMq9";

async function saveToIndexedDB(entry) {
  const db = await dbPromise;
  await db.add('calibrations', entry);
  console.log("Saved to IndexedDB:", entry);
  await loadSavedEntries();
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

async function confirmSave() {
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

  await saveToIndexedDB(data);
  await tryUploadEntry(data);

  document.getElementById("form").reset();
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
}

async function tryUploadEntry(entry) {
  if (!navigator.onLine) return;
  try {
    const token = await loginAndGetToken();
    const filename = `hydrolab-calibration-${entry.date || "entry"}.json`;
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/Hydrolab Calibration/${filename}:/content`;

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(entry, null, 2)
    });

    if (res.ok) {
      console.log(`Uploaded: ${filename}`);
      await deleteEntry(entry.id); // cleanup if uploaded
    }
  } catch (e) {
    console.warn("Upload failed", e);
  }
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

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "card mb-3";
    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${entry.date} – ${entry.unit}</h5>
        <p class="card-text">Calibrator: ${entry.calibrator}</p>
        <pre class="small">${JSON.stringify(entry, null, 2)}</pre>
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

async function syncSavedEntries() {
  if (!navigator.onLine) {
    alert("You are currently offline. Sync not possible.");
    return;
  }

  const db = await dbPromise;
  const entries = await db.getAll('calibrations');

  for (const entry of entries) {
    await tryUploadEntry(entry);
  }

  alert("Sync complete. Check console for upload logs.");
}

window.showConfirmation = showConfirmation;
window.confirmSave = confirmSave;
window.syncSavedEntries = syncSavedEntries;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
  loadSavedEntries();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("Service worker registered."))
    .catch(err => console.error("Service worker registration failed:", err));
}
