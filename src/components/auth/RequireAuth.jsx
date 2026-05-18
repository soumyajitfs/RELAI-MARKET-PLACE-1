import React, { useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../../authConfig';

const RequireAuth = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, instance } = useMsal();
  const hasAccounts = instance.getAllAccounts().length > 0;

  useEffect(() => {
    // Auto-redirect to Microsoft SSO if not authenticated and MSAL is idle
    if (!isAuthenticated && !hasAccounts && inProgress === InteractionStatus.None) {
      instance.loginRedirect(loginRequest);
    }
  }, [isAuthenticated, hasAccounts, inProgress, instance]);

  // Show nothing while MSAL is processing or user is not yet authenticated
  if (inProgress !== InteractionStatus.None || (!isAuthenticated && !hasAccounts)) {
    return null;
  }

  return children;
};

export default RequireAuth;
