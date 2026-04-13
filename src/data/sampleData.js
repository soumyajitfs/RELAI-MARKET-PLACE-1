// Sample data options and generators for Patient Collectability

export const FACS_OPTIONS = [
  '32552411', '25567104', '75630520', '84489465', '19283746',
  '56473829', '91827364', '43218765', '67834521', '12349876',
  '38472615', '74615283', '29384756', '65412738', '81726354',
  '47283916', '53917264', '68249135', '14726385', '92635174'
];

export const ZIP_OPTIONS = ['39564', '39581', '39567', '39562', '39563', '39565', '39532', '39540', '39452', '39531', '39553', '39503', '36541', '39530'];

export const FC_OPTIONS = ['MEDICARE', 'COMMERCIAL', 'SELF-PAY', 'PREFERRED', 'HEALTHCARE', 'STATE AND', 'MEDICAID', 'TRICARE', 'SINGING RI', "WORKER'S C", 'AGENCIES'];

export const PT_REP_OPTIONS = ['ACTIVE, PAPERLESS', 'PENDING, PAPER', 'CODE EXP', 'ACTIVE, PAPERLESS DECL', 'PENDING', 'ACCESS CANNOT BE DETER', 'DECLINED', 'DECLINED, PAPER'];

export const SERVICE_AREA_OPTIONS = ['LABORATORY', 'DIAGNOSTIC TESTING', 'ONCOLOGY', 'SERIES', 'EMERGENCY', 'INPATIENT ADMISSION', 'INPATIENT REHABILITATI', 'OUTPATIENT SURGERY', 'OBSERVATION SERVICES', 'INPATIENT NEWBORN', 'PRE-OPERATIVE TESTING'];

export const SERVICE_DESCR_OPTIONS = [
  'Diseases of the circulatory system',
  'Symptoms, signs, and abnormal clinical laboratory findings, not elsewhere classified',
  'Diseases of the musculoskeletal system and connective tissue',
  'Mental, Behavioral and Neurodevelopmental disorders',
  'Diseases of the genitourinary system',
  'Factors influencing health status and contact with health services',
  'Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism',
  'Diseases of the digestive system',
  'Diseases of the respiratory system',
  'Diseases of the nervous system',
  'Endocrine, nutritional and metabolic diseases',
  'Diseases of the eye and adnexa',
  'Diseases of the ear and mastoid process',
  'Diseases of the skin and subcutaneous tissue',
  'Injury, poisoning, and certain other consequences of external causes',
  'Certain conditions originating in the perinatal period',
  'Pregnancy, childbirth, and puerperium',
  'Neoplasm',
  'Certain infections and parasitic diseases',
  'Special Purposes',
  'Congenital malformations, deformations and chromosomal abnormalities'
];

export const MARITAL_MAP = { S: 'Single', M: 'Married', D: 'Divorced', W: 'Widow' };
export const MARITAL_REVERSE_MAP = { 'Single': 'S', 'Married': 'M', 'Divorced': 'D', 'Widow': 'W' };

export const SERVICE_TYPE_MAP = { HB: 'Hospital', PB: 'Physician' };
export const SERVICE_TYPE_REVERSE_MAP = { 'Hospital': 'HB', 'Physician': 'PB' };

// Utility functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

// Generate unique FACS numbers from predefined options
const generateUniqueFacsNumbers = (count) => {
  const shuffled = [...FACS_OPTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

// Sample initial balance
const sampleInitBalance = () => {
  const r = Math.random();
  if (r < 0.25) return randomInt(200, 600);
  else if (r < 0.60) return randomInt(600, 1500);
  else return randomInt(1500, 3000);
};

// Generate sample accounts
export const generateSampleAccounts = (count = 5) => {
  const facs_numbers = generateUniqueFacsNumbers(count);
  const accounts = [];
  
  const n_high = Math.floor(count / 3);
  const n_medium = Math.floor(count / 3);
  const n_low = count - n_high - n_medium;
  
  // High likelihood profiles
  for (let i = 0; i < n_high; i++) {
    accounts.push({
      facsNumber: facs_numbers[i],
      zip5: randomChoice(['39564', '39563', '39562']),
      fc: randomChoice(['COMMERCIAL', 'PREFERRED']),
      initBal: sampleInitBalance(),
      ptMs: randomChoice(['M', 'S']),
      tuScore: randomInt(780, 820),
      bnkcrdAvlble: 1,
      serviceType: randomChoice(['HB', 'PB']),
      ptRepCode: 'ACTIVE, PAPERLESS',
      serviceArea: randomChoice(['LABORATORY', 'DIAGNOSTIC TESTING']),
      serviceDescr: randomChoice(SERVICE_DESCR_OPTIONS),
      age: randomInt(35, 55),
      ageOfAccount: randomInt(30, 120)
    });
  }
  
  // Medium likelihood profiles
  for (let i = 0; i < n_medium; i++) {
    accounts.push({
      facsNumber: facs_numbers[n_high + i],
      zip5: randomChoice(['39532', '39540', '39531']),
      fc: randomChoice(['MEDICARE', 'HEALTHCARE']),
      initBal: sampleInitBalance(),
      ptMs: randomChoice(['M', 'D', 'S']),
      tuScore: randomInt(700, 760),
      bnkcrdAvlble: randomChoice([0, 1]),
      serviceType: randomChoice(['HB', 'PB']),
      ptRepCode: randomChoice(['PENDING', 'PENDING, PAPER']),
      serviceArea: randomChoice(['OUTPATIENT SURGERY', 'EMERGENCY']),
      serviceDescr: randomChoice(SERVICE_DESCR_OPTIONS),
      age: randomInt(50, 70),
      ageOfAccount: randomInt(120, 300)
    });
  }
  
  // Low likelihood profiles
  for (let i = 0; i < n_low; i++) {
    accounts.push({
      facsNumber: facs_numbers[n_high + n_medium + i],
      zip5: randomChoice(['39503', '39553']),
      fc: 'SELF-PAY',
      initBal: sampleInitBalance(),
      ptMs: randomChoice(['W', 'D']),
      tuScore: randomInt(600, 670),
      bnkcrdAvlble: 0,
      serviceType: 'HB',
      ptRepCode: randomChoice(['DECLINED', 'CODE EXP']),
      serviceArea: randomChoice(['INPATIENT ADMISSION', 'OBSERVATION SERVICES']),
      serviceDescr: randomChoice(SERVICE_DESCR_OPTIONS),
      age: randomInt(65, 80),
      ageOfAccount: randomInt(300, 800)
    });
  }
  
  return shuffle(accounts);
};

export default generateSampleAccounts;
