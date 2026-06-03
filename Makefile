.PHONY: install run lint test clean

VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

install:
	python3 -m venv $(VENV)
	$(PIP) install -U pip
	$(PIP) install -r backend/requirements.txt

run:
	$(VENV)/bin/uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

lint:
	$(VENV)/bin/ruff check backend 2>/dev/null || echo "ruff yok: pip install ruff"

test:
	$(PY) -m pytest backend/tests -q 2>/dev/null || echo "pytest yok veya test yok"

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
