## Extras implemented

- CI Pipeline: lint and test on push
- API key authentication for all `/api/*` endpoints.
- Prometheus metrics endpoint: `/metrics`.

## Architecture

The system runs as two application services from the same codebase:

| Service | Container | Port | Role |
|---------|-----------|------|------|
| Subscription API | `app` | 3000 | Public `/api/*`, internal `/internal/scanner/*`, PostgreSQL |
| Release scanner | `release-scanner` | 3002 (health) | Polls GitHub and sends release notification emails |

The scanner has no database access. It reads scan targets and updates `lastSeenTag` through the subscription API internal endpoints, authenticated with `INTERNAL_API_KEY`.

### Start both services

```bash
docker compose up -d --build
```

Set `INTERNAL_API_KEY` in your environment (or `.env`) before starting Docker Compose.

### Run locally without Docker

Terminal 1 — subscription API:

```bash
npm run start:api
```

Terminal 2 — release scanner:

```bash
SUBSCRIPTION_API_URL=http://localhost:3000 INTERNAL_API_KEY=your-internal-key npm run start:scanner
```

## API authentication

Provide API key in one of the headers:

- `x-api-key: <API_KEY>`
- `Authorization: Bearer <API_KEY>`

If `API_KEY` is set and token is missing or invalid API returns `401 Unauthorized`.

If `API_KEY` is not set, `/api/*` endpoints are open.

## Internal scanner API authentication

The release-scanner service calls `/internal/scanner/*` on the subscription API using `INTERNAL_API_KEY` in the `x-api-key` header (or `Authorization: Bearer`).

| Variable | Service | Description |
|----------|---------|-------------|
| `INTERNAL_API_KEY` | Both | Shared secret for service-to-service calls |
| `SUBSCRIPTION_API_URL` | `release-scanner` | Base URL of the subscription API (e.g. `http://app:3000`) |

## Structured logging and ELK

The app uses Fastify's built-in Pino logger with ECS-compatible JSON output. In Docker, logs are written to stdout and shipped to Elasticsearch by Filebeat.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` (production) / `debug` (development) | Minimum log level |
| `LOG_PRETTY` | `true` locally, `false` in Docker | Pretty-print logs with `pino-pretty` instead of JSON |

### Start the full stack (app + ELK)

```bash
docker compose --profile logging up -d --build
```

Start only the ELK services (if the app is already running):

```bash
docker compose --profile logging up elasticsearch kibana filebeat -d
```

### Kibana setup

1. Open [http://localhost:5601](http://localhost:5601)
2. Create a data view: index pattern `logs-repo-release-notifier-*`, time field `@timestamp`
3. Open **Discover** to search logs — filter on `service.name: repo-release-notifier`
4. Optional visualizations: log volume over time, count by `log.level`, top `http.response.status_code`

### Verify logs in Elasticsearch

```bash
curl "http://localhost:9200/logs-repo-release-notifier-*/_search?pretty&size=5"
```

## Prometheus metrics and Grafana

The app exposes RED-style HTTP metrics (Rate, Errors, Duration) on `/metrics` using `prom-client`. Prometheus scrapes this endpoint; Grafana visualizes the metrics on a pre-built dashboard.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GRAFANA_ADMIN_PASSWORD` | `admin` | Grafana admin password (Docker monitoring profile) |

### Start the monitoring stack (app + Prometheus + Grafana)

```bash
docker compose --profile monitoring up -d --build
```

Start only monitoring services (if the app is already running):

```bash
docker compose --profile monitoring up prometheus grafana -d
```

### Grafana access

1. Open [http://localhost:3001](http://localhost:3001)
2. Log in with `admin` / your `GRAFANA_ADMIN_PASSWORD`
3. Open the **Repo Release Notifier — RED** dashboard

Prometheus UI: [http://localhost:9090](http://localhost:9090)

### Metrics exposed

- `http_requests_total` — request rate (counter)
- `http_request_errors_total` — 5xx error rate (counter)
- `http_request_duration_seconds` — request latency (histogram)
- Default Node.js process metrics from `prom-client`

## Logic

### Subscriptions

- Subscribe: validate email and repo -> get latest release tag + check if repo exists -> save subscription into DB -> send confirmation email

- Confirm subscription: check is subscription exists -> confirm if subscription is not confirmed yet

- Unsubscribe: delete subscription using deleteMany with where clause -> check if anything deleted

- List subscriptions by email(listByEmail): validate email -> get all -> map to output

### Scanner

- start(): running timeout which calls run() every intervalMs. It won't start next cycle of scanOnce() before previous is running.
- stop(): stopping timeout
- scanOnce(): In case of rate limits error (github) sets pauseUntil to time when rate limits should be refreshed. So it won't call apis if we hitted rate limits.

  Rest of logic is pretty straightforward.

  Get all repos with confirmed subscriptions -> loop over them -> get latest tag -> check if it exists -> check it is the same as lastSeenTag -> using updateMany (for idempotency) update lastSeenTag -> check if anything was updated -> send release notification to all emails that are subcribed to repo that got new release.

## Comments

There is definitely some room for improvement:

- Scanner logic need more concurrency, scanning repos sequentially is not the best option.

- setInterval logic have to be improved as well. Not a good idea to rely onto event loop in this case. I would use some cron jobs or job shedulers.
