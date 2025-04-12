// script.js (downloads JSON + uploads to .NET Web API + emails via Mailgun + iOS guidance + attachment support)

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
    // Upload to API
    fetch("https://your-personal-server.com/api/HydrolabUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error("Upload failed");
      console.log("Uploaded to personal .NET Web API successfully.");
    }).catch(err => {
      console.warn("Upload to .NET Web API failed:", err);
    });

    // Email with JSON attachment
    const formData = new FormData();
    formData.append("to", "you@example.com");
    formData.append("from", "noreply@yourdomain.com");
    formData.append("subject", `Hydrolab Calibration: ${data.date}`);
    formData.append("text", `Calibration entry from ${data.calibrator} on unit ${data.unit}`);
    formData.append("attachment", blob, filename);

    fetch("https://api.mailgun.net/v3/YOUR_DOMAIN/messages", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa("api:YOUR_MAILGUN_API_KEY")
      },
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error("Email failed");
      console.log("Email with attachment sent via Mailgun.");
    }).catch(err => {
      console.warn("Mailgun email failed:", err);
    });
  } else {
    alert("Saved locally. Unable to send now (offline). Upload/email will need to be done later.");
  }

  document.getElementById("form").reset();
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
}

window.showConfirmation = showConfirmation;
window.confirmSave = confirmSave;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
});
