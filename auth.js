// auth.js for in-browser use (no import needed)
const isLocalHost = window.location.hostname === "localhost";

const msalConfig = {
  auth: {
    clientId: "a3500a1a-636b-4a64-9b06-63420bf0fe4c",
    authority: "https://login.microsoftonline.com/72e3dc14-d74c-4b22-a35c-d094bd2a99d0",
    redirectUri: isLocalHost
    ? "http://localhost:5500"
    : "https://leslie-applehilltech.github.io/hydrolab-calibration/"
  },
  cache: {
    cacheLocation: "localStorage"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

async function loginAndGetToken() {
  const loginRequest = {
    scopes: ["Sites.ReadWrite.All", "Files.ReadWrite"]
  };

  let account = msalInstance.getAllAccounts()[0];

  if (!account) {
    console.log("No cached account. Triggering loginPopup...");
    const loginResponse = await msalInstance.loginPopup(loginRequest);
    account = loginResponse.account;
  }

  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account
    });
    return tokenResponse.accessToken;
  } catch (e) {
    console.warn("Silent token acquisition failed. Falling back to popup...");
    const tokenResponse = await msalInstance.acquireTokenPopup(loginRequest);
    return tokenResponse.accessToken;
  }
}

window.msalInstance = msalInstance;
if (typeof updateLoginStatus === "function") {
  updateLoginStatus();
}

