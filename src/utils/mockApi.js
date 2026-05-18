// Mock API for prediction model
// Replicates the exact postprocessing logic from postprocess_data.py

// ─── 1. Predict: simulate model's predict_proba() returning raw probability (0–1) ───
const calculateRawPrediction = (account) => {
  // Build a log-odds score from account features, then convert to probability
  let logOdds = -3.5; // baseline (centers predictions around ~3%)

  // TU Score: higher = more likely to pay
  logOdds += (account.tuScore - 700) / 200;

  // Bankcard availability
  logOdds += account.bnkcrdAvlble === 1 ? 0.4 : -0.3;

  // Account age: newer accounts more likely to pay
  logOdds -= (account.ageOfAccount - 150) / 400;

  // Financial class
  if (account.fc === 'COMMERCIAL' || account.fc === 'PREFERRED') logOdds += 0.6;
  if (account.fc === 'SELF-PAY') logOdds -= 0.8;
  if (account.fc === 'MEDICARE' || account.fc === 'MEDICAID') logOdds += 0.15;

  // Billing status
  if (account.ptRepCode.includes('ACTIVE')) logOdds += 0.5;
  if (account.ptRepCode.includes('DECLINED')) logOdds -= 0.6;

  // Patient age
  if (account.age < 40) logOdds += 0.2;
  if (account.age > 65) logOdds -= 0.15;

  // Marital status
  if (account.ptMs === 'M') logOdds += 0.15;
  if (account.ptMs === 'W') logOdds -= 0.1;

  // Initial balance: higher balance slightly negative
  logOdds -= (account.initBal - 1000) / 5000;

  // Small random noise for realistic variation
  logOdds += (Math.random() - 0.5) * 0.4;

  // Sigmoid → raw probability (0 to 1)
  const probability = 1 / (1 + Math.exp(-logOdds));
  return probability;
};

// ─── 2. Category: exact thresholds from postprocess_data.py lines 85–93 ───
const assignCategory = (rawPrediction) => {
  if (rawPrediction >= 0.085767) return 'High';
  if (rawPrediction >= 0.031018) return 'Medium';
  return 'Low';
};

// ─── 3. Amount Predicted: min(prediction × initBal, initBal) — lines 100–102 ───
const calculateAmountPredicted = (rawPrediction, initBal) => {
  const amount = Math.round(rawPrediction * initBal);
  return Math.min(amount, initBal);
};

// ─── 4. Priority: assign_priority() — lines 30–51 ───
// Within each category, split Amount Predicted range into thirds → H1/H2/H3 etc.
const PRIORITY_LABELS = {
  High:   ['H1', 'H2', 'H3'],
  Medium: ['M1', 'M2', 'M3'],
  Low:    ['L1', 'L2', 'L3'],
};

const assignPriorities = (results) => {
  const categories = ['High', 'Medium', 'Low'];

  categories.forEach(category => {
    const labels = PRIORITY_LABELS[category];
    const subset = results.filter(r => r.category === category);
    if (subset.length === 0) return;

    const amounts = subset.map(r => r.amountPredicted);
    const minVal = Math.min(...amounts);
    const maxVal = Math.max(...amounts);

    // Thresholds at 66% and 33% of the min-max range
    const t1 = minVal + (maxVal - minVal) * 0.66;
    const t2 = minVal + (maxVal - minVal) * 0.33;

    results.forEach(r => {
      if (r.category !== category) return;
      if (r.amountPredicted >= t1) {
        r.priority = labels[0]; // H1 / M1 / L1
      } else if (r.amountPredicted >= t2) {
        r.priority = labels[1]; // H2 / M2 / L2
      } else {
        r.priority = labels[2]; // H3 / M3 / L3
      }
    });
  });

  return results;
};

// ─── 5. Sorting: Category (High > Medium > Low), Priority, Amount desc — lines 190–193 ───
const CATEGORY_SORT_ORDER = { High: 1, Medium: 2, Low: 3 };
const PRIORITY_SORT_ORDER = {
  H1: 1, H2: 2, H3: 3,
  M1: 1, M2: 2, M3: 3,
  L1: 1, L2: 2, L3: 3,
};

const sortResults = (results) => {
  results.sort((a, b) => {
    // 1. Category order
    const catDiff = CATEGORY_SORT_ORDER[a.category] - CATEGORY_SORT_ORDER[b.category];
    if (catDiff !== 0) return catDiff;

    // 2. Priority order within category
    const priDiff = (PRIORITY_SORT_ORDER[a.priority] || 0) - (PRIORITY_SORT_ORDER[b.priority] || 0);
    if (priDiff !== 0) return priDiff;

    // 3. Amount Predicted descending
    return b.amountPredicted - a.amountPredicted;
  });
  return results;
};

// ─── Run prediction model (simulated API call) ───
export const runPredictionModel = async (accounts) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Step 1: Score each account
      let results = accounts.map(account => {
        const rawPrediction = calculateRawPrediction(account);
        const category = assignCategory(rawPrediction);
        const amountPredicted = calculateAmountPredicted(rawPrediction, account.initBal);
        // Propensity % = raw prediction × 100, rounded to 2 decimals
        const predictedPropensity = parseFloat((rawPrediction * 100).toFixed(2));

        return {
          ...account,
          predictedPropensity,
          category,
          amountPredicted,
        };
      });

      // Step 2: Assign priority (H1-H3, M1-M3, L1-L3) based on Amount Predicted tiers
      results = assignPriorities(results);

      // Step 3: Sort by Category → Priority → Amount Predicted desc
      results = sortResults(results);

      resolve(results);
    }, 1500);
  });
};

const mockApi = {
  runPredictionModel
};

export default mockApi;
