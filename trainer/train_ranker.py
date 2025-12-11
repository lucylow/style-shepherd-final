#!/usr/bin/env python3
"""
trainer/train_ranker.py
Train a learn-to-rank model using LightGBM on exported training data
Usage: python trainer/train_ranker.py
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report
import lightgbm as lgb
import joblib
import os
import sys

DATA_CSV = 'training_data.csv'
MODEL_OUT = 'models/ranker.joblib'
os.makedirs('models', exist_ok=True)

# Check if data file exists
if not os.path.exists(DATA_CSV):
    print(f'Error: {DATA_CSV} not found. Run export_training_data.js first.')
    sys.exit(1)

print(f'Loading data from {DATA_CSV}...')
df = pd.read_csv(DATA_CSV)

print(f'Loaded {len(df)} rows')
print(f'Columns: {list(df.columns)}')

# Sanity check: drop rows with NaNs or inf
df = df.replace([np.inf, -np.inf], np.nan).dropna()

print(f'After cleaning: {len(df)} rows')

if len(df) == 0:
    print('Error: No valid data rows after cleaning')
    sys.exit(1)

# Check label distribution
label_counts = df['label'].value_counts()
print(f'\nLabel distribution:')
print(f'  Positive (1): {label_counts.get(1, 0)}')
print(f'  Negative (0): {label_counts.get(0, 0)}')

if label_counts.get(1, 0) == 0:
    print('Warning: No positive labels found. Model may not learn effectively.')

# Feature columns (exclude userId, productId, label)
feature_cols = ['sim', 'sizeMatch', 'returnRisk', 'popularity', 'recencyDays', 'priceNorm']
X = df[feature_cols].astype(float)
y = df['label'].astype(int)

print(f'\nFeatures: {feature_cols}')
print(f'Feature statistics:')
print(X.describe())

# Simple train/test split
# For true learning-to-rank, you'd group by query/user and use group parameter
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f'\nTrain set: {len(X_train)} samples')
print(f'Test set: {len(X_test)} samples')

# Create LightGBM datasets
train_data = lgb.Dataset(X_train, label=y_train)
valid_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

# Model parameters
params = {
    'objective': 'binary',
    'metric': 'auc',
    'boosting_type': 'gbdt',
    'num_leaves': 31,
    'learning_rate': 0.05,
    'feature_fraction': 0.9,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'verbosity': -1,
    'seed': 42,
}

print('\nTraining model...')
model = lgb.train(
    params,
    train_data,
    num_boost_round=500,
    valid_sets=[valid_data],
    valid_names=['test'],
    early_stopping_rounds=30,
    verbose_eval=50,
)

# Evaluate
print('\nEvaluating model...')
preds = model.predict(X_test, num_iteration=model.best_iteration)
preds_binary = (preds > 0.5).astype(int)

auc = roc_auc_score(y_test, preds)
ap = average_precision_score(y_test, preds)

print(f'\n📊 Evaluation Metrics:')
print(f'  AUC-ROC: {auc:.4f}')
print(f'  Average Precision: {ap:.4f}')
print(f'\nClassification Report:')
print(classification_report(y_test, preds_binary, target_names=['No Purchase', 'Purchase']))

# Save model
joblib.dump(model, MODEL_OUT)
print(f'\n✅ Saved model to {MODEL_OUT}')

# Feature importance
fi = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importance(importance_type='gain')
}).sort_values('importance', ascending=False)

print(f'\n📈 Feature Importance (gain):')
print(fi.to_string(index=False))

print('\n✅ Training complete!')
print('\nNext steps:')
print('  1. Load the model in your recommendation service')
print('  2. Compute features for candidate products')
print('  3. Use model.predict_proba() to get ranking scores')

