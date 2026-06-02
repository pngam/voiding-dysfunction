/**
 * Voiding Dysfunction Risk Calculator
 * ====================================
 * Predicts probability of prolonged voiding dysfunction (PVR >100 mL at POD 7)
 * after nerve-sparing radical hysterectomy for cervical cancer.
 *
 * Model: 5-variable LASSO Logistic Regression (C=0.1)
 * Source: Temporal validation study, n=1,020 (dev=701, val=319)
 * Validation AUC: 0.691 (95% CI 0.627-0.753)
 * Calibration slope: 1.19, CITL: -0.396, Brier: 0.212 (BSS=0.07)
 *
 * Coefficients from: results/lasso_five_var_coefficients.csv
 */

// ============================================================
// MODEL COEFFICIENTS — from trained 5-variable LASSO (C=0.1)
// ============================================================
// Formula:
//   z = INTERCEPT
//     + COEF_AGE * age (years)
//     + COEF_BMI * BMI (kg/m²)
//     + COEF_LESION_SIZE * preoperative lesion size (cm)
//     + COEF_PM_LENGTH * average parametrial length (cm)
//     + COEF_VC_LENGTH * average vaginal cuff length (cm)
//
//   P(voiding dysfunction) = 1 / (1 + exp(-z))
// ============================================================

// Full-precision coefficients (from results/lasso_five_var_coefficients.csv).
// Displayed equation in index.html is rounded to 4 dp for readability; the
// calculator uses these full-precision values so output reproduces the model
// (e.g. the Table 3 / Figure 6 worked example = 48.0%, not the 47.6% that
// 3-dp rounding would give).
const MODEL = {
    intercept:        -2.0121888112275648,
    coef_age:          0.02349084272387323,   // older age -> higher risk
    coef_bmi:         -0.04440195565641517,    // higher BMI -> lower risk
    coef_lesion_size:  0.0963160661982114,     // larger preop lesion -> higher risk
    coef_pm_length:    0.21200370054545323,    // longer parametrial resection -> higher risk
    coef_vc_length:    0.54793935875417        // longer vaginal cuff resection -> higher risk (#1 predictor)
};

// Risk thresholds
const RISK_THRESHOLDS = {
    low: 0.25,       // <25% = Low
    moderate: 0.50   // 25-50% = Moderate; >50% = High
};

// ============================================================
// DOM REFERENCES
// ============================================================
const form = document.getElementById('calculatorForm');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultPanel = document.getElementById('resultPanel');
const gaugeFill = document.getElementById('gaugeFill');
const gaugeMarker = document.getElementById('gaugeMarker');
const gaugeMarkerLabel = document.getElementById('gaugeMarkerLabel');
const probabilityValue = document.getElementById('probabilityValue');
const riskBadge = document.getElementById('riskBadge');
const riskText = document.getElementById('riskText');

// Input fields
const fields = {
    age: document.getElementById('age'),
    bmi: document.getElementById('bmi'),
    lesion_size: document.getElementById('lesion_size'),
    avg_pm_length: document.getElementById('avg_pm_length'),
    avg_vc_length: document.getElementById('avg_vc_length')
};

// ============================================================
// VALIDATION
// ============================================================
const validationRules = {
    age:           { min: 18, max: 90,  label: 'Age' },
    bmi:           { min: 10, max: 60,  label: 'BMI' },
    lesion_size:   { min: 0,  max: 15,  label: 'Preoperative lesion size' },
    avg_pm_length: { min: 0,  max: 8,   label: 'Avg. parametrial length' },
    avg_vc_length: { min: 0,  max: 6,   label: 'Avg. vaginal cuff length' }
};

function validateField(name, value) {
    const rule = validationRules[name];
    if (value === '' || value === null || value === undefined || isNaN(value)) {
        return `${rule.label} is required`;
    }
    const num = parseFloat(value);
    if (num < rule.min || num > rule.max) {
        return `${rule.label} must be between ${rule.min} and ${rule.max}`;
    }
    return null;
}

