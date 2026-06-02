# Voiding Dysfunction Risk Calculator — Prototype

## Overview

A single-page web application that predicts the probability of **prolonged voiding dysfunction** (post-void residual > 100 mL at postoperative day 7) after nerve-sparing radical hysterectomy for cervical cancer.

**Model:** 5-variable LASSO Logistic Regression (C = 0.1)

Trained on a temporal development cohort (n = 701, 2005–2014) and evaluated on a held-out temporal validation cohort (n = 319, 2015–2023). Validation AUC 0.691 (95% CI 0.627–0.753), calibration slope 1.19, Brier 0.212 (BSS = 0.07), CITL −0.396.

## Predictors (5 Variables)

| Variable | Description | Unit |
|---|---|---|
| Age | Patient age | years |
| BMI | Body mass index | kg/m² |
| Preoperative lesion size | Tumor size at preoperative evaluation | cm |
| Avg. parametrial length | Average (bilateral) parametrial resection length | cm |
| Avg. vaginal cuff length | Average (bilateral) vaginal cuff resection length — **#1 predictor** | cm |

Two predictors (parametrial length and vaginal cuff length) are intraoperative specimen measurements, so the tool functions as an **intraoperative** risk-stratification calculator.

## How to Use

1. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
2. Enter the five patient parameters.
3. Click **Calculate Risk**.
4. Review the predicted probability and risk category.

No server, installation, or internet connection required — everything runs locally in the browser.

## File Structure

```
app/
├── index.html   — Main page (single-page app)
├── style.css    — Styling (white/blue medical theme, responsive)
├── app.js       — Calculator logic (logistic regression)
└── README.md    — This file
```

## Model Coefficients

The coefficients in `app.js` are the **real trained 5-variable LASSO model**, taken from `results/lasso_five_var_coefficients.csv`:

```javascript
const MODEL = {
    intercept:        -2.0121888112275648,
    coef_age:          0.02349084272387323,
    coef_bmi:         -0.04440195565641517,
    coef_lesion_size:  0.0963160661982114,
    coef_pm_length:    0.21200370054545323,
    coef_vc_length:    0.54793935875417
};
```

Prediction: `P(voiding dysfunction) = 1 / (1 + exp(-z))`, where

```
z = intercept
  + coef_age          × age (years)
  + coef_bmi          × BMI (kg/m²)
  + coef_lesion_size  × preoperative lesion size (cm)
  + coef_pm_length    × average parametrial length (cm)
  + coef_vc_length    × average vaginal cuff length (cm)
```

The displayed equation in `index.html` is rounded to 4 decimal places for readability; the calculator uses the full-precision values above so the output reproduces the trained model. These are the **development-cohort fit** (uncalibrated). For deployment at an institution with a different baseline prevalence, recalibrate the **intercept** to the local event rate; the calibration slope (≈ 1) requires no adjustment.

To regenerate from the trained model:
- **Python (scikit-learn):** `model.intercept_[0]` and `model.coef_[0]`, then convert standardized → original scale by dividing each coefficient by the feature's training-set SD (see `src/lasso_5var_coefficients.py`).

## Disclaimer

This is a **research prototype** for academic purposes only. It has not been externally validated and must not be used as the sole basis for clinical decision-making. All patient management decisions should be made by qualified healthcare professionals based on comprehensive clinical assessment.

## Version

Prototype v0.2 — LASSO 5-variable model
