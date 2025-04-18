// auth.js for in-browser use (no import needed)
const msalConfig = {
  auth: {
    clientId: "a3500a1a-636b-4a64-9b06-63420bf0fe4c",
    authority: "https://login.microsoftonline.com/72e3dc14-d74c-4b22-a35c-d094bd2a99d0",
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
