/**
 * SHAP utilities for the Right Party Contact use case.
 * Builds the shapData object consumed by <ShapAnalysis />.
 */

/**
 * Display labels for SHAP feature names — matched to INPUT data column names.
 */
const RPC_FEATURE_DISPLAY = {
  RPC_Flag:                         'RPC Flag',
  StatusCode:                       'Status Code',
  Phone1ContactabilityScore_mapped: 'Contactability Score',
  HasValidNumber:                   'Has Valid Number',
  CMCity:                           'City',
  Chargeoff_AGE:                    'Charge-Off Date',
  Decile:                           'Decile',
  FICOScore_sql04:                  'FICO Score',
  LastPayPreCharge_AGE:             'Last Pay Pre-Charge',
  CallWindow_avg:                   'Call Window (avg)',
  Connect_Flag:                     'Connect Flag',
  NumPhoneNumbersDialed:            'Phone Numbers Dialed',
  ValidCalls:                       'Valid Calls',
  Clientid:                         'Client ID',
  AmexProductType:                  'Product Type',
  PhoneInService_mapped:            'Phone In-Service',
  PartyGrouping_mapped:             'Party Grouping',
  Outbound_AGE:                     'Last Outbound Call',
  DOB_AGE:                          'Date of Birth',
  InitialAmexPScore_sql04:          'Initial Amex P-Score',
  PlaceAmt:                         'Place Amount',
  Channel:                          'Channel',
  Level:                            'Level',
  AccountType:                      'Account Type',
  AmexTenure_sql04:                 'Amex Tenure',
  BestDayToCall:                    'Best Day to Call',
  SecondBestCallWindow_avg:         '2nd Best Call Window',
  Totalemailscount:                 'Total Emails',
  PageFlag:                         'Page Flag',
  PageWebFlag:                      'Page Web Flag',
  ResultCodeFlag:                   'Result Code Flag',
};

/**
 * Map SHAP feature name → account field key.
 * AGE features map to their source date fields in the input data.
 */
const RPC_FEATURE_TO_KEY = {
  RPC_Flag:                         'RPC_Flag',
  StatusCode:                       'StatusCode',
  Phone1ContactabilityScore_mapped: 'Phone1ContactabilityScore_mapped',
  HasValidNumber:                   'HasValidNumber',
  CMCity:                           'CMCity',
  Chargeoff_AGE:                    'ChargeOffDate',
  Decile:                           'Decile',
  FICOScore_sql04:                  'FICOScore_sql04',
  LastPayPreCharge_AGE:             'LastPayPreCharge_sql04',
  CallWindow_avg:                   'CallWindow_avg',
  Connect_Flag:                     'Connect_Flag',
  NumPhoneNumbersDialed:            'NumPhoneNumbersDialed',
  ValidCalls:                       'ValidCalls',
  Clientid:                         'Clientid',
  AmexProductType:                  'AmexProductType',
  PhoneInService_mapped:            'PhoneInService_mapped',
  PartyGrouping_mapped:             'PartyGrouping_mapped',
  Outbound_AGE:                     'LastOutboundCallDate',
  DOB_AGE:                          'DateOfBirth',
  InitialAmexPScore_sql04:          'InitialAmexPScore_sql04',
  PlaceAmt:                         'PlaceAmt',
  Channel:                          'Channel',
  Level:                            'Level',
  AccountType:                      'AccountType',
  AmexTenure_sql04:                 'AmexTenure_sql04',
  BestDayToCall:                    'BestDayToCall',
  SecondBestCallWindow_avg:         'SecondBestCallWindow_avg',
  Totalemailscount:                 'Totalemailscount',
  PageFlag:                         'PageFlag',
  PageWebFlag:                      'PageWebFlag',
  ResultCodeFlag:                   'ResultCodeFlag',
};

/**
 * Format a raw value for display in the SHAP chart.
 * Dates are shown as YYYY-MM-DD; numbers are rounded; everything else as-is.
 */
const formatValue = (val) => {
  if (val == null || val === '') return '—';
  // If it looks like a date string (contains 'T' or matches YYYY-MM-DD)
  if (typeof val === 'string' && (val.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(val))) {
    return val.split('T')[0]; // Show YYYY-MM-DD
  }
  if (typeof val === 'number') {
    return val % 1 === 0 ? String(val) : val.toFixed(2);
  }
  return String(val);
};

/**
 * Build the shapData object for a given RPC account.
 * Used by <ShapAnalysis />.
 *
 * @param {object} account – an account object that was returned from the predict API
 * @returns {object|null} { features[], predictedCategory, probability }
 */
export const buildRpcShapData = (account) => {
  if (!account) return null;

  const shapValues = account.shapValues;
  if (!shapValues || shapValues.length === 0) return null;

  // Build feature list from real SHAP values
  const features = shapValues.map((sv) => {
    const featureName = sv.feature;
    const displayLabel = RPC_FEATURE_DISPLAY[featureName] || featureName;
    const accountKey = RPC_FEATURE_TO_KEY[featureName];

    let displayValue = '—';
    if (accountKey && account[accountKey] != null) {
      displayValue = formatValue(account[accountKey]);
    }

    return {
      name: displayLabel,
      impact: sv.impact,
      value: displayValue,
    };
  });

  // Sort: positive (green) first (descending), then negative (red) (ascending by impact)
  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  // Determine category from Account_Priority
  const priority = account.accountPriority || '';
  let predictedCategory = 'Low';
  if (priority === 'SH') predictedCategory = 'Super High';
  else if (priority === 'H') predictedCategory = 'High';
  else if (priority === 'M') predictedCategory = 'Medium';

  // Use modelScorePercent for display consistency
  const probability = account.modelScorePercent != null
    ? account.modelScorePercent / 100
    : (account.Model_Score || 0);

  return {
    facsNumber: account.AcctID,   // ShapAnalysis uses "facsNumber" for display
    features,
    predictedCategory,
    probability,
    categoryContextLabel: 'Right Party Contact (RPC)',
    legendHighText: 'Increases probability toward High RPC',
    legendLowText: 'Increases probability toward Low RPC',
  };
};
