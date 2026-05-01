COMPOSE=docker compose -p eye-fe
COMPOSE_FILE=deploy/compose.yaml

.PHONY: up down stop logs clean deps lint typecheck check

up:
	@echo "Starting Docker Compose (default profile)..."
	$(COMPOSE) -f $(COMPOSE_FILE) --profile default up --build -d --remove-orphans

stop:
	@echo "Stopping services..."
	$(COMPOSE) -f $(COMPOSE_FILE) --profile default stop

down: stop
	$(COMPOSE) -f $(COMPOSE_FILE) down --remove-orphans

clean: down
	@echo "Cleaning up Docker Compose..."
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans

logs:
	@echo "Following logs for eye-fe-dev..."
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f eye-fe-dev

# Reinstall dependencies inside container (use after package.json changes)
deps:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm ci

# Run ESLint inside dev container (uses container's node_modules)
lint:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm run lint

# TypeScript type check
typecheck:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm run typecheck

# Full pre-commit check: typecheck + lint + build
check:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm run check
