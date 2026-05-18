const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/** Same as setupProxy.js — Express strips mount path; Azure needs full /api/... path. */
const restoreUpstreamPath = (mountPrefix) => (requestPath) =>
  mountPrefix + (requestPath.startsWith('/') ? requestPath : `/${requestPath}`);

// Proxy configuration — mirrors setupProxy.js
const proxyRoutes = [
  { path: '/api/lpi', prefix: '/api/lpi', target: 'https://ml-market-backend-ml-late-payment-interest.azurewebsites.net' },
  { path: '/api/sales', prefix: '/api/sales', target: 'https://ml-market-backend-sales-optimization.azurewebsites.net' },
  { path: '/api/collectability', prefix: '/api/collectability', target: 'https://ml-market-backend-collectability.azurewebsites.net' },
  { path: '/api/claim-denial', prefix: '/api/claim-denial', target: 'https://ml-market-backend-propensity-to-deny.azurewebsites.net' },
  { path: '/api/churn', prefix: '/api/churn', target: 'https://ml-market-backend-customer-churn.azurewebsites.net' },
  { path: '/api/aml', prefix: '/api/aml', target: 'https://ml-market-backend-aml.azurewebsites.net' },
  { path: '/api/amex', prefix: '/api/amex', target: 'https://ml-market-backend-rpc.azurewebsites.net' },
  { path: '/api/utilities', prefix: '/api/utilities', target: 'https://ml-market-backend-utility.azurewebsites.net' },
  { path: '/api/uw', prefix: '/api/uw', target: 'https://ml-market-backend-underwriter.azurewebsites.net' },
  {
    path: '/api/customers',
    prefix: '/api/customers',
    target: 'https://ml-market-backend-customer-lifecycle.azurewebsites.net',
  },
  { path: '/api', prefix: '/api', target: 'https://ml-market-backend-hcc.azurewebsites.net' },
];

proxyRoutes.forEach(({ path: routePath, target, prefix }) => {
  app.use(
    routePath,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath(prefix),
    })
  );
});

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'build')));

// All other requests fall back to index.html (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
