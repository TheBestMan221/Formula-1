#!/usr/bin/env bash
# run.sh — One-command startup for the F1 ML Project
# Usage: bash run.sh

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   F1 ML PREDICTION SYSTEM — STARTUP     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Python deps ─────────────────────────────
echo "▶ Installing Python dependencies..."
pip install -r requirements.txt --quiet

# ── 2. ML Pipeline ─────────────────────────────
echo ""
echo "▶ Running ML Pipeline..."
echo "  [1/4] Data Ingestion..."
python ml_pipeline/data_ingestion.py

echo "  [2/4] Feature Engineering..."
python ml_pipeline/feature_engineering.py

echo "  [3/4] Training all models (Units 2, 3, 4)..."
python ml_pipeline/train.py

echo "  [4/4] Evaluating models..."
python ml_pipeline/evaluate.py

echo ""
echo "✅ ML Pipeline complete. Models saved to backend/models/"
echo ""

# ── 3. Backend ─────────────────────────────────
echo "▶ Starting FastAPI backend on http://localhost:8000 ..."
python backend/app.py &
BACKEND_PID=$!

sleep 3
if curl -sf http://localhost:8000/health > /dev/null; then
    echo "✅ Backend online!"
else
    echo "⚠️  Backend may still be starting..."
fi

# ── 4. Frontend ────────────────────────────────
echo ""
echo "▶ Installing frontend dependencies..."
cd frontend
npm install --silent

echo "▶ Starting React frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  🏎️  F1 PREDICTION SYSTEM IS RUNNING     ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Frontend:  http://localhost:3000        ║"
echo "║  Backend:   http://localhost:8000        ║"
echo "║  API Docs:  http://localhost:8000/docs   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services."

# Keep alive
wait $BACKEND_PID $FRONTEND_PID
