import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppContext } from '../../context/AppContext';
import Toast from '../common/Toast';

const MainLayout = ({ children }) => {
  const { state } = useAppContext();
  const { sidebarOpen } = state;
  const location = useLocation();

  /* Scroll position lives on .main-content (not window); reset to top on navigation */
  useEffect(() => {
    const main = document.querySelector('.main-content');
    if (main) {
      main.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Hide sidebar on inner pages (any route other than dashboard/landing)
  const isLandingPage = location.pathname === '/' || location.pathname === '/dashboard';
  return (
    <div className="app-container">
      <Header />
      {isLandingPage && <Sidebar />}
      <main className={`main-content ${isLandingPage && !sidebarOpen ? 'sidebar-collapsed' : ''} ${!isLandingPage ? 'no-sidebar' : ''}`}>
        {children}
      </main>
      <Toast />
    </div>
  );
};

export default MainLayout;
