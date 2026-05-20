const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * With http-proxy-middleware v3 + app.use(mountPath, proxy), Express passes req.url
 * with the mount path stripped. Azure backends expect the full path (e.g. /api/accounts/generate).
 */
const restoreUpstreamPath = (mountPrefix) => (requestPath) =>
  mountPrefix + (requestPath.startsWith('/') ? requestPath : `/${requestPath}`);

module.exports = function (app) {
  // Late Payment Interest backend — must come BEFORE the general /api proxy
  app.use(
    '/api/lpi',
    createProxyMiddleware({
      target: 'https://ml-market-backend-ml-late-payment-interest.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/lpi'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-LPI] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-LPI] Error:', err.message);
      },
    })
  );

  // Sales Optimization backend — must come BEFORE the general /api proxy
  app.use(
    '/api/sales',
    createProxyMiddleware({
      target: 'https://ml-market-backend-sales-optimization.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/sales'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Sales] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Sales] Error:', err.message);
      },
    })
  );

  // Collectability backend — must come BEFORE the general /api proxy
  app.use(
    '/api/collectability',
    createProxyMiddleware({
      target: 'https://ml-market-backend-collectability.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/collectability'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Collectability] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Collectability] Error:', err.message);
      },
    })
  );

  // Claims Denial backend — must come BEFORE the general /api proxy
  app.use(
    '/api/claim-denial',
    createProxyMiddleware({
      target: 'https://ml-market-backend-propensity-to-deny.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/claim-denial'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Claim-Denial] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Claim-Denial] Error:', err.message);
      },
    })
  );

  // Customer Churn backend — must come BEFORE the general /api proxy
  app.use(
    '/api/churn',
    createProxyMiddleware({
      target: 'https://ml-market-backend-customer-churn.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/churn'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Churn] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Churn] Error:', err.message);
      },
    })
  );

  // AML backend — must come BEFORE the general /api proxy
  app.use(
    '/api/aml',
    createProxyMiddleware({
      target: 'https://ml-market-backend-aml.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/aml'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-AML] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-AML] Error:', err.message);
      },
    })
  );

  // RPC (Right Party Contact) backend — must come BEFORE the general /api proxy
  app.use(
    '/api/amex',
    createProxyMiddleware({
      target: 'https://ml-market-backend-rpc.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/amex'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-RPC] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-RPC] Error:', err.message);
      },
    })
  );

  // Utility backend — must come BEFORE the general /api proxy
  app.use(
    '/api/utilities',
    createProxyMiddleware({
      target: 'https://ml-market-backend-utility.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/utilities'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Utility] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Utility] Error:', err.message);
      },
    })
  );

  // Personal Loan EAD backend — must come BEFORE the general /api proxy
  app.use(
    '/api/ead/loans',
    createProxyMiddleware({
      target: 'https://ml-market-backend-ead-loan.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/ead/loans'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-EAD-Loan] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-EAD-Loan] Error:', err.message);
      },
    })
  );

  // Collections Scorecard backend
  app.use(
    '/api/collections/accounts',
    createProxyMiddleware({
      target: 'https://ml-market-backend-2-collections-scorecard.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/collections/accounts'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Collections-Scorecard] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Collections-Scorecard] Error:', err.message);
      },
    })
  );

  // Behavioural Scorecard backend
  app.use(
    '/api/scorecard/accounts',
    createProxyMiddleware({
      target: 'https://ml-market-backend-2-behavioural-scorecard.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/scorecard/accounts'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Behavioural-Scorecard] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Behavioural-Scorecard] Error:', err.message);
      },
    })
  );

  // Application Scorecard backend
  app.use(
    '/api/scorecard/applications',
    createProxyMiddleware({
      target: 'https://ml-market-backend-2-application-scorecard.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/scorecard/applications'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-Scorecard] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-Scorecard] Error:', err.message);
      },
    })
  );

  // Retail Loan LGD backend — must come BEFORE /api/lgd (mortgage)
  app.use(
    '/api/lgd/loans',
    createProxyMiddleware({
      target: 'https://ml-market-backend-2-lgd-loan.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/lgd/loans'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-LGD-Loan] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-LGD-Loan] Error:', err.message);
      },
    })
  );

  // LGD (Mortgage Loss Given Default) backend — must come BEFORE the general /api proxy
  app.use(
    '/api/lgd',
    createProxyMiddleware({
      target: 'https://ml-market-backend-lgd.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/lgd'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-LGD] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-LGD] Error:', err.message);
      },
    })
  );

  // PD (Borrower Default) backend — must come BEFORE the general /api proxy
  app.use(
    '/api/pd',
    createProxyMiddleware({
      target: 'https://ml-market-backend-pd.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/pd'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-PD] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-PD] Error:', err.message);
      },
    })
  );

  // Credit Card EAD backend — must come BEFORE the general /api proxy
  app.use(
    '/api/creditcard',
    createProxyMiddleware({
      target: 'https://ml-market-backend-ead.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/creditcard'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-EAD-CC] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-EAD-CC] Error:', err.message);
      },
    })
  );

  // PTP Adherence backend — must come BEFORE the general /api proxy
  app.use(
    '/api/ptp',
    createProxyMiddleware({
      target: 'https://ml-market-backend-ptp.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/ptp'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-PTP] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-PTP] Error:', err.message);
      },
    })
  );

  // EWS Personal Loan backend — must come BEFORE the general /api proxy
  app.use(
    '/api/ews',
    createProxyMiddleware({
      target: 'https://ml-market-backend-ews.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/ews'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-EWS] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-EWS] Error:', err.message);
      },
    })
  );

  // Underwriter backend — must come BEFORE the general /api proxy
  app.use(
    '/api/uw',
    createProxyMiddleware({
      target: 'https://ml-market-backend-underwriter.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/uw'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-UW] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-UW] Error:', err.message);
      },
    })
  );

  // Customer Lifecycle (generate) backend — must come BEFORE the general /api proxy
  app.use(
    '/api/customers',
    createProxyMiddleware({
      target: 'https://ml-market-backend-customer-lifecycle.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api/customers'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy-CustomerLifecycle] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy-CustomerLifecycle] Error:', err.message);
      },
    })
  );

  // Healthcare (Patient Collectability) backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://ml-market-backend-hcc.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      pathRewrite: restoreUpstreamPath('/api'),
      logLevel: 'debug',
      onProxyRes: function (proxyRes, req, res) {
        console.log('[Proxy] Response from:', req.url, 'Status:', proxyRes.statusCode);
      },
      onError: function (err, req, res) {
        console.error('[Proxy] Error:', err.message);
      },
    })
  );
};
