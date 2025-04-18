// auth.js for in-browser use (no import needed)
const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID",
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: window.location.origin
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

  const account = msalInstance.getAllAccounts()[0];

  if (account) {
    try {
      const tokenResponse = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account
      });
      return tokenResponse.accessToken;
    } catch (e) {
      console.warn("Silent token failed, falling back to popup", e);
    }
  }

  const loginResponse = await msalInstance.loginPopup(loginRequest);
  const tokenResponse = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: loginResponse.account
  });
  return tokenResponse.accessToken;
}
