// script.js (updated to use IndexedDB)
import { saveEntry, getUnsyncedEntries, markAsSynced } from './db.js';

// Save form data to IndexedDB
function saveData() {
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
    synced: false,
  };

  saveEntry(data).then(() => {
    alert("Saved locally!");
    document.getElementById("form").reset();
  });
}

// Show confirmation modal
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
  saveData();
}

// Auto-sync unsynced entries from IndexedDB to backend
async function syncUnsyncedEntries() {
  const backendUrl = "https://hydrolab-calibration.onrender.com/add-entry";
  const unsynced = await getUnsyncedEntries();
  let syncedCount = 0;

  for (const entry of unsynced) {
    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: entry }),
      });

      const result = await response.json();
      if (result.success) {
        await markAsSynced(entry.id);
        syncedCount++;
        console.log("Synced entry:", entry);
      }
    } catch (err) {
      console.error("Sync failed for entry:", err);
    }
  }

  if (syncedCount > 0) {
    alert(`${syncedCount} entries synced to Google Sheets!`);
  }
}

// Register service worker and trigger sync when online
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then((reg) => console.log("Service Worker registered:", reg.scope))
      .catch((err) => console.error("Service Worker registration failed:", err));

    // Attempt sync on load
    if (navigator.onLine) {
      syncUnsyncedEntries();
    }
  });
}

document.getElementById("saveButton").addEventListener("click", showConfirmation);

window.showConfirmation = showConfirmation;
window.confirmSave = confirmSave;

window.addEventListener("online", () => {
  console.log("Back online, attempting sync...");
  syncUnsyncedEntries();
});
