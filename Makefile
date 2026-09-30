COMPOSE=docker compose -p eye-fe
COMPOSE_FILE=deploy/compose.yaml

.PHONY: up down stop logs clean deps lint typecheck test check

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

# Rebuild the dev image after package.json changes. node_modules is an
# anonymous volume seeded from the image, so `npm ci` inside a `run --rm`
# container installs into a volume that is thrown away with it — the next run
# sees the image's old dependencies again.
deps:
	$(COMPOSE) -f $(COMPOSE_FILE) build eye-fe-dev

# Run ESLint inside dev container (uses container's node_modules)
lint:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm run lint

# TypeScript type check
typecheck:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm run typecheck

# Unit, component and route smoke tests (vitest, jsdom)
test:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm test

# Full pre-commit check: typecheck + lint + test + build
check:
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm eye-fe-dev npm run check
