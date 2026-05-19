import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/Layout/MainLayout';
import RequireAuth from './components/auth/RequireAuth';
import LandingPage from './pages/LandingPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import PatientCollectabilityPage from './pages/PatientCollectabilityPage';
import UtilityPropensityPage from './pages/UtilityPropensityPage';
import RpcPage from './pages/RpcPage';
import AmlAlertPage from './pages/AmlAlertPage';
import CustomerChurnPage from './pages/CustomerChurnPage';
import CollectabilityPage from './pages/CollectabilityPage';
import SalesOptimizationPage from './pages/SalesOptimizationPage';
import LatePaymentInterestPage from './pages/LatePaymentInterestPage';
import UnderDevelopmentPage from './pages/UnderDevelopmentPage';
import ClaimsDenialPage from './pages/ClaimsDenialPage';
import MortgageUnderwritingPage from './pages/MortgageUnderwritingPage';
import CustomerLifecycleAnalyticsPage from './pages/CustomerLifecycleAnalyticsPage';
import EwsPersonalLoanPage from './pages/EwsPersonalLoanPage';
import PtpAdherencePage from './pages/PtpAdherencePage';
import BorrowerDefaultPredictionPage from './pages/BorrowerDefaultPredictionPage';
import CreditCardEadPredictionPage from './pages/CreditCardEadPredictionPage';
import MortgageLgdPredictionPage from './pages/MortgageLgdPredictionPage';
import PersonalLoanEadPredictionPage from './pages/PersonalLoanEadPredictionPage';
import RetailLoanLgdPredictionPage from './pages/RetailLoanLgdPredictionPage';
import ApplicationScorecardPredictionPage from './pages/ApplicationScorecardPredictionPage';
import CollectionsScorecardPredictionPage from './pages/CollectionsScorecardPredictionPage';

// Import styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/global.css';

function App() {
  const withLayout = (page) => (
    <RequireAuth>
      <MainLayout>{page}</MainLayout>
    </RequireAuth>
  );

  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route path="/" element={withLayout(<LandingPage />)} />
          <Route path="/dashboard" element={withLayout(<LandingPage />)} />
          <Route path="/patient-collectability" element={withLayout(<PatientCollectabilityPage />)} />
          <Route path="/utility-propensity" element={withLayout(<UtilityPropensityPage />)} />
          <Route path="/rpc-contact" element={withLayout(<RpcPage />)} />
          <Route path="/aml-alert" element={withLayout(<AmlAlertPage />)} />
          <Route path="/customer-churn" element={withLayout(<CustomerChurnPage />)} />
          <Route path="/collectability-model" element={withLayout(<CollectabilityPage />)} />
          <Route path="/claims-denial" element={withLayout(<ClaimsDenialPage />)} />
          <Route path="/sales-optimization" element={withLayout(<SalesOptimizationPage />)} />
          <Route path="/late-payment-interest" element={withLayout(<LatePaymentInterestPage />)} />
          <Route path="/mortgage-underwriting" element={withLayout(<MortgageUnderwritingPage />)} />
          <Route path="/ews-personal-loan" element={withLayout(<EwsPersonalLoanPage />)} />
          <Route path="/ptp-adherence" element={withLayout(<PtpAdherencePage />)} />
          <Route path="/borrower-default-prediction" element={withLayout(<BorrowerDefaultPredictionPage />)} />
          <Route path="/credit-card-ead-prediction" element={withLayout(<CreditCardEadPredictionPage />)} />
          <Route path="/mortgage-lgd-prediction" element={withLayout(<MortgageLgdPredictionPage />)} />
          <Route path="/personal-loan-ead-prediction" element={withLayout(<PersonalLoanEadPredictionPage />)} />
          <Route path="/retail-loan-lgd-prediction" element={withLayout(<RetailLoanLgdPredictionPage />)} />
          <Route
            path="/application-scorecard-prediction"
            element={withLayout(<ApplicationScorecardPredictionPage />)}
          />
          <Route
            path="/collections-scorecard-prediction"
            element={withLayout(<CollectionsScorecardPredictionPage />)}
          />
          <Route
            path="/customer-lifecycle-analytics"
            element={withLayout(<CustomerLifecycleAnalyticsPage />)}
          />
          <Route path="/under-development/:cardTitle?" element={withLayout(<UnderDevelopmentPage />)} />

          <Route path="*" element={withLayout(<LandingPage />)} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
