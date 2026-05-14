import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { verticals } from '../../data/marketplaceCards';

const Sidebar = () => {
  const { state, actions } = useAppContext();
  const { selectedVertical, sidebarOpen } = state;
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogout = async () => {
    const account = instance.getActiveAccount();
    const username = account?.username || '';

    // Clear all MSAL tokens and accounts from localStorage
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('msal.') || k.includes('login.windows'));
    keysToRemove.forEach(k => localStorage.removeItem(k));
    try { await instance.clearCache(); } catch (_) { /* ignore */ }

    // Construct Azure AD logout URL manually with logout_hint to skip account picker
    const tenantId = 'a7fdc8c0-f597-4c07-9e01-344a32000d20';
    const postLogoutUri = encodeURIComponent(`${window.location.origin}/login`);
    const logoutHint = encodeURIComponent(username);
    window.location.replace(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?logout_hint=${logoutHint}&post_logout_redirect_uri=${postLogoutUri}`
    );
  };

  return (
    <>
      {/* Toggle button - always visible */}
      <button 
        className={`sidebar-toggle-fixed ${!sidebarOpen ? 'sidebar-closed' : ''}`}
        onClick={actions.toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <i className={`bi ${sidebarOpen ? 'bi-chevron-double-left' : 'bi-chevron-double-right'}`}></i>
      </button>
      
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>

      {/* Header Section */}
      <div className="sidebar-header">
        <img 
          src="/Firstsource-logo.png" 
          alt="Firstsource Logo" 
          className="sidebar-logo"
        />
        <h2 className="sidebar-title">Kairos Dashboard</h2>
        <p className="sidebar-subtitle">AI Marketplace Navigator</p>
      </div>

      {/* Navigation Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <h6>Business Verticals</h6>
        </div>
        
        <nav className="sidebar-nav">
          {verticals.map((vertical) => (
            <button
              key={vertical}
              className={`sidebar-btn ${selectedVertical === vertical ? 'active' : ''}`}
              onClick={() => actions.setVertical(vertical)}
            >
              {vertical}
            </button>
          ))}
        </nav>
      </div>

      {isAuthenticated && (
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
    </>
  );
};

export default Sidebar;
