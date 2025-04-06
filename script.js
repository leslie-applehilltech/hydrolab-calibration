// script.js

const backendUrl = "https://hydrolab-calibration.onrender.com/add-entry";

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
    synced: false
  };

  const entries = JSON.parse(localStorage.getItem("calibrationEntries")) || [];
  entries.push(data);
  localStorage.setItem("calibrationEntries", JSON.stringify(entries));
  alert("Saved locally!");
  document.getElementById("form").reset();
}

function showConfirmation() {
  const fields = {
    Date: document.getElementById("date").value,
    Calibrator: document.getElementById("calibrator").value,
    "Hydrolab Unit": document.getElementById("unit").value
  };

  const groupedParams = [
    { label: "pH 7", startId: "ph7_start", endId: "ph7_end" },
    { label: "pH 4", startId: "ph4_start", endId: "ph4_end" },
    { label: "spCond", startId: "spcond_start", endId: "spcond_end" },
    { label: "Chla", startId: "chla_start", endId: "chla_end" },
    { label: "PYC", startId: "pyc_start", endId: "pyc_end" }
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
      <th>Parameter</th>
      <th>Start</th>
      <th>End</th>
    </tr>`;
  groupedParams.forEach(p => {
    const startVal = document.getElementById(p.startId).value;
    const endVal = document.getElementById(p.endId).value;
    tbody.innerHTML += `<tr><td><strong>${p.label}</strong></td><td>${startVal || "-"}</td><td>${endVal || "-"}</td></tr>`;
  });
  tbody.innerHTML += `<tr><td colspan="3"><strong>Notes:</strong> ${notes || "<em>(none)</em>"}</td></tr>`;

  const modalEl = document.getElementById("confirmModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function confirmSave() {
  saveData();
}

async function syncData() {
  const entries = JSON.parse(localStorage.getItem("calibrationEntries")) || [];
  const unsynced = entries.filter(entry => !entry.synced);
  let syncedCount = 0;

  for (const entry of unsynced) {
    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: entry })
      });
      const result = await res.json();
      if (result.success) {
        entry.synced = true;
        syncedCount++;
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  }

  localStorage.setItem("calibrationEntries", JSON.stringify(entries));
  if (syncedCount > 0) alert(`${syncedCount} entries synced.`);
}

window.addEventListener("load", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register("service-worker.js")
      .then(reg => console.log("SW registered:", reg.scope))
      .catch(err => console.error("SW failed:", err));
  }

  if (navigator.onLine) {
    console.log("Online! Attempting sync...");
    syncData();
  }
});

window.addEventListener("online", () => {
  console.log("Back online. Attempting sync...");
  syncData();
});
