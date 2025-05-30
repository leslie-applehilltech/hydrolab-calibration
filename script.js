// --- script.js (restored full version with missing functions) ---

let dbPromise;

window.addEventListener("DOMContentLoaded", async () => {
  const today = new Date();
  const uiFormatted = `${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.value = uiFormatted;
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (typeof loadUploadedFiles === "function") {
      loadUploadedFiles();
    }
  });

  const fileDate = today.toISOString().split("T")[0]; // "2025-04-19"
  const time = today.toTimeString().split(" ")[0].replace(/:/g, "-"); // "15-47-00"
  const fileName = `calibration-${fileDate}_${time}.json`;
  console.log("File name:", fileName);

  if (window.idb && typeof idb.openDB === "function") {
    dbPromise = idb.openDB("hydrolab-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("calibrations")) {
          db.createObjectStore("calibrations", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
    await loadSavedEntries();
  } else {
    console.error("idb is not loaded or invalid.");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service worker registered."))
      .catch((err) =>
        console.error("Service worker registration failed:", err)
      );
  }

  updateLoginStatus();
});

const siteId =
  "applehilltech376.sharepoint.com,cfac46a8-b47a-4f57-a68d-eee8e5f5b7cd,5767f226-f9fd-4c6c-93a8-423e704fa331";
const driveId =
  "b!qEasz3q0V0-mje7o5fW3zSbyZ1f9-WxMk6hCPnBPozEB19cLT3iPTr3S53F-vMq9";

async function saveToIndexedDB(entry) {
  const db = await dbPromise;
  const id = await db.add("calibrations", entry);
  entry.id = id;
  console.log("Saved to IndexedDB:", entry);
  await loadSavedEntries();
}

async function loadSavedEntries() {
  const db = await dbPromise;
  const entries = await db.getAll("calibrations");
  const container = document.getElementById("savedEntries");
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = "<p class='text-muted'>No saved entries yet.</p>";
    return;
  }

  entries.forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "container px-3 mb-3";
    wrapper.style.maxWidth = "600px";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
  <div class="card-body">
    <h5 class="card-title">${entry.date || "(no date)"}</h5>
    <p class="card-text mb-1"><strong>Calibrator:</strong> ${
      entry.calibrator || "(unknown)"
    }</p>
    <p class="card-text mb-1"><strong>Unit:</strong> ${
      entry.unit || "(unknown)"
    }</p>
    <p class="card-text"><strong>Notes:</strong> ${entry.notes || "(none)"}</p>
   <div class="d-flex justify-content-end gap-2 mt-3">
  <button class="btn btn-sm btn-outline-primary" onclick="uploadEntryById(${
    entry.id
  })" ${!navigator.onLine ? "disabled" : ""}>Upload</button>
  <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteEntry(${
    entry.id
  })">Delete</button>
</div> 
  </div>
`;

    wrapper.appendChild(card);
    container.appendChild(wrapper);
  });
}

async function uploadEntryById(id) {
  const db = await dbPromise;
  const entry = await db.get("calibrations", id);
  if (!entry) return alert("Entry not found.");
  await tryUploadEntry(entry);
  await loadSavedEntries(); // refresh the list
  await loadUploadedFiles();     // refresh SharePoint file list
}

async function confirmDeleteEntry(id) {
  if (!confirm("Are you sure you want to delete this entry?")) return;
  const db = await dbPromise;
  await db.delete("calibrations", id);
  await loadSavedEntries();
}

async function deleteEntry(id) {
  const db = await dbPromise;
  await db.delete("calibrations", id);
  await loadSavedEntries();
}

