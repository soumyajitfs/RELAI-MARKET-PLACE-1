const marketplaceCards = [
  {
    id: 'patient-collectability',
    title: 'Patient Collectability',
    description: 'Predicts patients likely to repay, enabling optimized debt collection strategies.',
    vertical: 'Provider',
    modelType: 'Classification',
    enabled: true,
    route: '/patient-collectability'
  },
  {
    id: 'claims-denial',
    title: 'Claims Denial Prediction',
    description: 'Predict claims that are likely to be denied by Healthcare payers.',
    vertical: 'Provider',
    modelType: 'Classification',
    enabled: true,
    route: '/claims-denial'
  },
  {
    id: 'collectability-model',
    title: 'Payer Collectability',
    description: 'Classifies healthcare claims by collectibility to prioritize high-value claims and improve collections efficiency.',
    vertical: 'Provider',
    modelType: 'Classification',
    enabled: true,
    route: '/collectability-model'
  },
  {
    id: 'right-party-contact',
    title: 'Right Party contact',
    description: 'Identifies high RPC likelihood accounts for targeted collections outreach.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/rpc-contact'
  },
  {
    id: 'complaints-forecasting',
    title: 'Customer complaints forecasting',
    description: 'Forecasting complaints volume based on multiple sources of historical data.',
    vertical: 'BFS',
    modelType: 'Forecasting',
    enabled: false
  },
  {
    id: 'sales-optimization',
    title: 'Sales Optimization',
    description: 'Improve sales by identifying high-potential accounts, boosting engagement, and recommending prioritized products',
    vertical: 'Telecom',
    modelType: 'Classification',
    enabled: true,
    route: '/sales-optimization'
  },
  {
    id: 'aml-alert',
    title: 'AML – Alert Prioritization',
    description: 'Predicts which telecom customers are likely to churn using usage patterns.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/aml-alert'
  },
  {
    id: 'customer-churn',
    title: 'Customer churn prediction',
    description: 'Predict which subscribers are likely to churn before they leave.',
    vertical: 'Telecom',
    modelType: 'Classification',
    enabled: true,
    route: '/customer-churn'
  },
  {
    id: 'sentiment-analytics',
    title: 'Customer sentiment analytics',
    description: 'Analyzing sentiment, toxicity and emotion from customer interactions.',
    vertical: 'Telecom',
    modelType: 'Classification',
    enabled: false
  },
  {
    id: 'propensity-pay',
    title: 'Customer Propensity to pay',
    description: 'Predicts customers likely to repay, enabling optimized debt collection.',
    vertical: 'Utilities',
    modelType: 'Classification',
    enabled: true,
    route: '/utility-propensity'
  },
  {
    id: 'lifecycle-analytics',
    title: 'Customer Lifecycle analytics',
    description: 'Analytics across acquisition, servicing, retention and collections.',
    vertical: 'Media',
    modelType: 'Clustering',
    enabled: true,
    route: '/customer-lifecycle-analytics'
  },
  {
    id: 'document-fraud',
    title: 'Document Fraud detection',
    description: 'Detects student enrollment document tampering using PDF residual data.',
    vertical: 'EdTech',
    modelType: 'Computer Vision',
    enabled: false
  },
  {
    id: 'claims-late-payment',
    title: 'Late payment interest predictive model',
    description: 'Scores claims on Day 1 and classifies them into High, Medium, or Low risk for late interest penalties, helping operations prioritize inventory',
    vertical: 'Payer',
    modelType: 'Classification',
    enabled: true,
    route: '/late-payment-interest'
  },
  {
    id: 'mortgage-underwriting',
    title: 'Mortgage Underwriting Decision Model',
    description: 'Predicts underwriting decisions using financial and risk data, with confidence scores to support consistent, risk-aware decision-making.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/mortgage-underwriting'
  },
  {
    id: 'ews-personal-loan-risk-scorer',
    title: 'EWS Personal Loan Risk Scorer',
    description:
      'Identifies currently-performing personal loan borrowers at risk of missing payments within the next 6 months.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/ews-personal-loan'
  },
  {
    id: 'ptp-adherence-score',
    title: 'PTP Adherence Score',
    description:
      'Predicts the likelihood of borrowers honoring their Promise to Pay to maximise collections recovery.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/ptp-adherence'
  },
  {
    id: 'borrower-default-prediction',
    title: 'Basel Probability of Default Model',
    description:
      'Predicts the likelihood of a borrower defaulting on payments using behavioral and financial indicators.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/borrower-default-prediction'
  },
  {
    id: 'credit-card-ead-prediction',
    title: 'Basel Exposure at Default for Credit Cards',
    description: 'Predicts the expected credit card exposure at the time of default.',
    vertical: 'BFS',
    modelType: 'Forecasting',
    enabled: true,
    route: '/credit-card-ead-prediction'
  },
  {
    id: 'mortgage-lgd-prediction',
    title: 'Basel Loss Given Default (LGD) for Mortgages',
    description:
      'Predicts the expected loss percentage on mortgage loans after borrower default.',
    vertical: 'BFS',
    modelType: 'Forecasting',
    enabled: true,
    route: '/mortgage-lgd-prediction',
  },
  {
    id: 'personal-loan-ead-prediction',
    title: 'Basel Exposure at Default for Personal Loans',
    description:
      'Predicts the expected exposure amount on personal loans at the time of borrower default.',
    vertical: 'BFS',
    modelType: 'Forecasting',
    enabled: true,
    route: '/personal-loan-ead-prediction',
  },
  {
    id: 'retail-loan-lgd-prediction',
    title: 'Basel Loss Given Default (LGD) for Retail Loans',
    description:
      'Predicts the expected loss percentage on retail loans after borrower default, considering recovery rates, collateral and downturn economic conditions.',
    vertical: 'BFS',
    modelType: 'Forecasting',
    enabled: true,
    route: '/retail-loan-lgd-prediction',
  },
  {
    id: 'application-scorecard',
    title: 'Application Scorecard',
    description:
      'Predicts the likelihood of a personal loan applicant defaulting at the onboarding stage.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/application-scorecard-prediction',
  },
  {
    id: 'collections-scorecard',
    title: 'Collections Scorecard',
    description:
      'Predicts the probability of delinquent personal loan accounts entering collections risk using payment history, overdue behavior, and recovery-related customer indicators.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/collections-scorecard-prediction',
  },
  {
    id: 'behavioural-scorecard',
    title: 'Behavioural Scorecard',
    description:
      'Predicts the likelihood of existing personal loan customers becoming 90+ DPD within the next 12 months using repayment behavior, delinquency trends, and customer performance indicators.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/behavioural-scorecard-prediction',
  },
  {
    id: 'roll-rate-prediction-score',
    title: 'Roll Rate Prediction Score',
    description:
      'Predicts the likelihood of a delinquent borrower rolling into a deeper DPD bucket to enable proactive intervention and minimise portfolio deterioration.',
    vertical: 'BFS',
    modelType: 'Classification',
    enabled: true,
    route: '/roll-rate-prediction-score',
  },
];

export const verticals = ['Home', 'Provider', 'BFS', 'Payer', 'Utilities', 'Telecom', 'EdTech', 'Media'];

export const modelTypes = ['All Models', 'Classification', 'Clustering', 'Computer Vision', 'Forecasting'];

export default marketplaceCards;
