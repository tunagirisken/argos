.PHONY: install install-frontend install-all start stop dev prod run run-frontend build test test-all test-smoke lint clean plugins check-integrations release release-patch release-minor release-major

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

stop:
	@fuser -k -TERM 8000/tcp 5173/tcp 5174/tcp 2>/dev/null || true
	@sleep 1
	@fuser -k -KILL 8000/tcp 5173/tcp 5174/tcp 2>/dev/null || true
	@pkill -9 -f "uvicorn backend.main:app" 2>/dev/null || true
	@pkill -9 -f "vite.*5173" 2>/dev/null || true
	@echo "Portlar serbest: 8000, 5173, 5174"

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

test-smoke:
	cd frontend && $(NPM) run test:smoke

lint:
	$(VENV)/bin/ruff check backend 2>/dev/null || echo "ruff yok: pip install ruff"

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist

plugins:
	chmod +x scripts/setup-plugins.sh scripts/check-integrations.sh
	./scripts/setup-plugins.sh

check-integrations:
	chmod +x scripts/check-integrations.sh
	./scripts/check-integrations.sh

# Sürüm yayını: test → bump → commit → tag → push (scripts/release.sh)
release:
	chmod +x scripts/release.sh scripts/bump_version.sh
	./scripts/release.sh patch

release-patch: release

release-minor:
	chmod +x scripts/release.sh scripts/bump_version.sh
	./scripts/release.sh minor

release-major:
	chmod +x scripts/release.sh scripts/bump_version.sh
	./scripts/release.sh major
