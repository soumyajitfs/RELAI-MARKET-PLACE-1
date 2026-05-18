import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    // By the time this component renders, msalReady has already resolved
    // (initialize + handleRedirectPromise completed in msalInstance.js).
    // We just need to wait for React's isAuthenticated hook to catch up.
    const account = instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (account || isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [instance, isAuthenticated, navigate]);

  return (
    <div className="login-page-wrapper">
      <div className="login-content-wrapper">
        <div className="login-title-box">
          <h1 className="login-title">Signing you in...</h1>
          <p className="login-tagline">Please wait while we complete Microsoft authentication.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
