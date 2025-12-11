#!/usr/bin/env python3
"""
Learn-to-Rank Trainer for Risk Scoring
Reads risk incidents from database, trains a logistic regression model, and saves to JSON.
"""

import os
import json
import argparse
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
OUTFILE = os.getenv("RANKER_OUT", "model_ranker.json")

if not DATABASE_URL:
    raise RuntimeError("Please set DATABASE_URL in env or .env")

engine = create_engine(DATABASE_URL, echo=False, future=True)

# SQL: fetch risk incidents with features
SQL = """
SELECT id, score, decision, reasons, price, returnsProbability, userReturnRate, brandTrustScore, anomalyFlagsCount, actionType, createdAt
FROM risk_incident
ORDER BY createdAt DESC
LIMIT :limit;
"""


def parse_reasons(reasons_json):
    # reasons is JSON array of contributions: [{key, contribution, note}, ...]
    # Return dict mapping key->contribution where present.
    out = {}
    if reasons_json is None:
        return out
    try:
        if isinstance(reasons_json, str):
            reasons = json.loads(reasons_json)
        else:
            reasons = reasons_json
        if isinstance(reasons, list):
            for c in reasons:
                k = c.get('key') or c.get('reason') or c.get('name')
                contrib = c.get('contribution') if c.get('contribution') is not None else c.get('weight')
                if k:
                    out[k] = float(contrib) if contrib is not None else 0.0
    except Exception as e:
        # ignore
        pass
    return out


def load_data(limit=5000):
    with engine.connect() as conn:
        rows = conn.execute(text(SQL), {"limit": limit}).mappings().all()
    data = []
    for r in rows:
        # fallbacks for different column namings
        price = r.get('price') or None
        returnsProbability = r.get('returnsProbability') or None
        userReturnRate = r.get('userReturnRate') or None
        brandTrustScore = r.get('brandTrustScore') or None
        anomalyFlagsCount = r.get('anomalyFlagsCount') or None
        reasons = r.get('reasons')

        # parse reasons for compensation
        parsed = parse_reasons(reasons)
        # example: if parsed contains return_risk etc.
        data.append({
            "id": r.get('id'),
            "score_js": float(r.get('score') or 0.0),
            "decision": (r.get('decision') or '').lower(),
            "price": float(price) if price is not None else np.nan,
            "returnsProb": float(returnsProbability) if returnsProbability is not None else parsed.get('return_risk', np.nan),
            "userReturnRate": float(userReturnRate) if userReturnRate is not None else parsed.get('user_history', np.nan),
            "brandTrustScore": float(brandTrustScore) if brandTrustScore is not None else parsed.get('brand_trust', np.nan),
            "anomalyFlagsCount": int(anomalyFlagsCount) if anomalyFlagsCount is not None else int(parsed.get('anomaly_flags', 0) or 0),
            "actionType": r.get('actionType') or r.get('action') or 'unknown'
        })
    df = pd.DataFrame(data)
    return df


def prepare_features(df):
    # choose feature columns
    # price scaled to dollars (was cents)
    X = pd.DataFrame()
    X['price'] = df['price'].fillna(0.0) / 100.0
    X['returnsProb'] = df['returnsProb'].fillna(0.0)
    X['userReturnRate'] = df['userReturnRate'].fillna(0.0)
    X['brandTrustScore'] = df['brandTrustScore'].fillna(0.5)
    X['anomalyFlagsCount'] = df['anomalyFlagsCount'].fillna(0).astype(float)
    # include original risk score as feature (JS score)
    X['score_js'] = df['score_js'].fillna(0.0)
    # optional: encode actionType (one-hot small)
    actions = pd.get_dummies(df['actionType'].fillna('unknown'), prefix='act')
    X = pd.concat([X, actions], axis=1)
    return X


def prepare_labels(df):
    # map decision -> label
    # allow -> 0 (safe); require_approval/deny -> 1 (risky)
    def map_label(dec):
        if not isinstance(dec, str):
            return 1
        dec = dec.lower()
        if dec == 'allow':
            return 0
        return 1
    y = df['decision'].apply(map_label).astype(int)
    return y


def train_and_export(X, y, outfile=OUTFILE):
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X.values)
    model = LogisticRegression(C=1.0, solver='lbfgs', max_iter=1000, class_weight='balanced')
    model.fit(Xs, y.values)
    coef = model.coef_.flatten().tolist()
    intercept = float(model.intercept_[0])
    means = scaler.mean_.tolist()
    stds = scaler.scale_.tolist()
    feature_names = X.columns.tolist()
    meta = {"trained_at": datetime.utcnow().isoformat(), "n_samples": int(len(y))}
    out = {
        "feature_names": feature_names,
        "means": means,
        "stds": stds,
        "coefs": coef,
        "intercept": intercept,
        "meta": meta
    }
    with open(outfile, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Saved model to {outfile}, features: {len(feature_names)}, samples: {len(y)}")
    return out


def main(args):
    df = load_data(limit=args.limit)
    if df.empty:
        raise RuntimeError("No incidents found to train on")
    X = prepare_features(df)
    y = prepare_labels(df)
    print("Samples:", len(y), "Positive (risky):", int(y.sum()))
    model = train_and_export(X, y, outfile=args.output)
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=5000, help="max incidents to read")
    parser.add_argument("--output", type=str, default=OUTFILE, help="output JSON model file")
    args = parser.parse_args()
    main(args)
