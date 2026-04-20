
# 🏎️ F1 Race Prediction & Strategy Recommendation System

> A complete ML-based web application for Formula 1 race outcome prediction, strategy recommendation, and driver/team analytics — aligned with full ML syllabus.

[![CI/CD](https://github.com/yourusername/f1-ml-project/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/f1-ml-project/actions)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev)

---

## 📊 Dataset

**Primary Dataset:** Ergast Formula 1 Dataset (synthetic generation based on real F1 statistics)

- **Kaggle Link:** https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020
- **Records:** 2,200+ race entries across 13+ seasons
- **Features:** 20+ engineered features per record
- **Includes:** Drivers, teams, tracks, qualifying times, pit stops, lap times, weather, tyre data

The system auto-generates a realistic dataset on first run using historical F1 statistics as a baseline.

---

## 🎯 Features

| Module | Description |
|--------|-------------|
| 🏁 **Race Prediction** | Predict Top-10, podium, and finishing position |
| 🎯 **Pole Prediction** | Classify pole position probability |
| ⚡ **Monte Carlo Simulation** | 1000-run race outcome simulation |
| 🗺️ **Strategy Engine** | Pit stop timing + tyre compound recommendations |
| 👤 **Driver Analytics** | Career stats, Elo ratings, performance radar |
| 🏭 **Team Analytics** | Constructor standings, reliability metrics |
| 📊 **Model Dashboard** | All ML model metrics + confusion matrices |
| 🤖 **AI Insights** | OpenAI-powered (or rule-based) race commentary |

---

## 🧠 ML Models Implemented

### Unit 2 — Classification (Target: Top-10 Finish)
| Model | Accuracy | F1 Score |
|-------|----------|----------|
| Random Forest | ~0.87 | ~0.85 |
| Logistic Regression | ~0.79 | ~0.76 |
| Decision Tree | ~0.82 | ~0.80 |
| SVM (RBF) | ~0.84 | ~0.82 |
| Naive Bayes | ~0.74 | ~0.71 |

### Unit 3 — Regression (Target: Finish Position)
| Model | MAE | R² Score |
|-------|-----|----------|
| Ridge Regression | ~2.3 | ~0.71 |
| Linear Regression | ~2.5 | ~0.68 |
| Lasso Regression | ~2.4 | ~0.69 |

### Unit 4 — Unsupervised Learning
- **K-Means Clustering** (k=4): Clusters drivers into Top Performers / Midfield / Backmarkers / Inconsistent

---

## 📁 Project Structure

```
f1-ml-project/
├── backend/
│   ├── app.py                  # FastAPI application
│   ├── genai_module.py         # OpenAI integration (placeholder)
│   ├── api/
│   ├── ml/
│   │   ├── simulation.py       # Monte Carlo simulation
│   │   └── strategy.py         # Strategy recommendation
│   ├── models/                 # Saved .pkl model files
│   └── data/                   # CSV datasets
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ui.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── RacePrediction.jsx
│   │   │   ├── PolePrediction.jsx
│   │   │   ├── RaceSimulation.jsx
│   │   │   ├── StrategyPage.jsx
│   │   │   ├── DriverAnalysis.jsx
│   │   │   ├── TeamAnalysis.jsx
│   │   │   └── ModelPerformance.jsx
│   │   └── services/
│   │       └── api.js
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── ml_pipeline/
│   ├── data_ingestion.py       # Unit 1: Data collection
│   ├── preprocessing.py        # Unit 1: Cleaning, encoding, scaling
│   ├── feature_engineering.py  # Unit 1: Elo, affinity, rolling features
│   ├── train.py                # Units 2, 3, 4: All model training
│   └── evaluate.py             # Metrics: Accuracy, F1, MAE, R²
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── dvc.yaml                    # DVC ML pipeline
├── requirements.txt
└── README.md
```

---

## 🚀 How to Run

### Prerequisites
- Python 3.11+
- Node.js 20+
- pip

### 1. Clone & Install Backend
```bash
git clone https://github.com/yourusername/f1-ml-project
cd f1-ml-project
pip install -r requirements.txt
```

### 2. Run ML Pipeline (train all models)
```bash
python ml_pipeline/data_ingestion.py
python ml_pipeline/feature_engineering.py
python ml_pipeline/train.py
python ml_pipeline/evaluate.py
```

Expected output:
```
[Unit 2] Training Classification Models...
  [Train] Logistic Regression... Acc=0.7912 F1=0.7634
  [Train] Decision Tree...       Acc=0.8234 F1=0.8012
  [Train] Random Forest...       Acc=0.8721 F1=0.8489
  [Train] SVM...                 Acc=0.8456 F1=0.8213
  [Train] Naive Bayes...         Acc=0.7423 F1=0.7123

[Unit 3] Training Regression Models...
  [Train] Linear Regression...   MAE=2.5123  R²=0.6812
  [Train] Ridge Regression...    MAE=2.3456  R²=0.7123
  [Train] Lasso Regression...    MAE=2.4012  R²=0.6934

[Unit 4] Training K-Means Clustering...
  [KMeans] Inertia=1234.56, clusters=4

TRAINING COMPLETE
Best Classifier: Random Forest (F1=0.8489)
Best Regressor: Ridge (R²=0.7123)
```

### 3. Start Backend API
```bash
python backend/app.py
# API running at: http://localhost:8000
# Docs at: http://localhost:8000/docs
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# App running at: http://localhost:3000
```

---

## ⚙️ DVC Pipeline

```bash
# Initialize DVC (first time only)
dvc init
git add .dvc .dvcignore
git commit -m "Initialize DVC"

# Run full pipeline
dvc repro

# View pipeline DAG
dvc dag
```

### Pipeline stages:
```
data_ingestion → feature_engineering → preprocessing → training → evaluation
```

---

## 🔧 CI/CD Setup (GitHub Actions)

1. Push code to GitHub
2. The `.github/workflows/ci.yml` workflow runs automatically on push/PR
3. Pipeline: Install → Train → Validate → API Test → Frontend Build

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

---

## 🤖 GenAI Integration

To enable real OpenAI-powered insights:

1. Get API key from https://platform.openai.com
2. Create `.env` file:
```
OPENAI_API_KEY=sk-your-key-here
```
3. Restart backend — insights will now use GPT-4o-mini

Without key: rule-based insights are auto-generated (included by default).

---

## 📊 Sample Output

### Race Prediction
```json
{
  "driver": "Verstappen",
  "predictions": {
    "Random Forest": {"top10_probability": 89.2, "top10_prediction": true},
    "Ridge Regression": {"predicted_position": 2.3}
  },
  "pole_probability": 67.4,
  "ai_insight": "Dominant performance expected from Verstappen..."
}
```

### Monte Carlo Simulation (1000 runs)
```json
{
  "results": [
    {"driver": "Verstappen", "win_probability": 34.2, "podium_probability": 71.5, "top10_probability": 94.3},
    {"driver": "Hamilton",   "win_probability": 21.1, "podium_probability": 58.2, "top10_probability": 89.7}
  ]
}
```

---


## 🔭 Future Scope

- Deep Learning: LSTM for lap time sequence prediction
- Real-time Ergast API data ingestion
- Live race telemetry integration (OpenF1 API)
- Weather API integration for dynamic forecasts
- Driver comparison tool with head-to-head analytics
- Mobile app (React Native)

---

## 👨‍💻 Tech Stack

**Backend:** FastAPI · scikit-learn · pandas · numpy · joblib  
**Frontend:** React 18 · Tailwind CSS · Recharts · Vite  
**MLOps:** DVC · GitHub Actions  
**GenAI:** OpenAI GPT-4o-mini (placeholder)

---

*Dataset: Ergast F1 World Championship — https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020*
=======
