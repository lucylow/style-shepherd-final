#!/usr/bin/env python3
"""
Fraud Model Trainer
Trains a fraud detection model from historical fraud_incident data
"""

import os
import json
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

DATABASE_URL = os.getenv('DATABASE_URL')
OUT = os.getenv('FRAUD_MODEL_OUT', 'model_fraud.json')
JOBLIB_OUT = os.getenv('FRAUD_MODEL_JOBLIB', 'model_fraud.json.joblib')
LIMIT = int(os.getenv('TRAIN_LIMIT', '10000'))

if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL environment variable is required')

print(f'Connecting to database...')
engine = create_engine(DATABASE_URL, future=True)

print(f'Loading fraud incidents (limit: {LIMIT})...')
sql = """
SELECT 
    id, score, model_score, rule_scores, rules_fired, decision, 
    amount, currency, user_ip, user_email, created_at
FROM fraud_incidents
ORDER BY created_at DESC 
LIMIT :limit
"""

try:
    with engine.connect() as conn:
        result = conn.execute(text(sql), {'limit': LIMIT})
        rows = result.mappings().all()
except Exception as e:
    print(f'Error querying database: {e}')
    sys.exit(1)

if not rows:
    raise RuntimeError('No fraud incidents found in database. Need historical data to train model.')

print(f'Found {len(rows)} incidents')

# Build DataFrame
data = []
for r in rows:
    rule_scores = r.get('rule_scores') or {}
    if isinstance(rule_scores, str):
        try:
            rule_scores = json.loads(rule_scores)
        except:
            rule_scores = {}
    
    # Flatten rule_scores into numeric features
    rs = {}
    for k, v in rule_scores.items():
        if isinstance(v, dict) and 'score' in v:
            rs[k + '_score'] = float(v['score'])
        elif isinstance(v, (int, float)):
            rs[k + '_score'] = float(v)
    
    data.append({
        'id': r['id'],
        'amount': float((r.get('amount') or 0)) / 100.0,
        'heuristic_score': float(r.get('score') or 0),
        'model_score': float(r.get('model_score') or 0) if r.get('model_score') else 0.0,
        'decision': r.get('decision') or 'allow',
        **rs
    })

df = pd.DataFrame(data)

# Label: decision -> risky (1) if deny/manual_review else 0
df['label'] = df['decision'].apply(lambda d: 1 if d in ('deny', 'manual_review') else 0)

print(f'Label distribution:')
print(df['label'].value_counts())

# Feature selection
feature_cols = [c for c in df.columns if c not in ('id', 'decision', 'label')]
print(f'Using {len(feature_cols)} features: {feature_cols}')

X = df[feature_cols].fillna(0)
y = df['label']

# Check if we have enough positive samples
if y.sum() < 10:
    print('⚠️  Warning: Very few positive samples. Model may not be reliable.')
    print('   Consider collecting more fraud incidents before training.')

# Scale features
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    Xs, y, test_size=0.2, random_state=42, stratify=y if y.sum() > 0 else None
)

# Train model
print('Training RandomForest classifier...')
clf = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    random_state=42,
    class_weight='balanced' if y.sum() > 0 else None
)
clf.fit(X_train, y_train)

# Evaluate
train_acc = clf.score(X_train, y_train)
test_acc = clf.score(X_test, y_test)

print(f'\nModel Performance:')
print(f'  Train Accuracy: {train_acc:.3f}')
print(f'  Test Accuracy: {test_acc:.3f}')

# Feature importance
importances = clf.feature_importances_
feature_importance = sorted(
    zip(feature_cols, importances),
    key=lambda x: x[1],
    reverse=True
)
print(f'\nTop 10 Most Important Features:')
for feat, imp in feature_importance[:10]:
    print(f'  {feat}: {imp:.3f}')

# Save model (joblib for Python service)
model_data = {
    'clf': clf,
    'scaler': scaler,
    'feature_cols': feature_cols,
    'trained_at': datetime.utcnow().isoformat(),
    'test_acc': float(test_acc),
    'n_samples': int(len(df)),
    'n_positive': int(y.sum()),
}
joblib.dump(model_data, JOBLIB_OUT)
print(f'\n✅ Saved model to {JOBLIB_OUT}')

# Also save metadata JSON (for Node.js simple model loader if needed)
meta = {
    'feature_cols': feature_cols,
    'trained_at': datetime.utcnow().isoformat(),
    'test_acc': float(test_acc),
    'n_samples': int(len(df)),
    'n_positive': int(y.sum()),
    'feature_importance': {feat: float(imp) for feat, imp in feature_importance},
}
with open(OUT, 'w') as f:
    json.dump(meta, f, indent=2)
print(f'✅ Saved metadata to {OUT}')

print('\n🎉 Training complete!')
print(f'\nTo use the model:')
print(f'  1. Set FRAUD_MODEL_PATH={OUT} in your environment')
print(f'  2. For Python service, use {JOBLIB_OUT}')
print(f'  3. Retrain periodically as you collect more data')
