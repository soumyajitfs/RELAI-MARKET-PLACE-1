import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { msalConfig } from './authConfig';

export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
    const account = event.payload?.account;
    if (account) {
      msalInstance.setActiveAccount(account);
    }
  }
});

// Initialize → handle redirect → set account, all BEFORE React renders
export const msalReady = msalInstance.initialize().then(() => {
  return msalInstance.handleRedirectPromise();
}).then((response) => {
  if (response?.account) {
    msalInstance.setActiveAccount(response.account);

    // Redirect completed — navigate to dashboard BEFORE React mounts.
    // This prevents any login page flash caused by React state lag.
    if (window.location.pathname.includes('/auth/callback')) {
      window.location.replace('/dashboard');
      // Return a never-resolving promise so React doesn't mount on the stale URL
      return new Promise(() => {});
    }
  } else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
      msalInstance.setActiveAccount(accounts[0]);
    }
  }
});
