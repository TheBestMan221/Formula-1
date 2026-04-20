# Makefile — F1 ML Project Task Runner
# Usage: make <target>
# Requires: Python 3.11+, Node.js 20+

.PHONY: all install data features preprocess train evaluate register pipeline \
        serve frontend test lint clean docker-build docker-up docker-down \
        dvc-init dvc-run dvc-metrics format help

PYTHON      := python3
PIP         := pip3
NODE        := npm
BACKEND_DIR := backend
FRONTEND_DIR:= frontend
VENV        := .venv

# ─────────────────────────────────────────────────────────────────────────────
# DEFAULT
# ─────────────────────────────────────────────────────────────────────────────
all: help

help:
	@echo ""
	@echo "  ╔══════════════════════════════════════════╗"
	@echo "  ║     F1 ML PREDICTION SYSTEM — MAKE      ║"
	@echo "  ╚══════════════════════════════════════════╝"
	@echo ""
	@echo "  SETUP"
	@echo "    make install        Install all Python + Node dependencies"
	@echo "    make venv           Create Python virtual environment"
	@echo ""
	@echo "  ML PIPELINE"
	@echo "    make data           Run data ingestion"
	@echo "    make features       Run feature engineering"
	@echo "    make preprocess     Run preprocessing"
	@echo "    make train          Train all ML models"
	@echo "    make evaluate       Evaluate all models"
	@echo "    make register       Register models in model registry"
	@echo "    make pipeline       Run full ML pipeline end-to-end"
	@echo ""
	@echo "  MLOPS"
	@echo "    make dvc-init       Initialise DVC"
	@echo "    make dvc-run        Run DVC pipeline (dvc repro)"
	@echo "    make dvc-metrics    Show DVC metrics"
	@echo ""
	@echo "  SERVERS"
	@echo "    make serve          Start FastAPI backend (port 8000)"
	@echo "    make frontend       Start React frontend (port 3000)"
	@echo ""
	@echo "  QUALITY"
	@echo "    make test           Run all tests"
	@echo "    make lint           Run flake8 linter"
	@echo "    make format         Run black formatter"
	@echo ""
	@echo "  DOCKER"
	@echo "    make docker-build   Build Docker images"
	@echo "    make docker-up      Start with Docker Compose"
	@echo "    make docker-down    Stop Docker Compose"
	@echo ""
	@echo "    make clean          Remove all generated files"
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────────────────────────────────────
venv:
	$(PYTHON) -m venv $(VENV)
	@echo "Activate with: source $(VENV)/bin/activate"

install:
	$(PIP) install -r requirements.txt
	@echo "✅ Python dependencies installed"

install-dev: install
	$(PIP) install pytest pytest-cov black flake8 httpx
	@echo "✅ Dev dependencies installed"

install-frontend:
	cd $(FRONTEND_DIR) && $(NODE) install
	@echo "✅ Frontend dependencies installed"

install-all: install install-frontend

# ─────────────────────────────────────────────────────────────────────────────
# ML PIPELINE STAGES
# ─────────────────────────────────────────────────────────────────────────────
data:
	@echo "▶ Stage 1: Data Ingestion..."
	$(PYTHON) ml_pipeline/data_ingestion.py
	@echo "✅ Data ingestion complete"

features: data
	@echo "▶ Stage 2: Feature Engineering..."
	$(PYTHON) ml_pipeline/feature_engineering.py
	@echo "✅ Feature engineering complete"

preprocess: features
	@echo "▶ Stage 3: Preprocessing..."
	$(PYTHON) ml_pipeline/preprocessing.py
	@echo "✅ Preprocessing complete"

train: preprocess
	@echo "▶ Stage 4: Training All Models..."
	$(PYTHON) ml_pipeline/train.py
	@echo "✅ Training complete"

evaluate: train
	@echo "▶ Stage 5: Evaluation..."
	$(PYTHON) ml_pipeline/evaluate.py
	@echo "✅ Evaluation complete"

register: evaluate
	@echo "▶ Stage 6: Model Registry..."
	$(PYTHON) mlops/model_registry/register_models.py
	@echo "✅ Models registered"

pipeline:
	@echo ""
	@echo "  Running full ML pipeline..."
	@echo ""
	$(MAKE) data
	$(MAKE) features
	$(MAKE) preprocess
	$(MAKE) train
	$(MAKE) evaluate
	$(MAKE) register
	@echo ""
	@echo "  ✅ Full pipeline complete!"
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
# MLOPS — DVC
# ─────────────────────────────────────────────────────────────────────────────
dvc-init:
	dvc init
	git add .dvc .dvcignore
	@echo "✅ DVC initialized"

dvc-run:
	dvc repro
	@echo "✅ DVC pipeline complete"

dvc-metrics:
	dvc metrics show
	dvc params diff

dvc-dag:
	dvc dag

# ─────────────────────────────────────────────────────────────────────────────
# SERVERS
# ─────────────────────────────────────────────────────────────────────────────
serve:
	@echo "▶ Starting FastAPI backend on http://localhost:8000"
	$(PYTHON) backend/app.py

serve-reload:
	uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload

frontend:
	@echo "▶ Starting React frontend on http://localhost:3000"
	cd $(FRONTEND_DIR) && $(NODE) run dev

# ─────────────────────────────────────────────────────────────────────────────
# QUALITY
# ─────────────────────────────────────────────────────────────────────────────
test:
	$(PYTHON) -m pytest backend/tests/ ml_pipeline/ -v --tb=short

test-cov:
	$(PYTHON) -m pytest backend/tests/ -v --cov=backend --cov-report=html

lint:
	flake8 ml_pipeline/ backend/ mlops/ --max-line-length=120 --ignore=E501,W503,E402

format:
	black ml_pipeline/ backend/ mlops/ --line-length=120

# ─────────────────────────────────────────────────────────────────────────────
# DOCKER
# ─────────────────────────────────────────────────────────────────────────────
docker-build:
	docker build -t f1-ml-backend:latest -f mlops/docker/Dockerfile.backend .
	docker build -t f1-ml-frontend:latest -f mlops/docker/Dockerfile.frontend .

docker-up:
	docker-compose -f mlops/docker/docker-compose.yml up -d
	@echo "✅ Services started"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:8000"

docker-down:
	docker-compose -f mlops/docker/docker-compose.yml down

# ─────────────────────────────────────────────────────────────────────────────
# CLEAN
# ─────────────────────────────────────────────────────────────────────────────
clean-data:
	rm -f backend/data/*.csv

clean-models:
	rm -f backend/models/*.pkl backend/models/*.json

clean-frontend:
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist

clean-cache:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete

clean: clean-cache
	@echo "✅ Cache cleaned"

clean-all: clean clean-data clean-models clean-frontend
	@echo "✅ Full clean done"
