#!/bin/bash
set -e

echo "═══════════════════════════════════════"
echo "  F1 ML Backend Container Starting"
echo "═══════════════════════════════════════"

# Run pipeline if models don't exist
if [ ! -f /app/backend/models/cls_random_forest.pkl ]; then
    echo "▶ No models found — running ML pipeline..."
    cd /app
    python ml_pipeline/data_ingestion.py
    python ml_pipeline/feature_engineering.py
    python ml_pipeline/train.py
    python mlops/model_registry/register_models.py
    echo "✅ Pipeline complete"
else
    echo "✅ Models already present — skipping training"
fi

echo "▶ Starting FastAPI server..."
exec uvicorn backend.app:app --host 0.0.0.0 --port 8000 --workers 2 --log-level info
