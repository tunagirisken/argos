.PHONY: install install-frontend install-all start dev prod run run-frontend build test test-all lint clean

VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
NPM := $(shell command -v npm 2>/dev/null || echo "$(CURDIR)/.tools/node/bin/npm")

install:
	python3 -m venv $(VENV)
	$(PIP) install -U pip
	$(PIP) install -r backend/requirements.txt

install-frontend:
	cd frontend && $(NPM) install

install-all: install install-frontend

start:
	@chmod +x scripts/start.sh scripts/test.sh
	./scripts/start.sh

dev: start

prod:
	@chmod +x scripts/start.sh
	./scripts/start.sh prod

run:
	$(VENV)/bin/uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && $(NPM) run dev

build:
	cd frontend && $(NPM) run build

test:
	$(PY) -m pytest backend/tests -q

test-all:
	./scripts/test.sh

lint:
	$(VENV)/bin/ruff check backend 2>/dev/null || echo "ruff yok: pip install ruff"

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist
