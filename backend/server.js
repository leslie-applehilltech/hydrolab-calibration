const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for all origins (important for frontend connection)
app.use(cors());

// ✅ Middleware to parse JSON
app.use(bodyParser.json());

// ✅ Optional: root route to confirm server is up
app.get('/', (req, res) => {
  res.send('Hydrolab backend is running.');
});

// 🔐 Load service account credentials
const serviceAccountPath = path.join(__dirname, 'service-account.json');
const auth = new google.auth.GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

let sheets;
auth.getClient().then(authClient => {
  sheets = google.sheets({ version: 'v4', auth: authClient });
});

// ✅ POST route to receive data from frontend and write to Google Sheets
app.post('/add-entry', async (req, res) => {
  try {
    const entry = req.body.data;

    const values = [[
      entry.date,
      entry.calibrator,
      entry.unit,
      entry.ph7_start,
      entry.ph7_end,
      entry.ph4_start,
      entry.ph4_end,
      entry.cond_standard,
      entry.spcond_start,
      entry.spcond_end,
      entry.chla_start,
      entry.chla_end,
      entry.pyc_start,
      entry.pyc_end,
      entry.notes,
      new Date().toLocaleString()
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'CalibrationData!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });

    res.json({ success: true, message: 'Row added to Google Sheet.' });
  } catch (err) {
    console.error('Error appending to sheet:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