function validateAll() {
    let isValid = true;
    const values = {};

    for (const [name, input] of Object.entries(fields)) {
        const value = input.value.trim();
        const error = validateField(name, value);
        const group = input.closest('.form-group');

        // Remove previous error state
        input.classList.remove('error');
        group.classList.remove('has-error');
        const existingError = group.querySelector('.error-message');
        if (existingError) existingError.remove();

        if (error) {
            isValid = false;
            input.classList.add('error');
            group.classList.add('has-error');
            const errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            errorEl.textContent = error;
            errorEl.style.display = 'block';
            input.parentElement.appendChild(errorEl);
        } else {
            values[name] = parseFloat(value);
        }
    }

    return { isValid, values };
}

// ============================================================
// PREDICTION
// ============================================================
function predict(values) {
    const logit = MODEL.intercept
        + MODEL.coef_age * values.age
        + MODEL.coef_bmi * values.bmi
        + MODEL.coef_lesion_size * values.lesion_size
        + MODEL.coef_pm_length * values.avg_pm_length
        + MODEL.coef_vc_length * values.avg_vc_length;

    const probability = 1.0 / (1.0 + Math.exp(-logit));
    return probability;
}

function classifyRisk(probability) {
    if (probability < RISK_THRESHOLDS.low) {
        return {
            category: 'low',
            label: 'Low Risk',
            text: 'The predicted risk of prolonged voiding dysfunction is below 25%. Standard postoperative voiding trial protocol may be appropriate.'
        };
    } else if (probability < RISK_THRESHOLDS.moderate) {
        return {
            category: 'moderate',
            label: 'Moderate Risk',
            text: 'The predicted risk is between 25% and 50%. Consider extended catheterization and closer follow-up of voiding function.'
        };
    } else {
        return {
            category: 'high',
            label: 'High Risk',
            text: 'The predicted risk exceeds 50%. Consider planning for prolonged catheter management, bladder training, and early rehabilitation referral.'
        };
    }
}

// ============================================================
// UI UPDATE
// ============================================================
function displayResult(probability) {
    const pct = (probability * 100).toFixed(1);
    const risk = classifyRisk(probability);

    // Update result panel classes
    resultPanel.className = 'card result-panel has-result risk-' + risk.category;

    // Update gauge
    const clampedPct = Math.min(Math.max(probability * 100, 0), 100);
    gaugeFill.style.width = clampedPct + '%';
    gaugeMarker.style.left = clampedPct + '%';
    gaugeMarkerLabel.textContent = pct + '%';

    // Update probability display
    probabilityValue.textContent = pct + '%';

    // Update risk badge
    riskBadge.textContent = risk.label;
    riskBadge.className = 'risk-badge ' + risk.category;

    // Update risk text
    riskText.textContent = risk.text;

    // Scroll result into view on mobile
    if (window.innerWidth <= 768) {
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function resetResult() {
    resultPanel.className = 'card result-panel';
    gaugeFill.style.width = '0%';
    gaugeMarker.style.left = '0%';
    gaugeMarkerLabel.textContent = '0%';
    probabilityValue.textContent = '--';
    riskBadge.textContent = '--';
    riskBadge.className = 'risk-badge';
    riskText.textContent = 'Enter patient data and click Calculate Risk';
}

// ============================================================
// EVENT HANDLERS
// ============================================================
form.addEventListener('submit', function(e) {
    e.preventDefault();

    const { isValid, values } = validateAll();
    if (!isValid) return;

    const probability = predict(values);
    displayResult(probability);
});

clearBtn.addEventListener('click', function() {
    form.reset();
    resetResult();

    // Clear all error states
    for (const input of Object.values(fields)) {
        input.classList.remove('error');
        const group = input.closest('.form-group');
        group.classList.remove('has-error');
        const existingError = group.querySelector('.error-message');
        if (existingError) existingError.remove();
    }
});

// Clear individual field errors on input
for (const [name, input] of Object.entries(fields)) {
    input.addEventListener('input', function() {
        this.classList.remove('error');
        const group = this.closest('.form-group');
        group.classList.remove('has-error');
        const existingError = group.querySelector('.error-message');
        if (existingError) existingError.remove();
    });
}

// Allow Enter key to submit from any field
for (const input of Object.values(fields)) {
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
}
