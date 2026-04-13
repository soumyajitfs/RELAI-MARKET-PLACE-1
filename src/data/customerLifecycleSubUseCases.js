const customerLifecycleSubUseCases = [
  {
    id: 'customer-acquisition',
    title: 'Customer Acquisition',
    description:
      'Identify and acquire customers who are more likely to stay and generate long-term value.',
    problemType: 'Classification',
    algorithm: 'CatBoost',
    trainingSize: 800,
    outputMode: 'tiers',
    generateKey: 'customer_acquisition'
  },
  {
    id: 'customer-collection',
    title: 'Customer Collection',
    description:
      'Identify customers at risk of payment issues so we can take early action to improve collections.',
    problemType: 'Classification',
    algorithm: 'Logistic Regression',
    trainingSize: 800,
    outputMode: 'tiers',
    generateKey: 'customer_collection'
  },
  {
    id: 'customer-lifetime-value',
    title: 'Customer Lifetime Value',
    description:
      'Estimate the future value of each customer to prioritize high-value relationships.',
    problemType: 'Regression',
    algorithm: 'Linear Regression',
    trainingSize: 800,
    outputMode: 'predictedValue',
    generateKey: 'customer_value'
  },
  {
    id: 'customer-retention',
    title: 'Customer Retention',
    description:
      'Identify customers who may become inactive so we can take steps to retain them.',
    problemType: 'Classification',
    algorithm: 'Random Forest Classifier',
    trainingSize: 800,
    outputMode: 'tiers',
    generateKey: 'customer_retention'
  },
  {
    id: 'customer-win-back',
    title: 'Customer Win-back',
    description:
      'Identify customers who are likely to churn so we can proactively re-engage and bring them back.',
    problemType: 'Classification',
    algorithm: 'Logistic Regression',
    trainingSize: 800,
    outputMode: 'tiers',
    generateKey: 'customer_winback'
  }
];

export default customerLifecycleSubUseCases;
