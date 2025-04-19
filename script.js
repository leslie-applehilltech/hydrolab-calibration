// --- script.js (with sync button logic + IndexedDB setup + Login/Logout UI) ---

let dbPromise;

window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("date").value = new Date().toISOString().split("T")[0];

  if (window.idb && typeof idb.openDB === "function") {
    dbPromise = idb.openDB('hydrolab-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('calibrations')) {
          db.createObjectStore('calibrations', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      }
    });
    await loadSavedEntries();
  } else {
    console.error("idb is not loaded or invalid.");
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log("Service worker registered."))
      .catch(err => console.error("Service worker registration failed:", err));
  }

  updateLoginStatus();
});

const siteId = "YOUR_SITE_ID";
const driveId = "YOUR_DRIVE_ID";

async function saveToIndexedDB(entry) {
  const db = await dbPromise;
  const id = await db.add('calibrations', entry);
  entry.id = id;
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
  if (!navigator.onLine) {
    console.warn("Offline: Skipping upload");
    return;
  }

  try {
    const token = await loginAndGetToken();
    const filename = `hydrolab-calibration-${entry.date || "entry"}.json`;
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/Hydrolab Calibration/${filename}:/content`;

    console.log("Attempting upload to SharePoint:", uploadUrl);
    console.log("Entry data:", entry);

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(entry, null, 2)
    });

    const responseText = await res.text();
    console.log("Upload response status:", res.status);
    console.log("Upload response body:", responseText);

    if (res.ok) {
      console.log(`✅ Successfully uploaded: ${filename}`);
      await deleteEntry(entry.id);
    } else {
      console.warn(`❌ Upload failed: HTTP ${res.status}`);
    }
  } catch (e) {
    console.error("❌ Upload exception:", e);
  }
}

// --- LOGIN / LOGOUT CONTROLS ---

window.loginManually = async () => {
  try {
    await loginAndGetToken();
    updateLoginStatus();
  } catch (err) {
    console.error("Manual login failed:", err);
  }
};

window.logoutManually = async () => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    await msalInstance.logoutPopup({ account: accounts[0] });
    updateLoginStatus();
  }
};

function updateLoginStatus() {
  const display = document.getElementById("loginStatus");
  const accounts = msalInstance.getAllAccounts();
  display.textContent = accounts.length > 0 ? `Signed in as: ${accounts[0].username}` : "Not signed in";
}