async function syncSavedEntries() {
  if (!navigator.onLine) {
    alert("You are currently offline. Sync not possible.");
    return;
  }

  const db = await dbPromise;
  const entries = await db.getAll("calibrations");

  for (const entry of entries) {
    await tryUploadEntry(entry);
  }

  alert("Sync complete. Check console for upload logs.");
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
    tbody.innerHTML += `<tr><th colspan="3">${label}: ${
      value || "<em>(blank)</em>"
    }</th></tr>`;
  }

  tbody.innerHTML += `<tr><th colspan="3">Conductivity Standard: ${
    condStandard || "<em>(blank)</em>"
  }</th></tr>`;
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

  tbody.innerHTML += `<tr><td colspan="3"><strong>Notes:</strong> ${
    notes || "<em>(none)</em>"
  }</td></tr>`;

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
  await loadSavedEntries

  document.getElementById("form").reset();
  document.getElementById("date").value = new Date()
    .toISOString()
    .split("T")[0];
}

async function tryUploadEntry(entry) {
  if (!navigator.onLine) {
    console.warn("Offline: Skipping upload");
    return;
  }

  try {
    const token = await loginAndGetToken();
    const now = new Date();
    // Convert MM/DD/YYYY (from UI) to YYYY-MM-DD for safe filename
    function formatDateForFilename(dateStr) {
      if (!dateStr.includes("/")) return dateStr; // already ISO
      const [month, day, year] = dateStr.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const localDate = formatDateForFilename(
      entry.date || now.toISOString().split("T")[0]
    );
    const localTime = now
      .toLocaleTimeString([], { hour12: false })
      .replace(/:/g, "-");
    const filename = `hydrolab-calibration-${localDate}_${localTime}.json`;

    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/Hydrolab Calibration/${filename}:/content`;

    console.log("Attempting upload to SharePoint:", uploadUrl);
    console.log("Entry data:", entry);

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry, null, 2),
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

async function loadUploadedFiles() {
  const container = document.getElementById("uploadedFiles");
  container.innerHTML = "<p class='text-muted'>Loading...</p>";

  try {
    const token = await loginAndGetToken(); // Uses MSAL login
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/Hydrolab Calibration:/children`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const files = data.value || [];
    files.sort((a, b) => new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime));

    if (files.length === 0) {
      container.innerHTML =
        "<p class='text-muted'>No files found in SharePoint.</p>";
      return;
    }

    const list = document.createElement("ul");
    list.className = "list-group";

    files.forEach((file) => {
      const item = document.createElement("li");
      item.className =
        "list-group-item d-flex justify-content-between align-items-center";
      item.innerHTML = `
        <span>${file.name}</span>
        <small class="text-muted">${new Date(
          file.lastModifiedDateTime
        ).toLocaleString()}</small>
      `;
      list.appendChild(item);
    });

    container.innerHTML = "";
    container.appendChild(list);
  } catch (err) {
    console.error("Failed to load files:", err);
    container.innerHTML = `<p class="text-danger">Error loading uploaded files.</p>`;
  }
}

function updateLoginStatus() {
  const display = document.getElementById("loginStatus");
  const accounts = msalInstance.getAllAccounts();
  const loggedIn = accounts.length > 0;

  display.textContent = loggedIn ? `Signed in as: ${accounts[0].username}` : "Not signed in";

  if (loggedIn && typeof loadUploadedFiles === "function") {
    loadUploadedFiles();
  }
}


window.loginManually = async () => {
  try {
    await loginAndGetToken();
    updateLoginStatus();
  } catch (err) {
    console.error("Manual login failed:", err);
  }
};

window.logoutManually = async () => {
  const account = msalInstance.getAllAccounts()[0];
  if (account) {
    await msalInstance.logoutPopup({ account });
    updateLoginStatus();
  }
};



function waitForMsal() {
  if (typeof window.msalInstance !== "undefined") {
    updateLoginStatus();
  } else {
    setTimeout(waitForMsal, 50);
  }
}

waitForMsal();

window.showConfirmation = showConfirmation;
window.confirmSave = confirmSave;
window.syncSavedEntries = syncSavedEntries;
window.loginManually = loginManually;
window.logoutManually = logoutManually;
window.loadSavedEntries = loadSavedEntries;
window.uploadEntryById = uploadEntryById;
window.loadUploadedFiles = loadUploadedFiles;
