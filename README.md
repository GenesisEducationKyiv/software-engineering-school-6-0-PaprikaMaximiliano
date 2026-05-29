## Extras implemented

- CI Pipeline: lint and test on push
- API key authentication for all `/api/*` endpoints.
- Prometheus metrics endpoint: `/metrics`.

## API authentication

Provide API key in one of the headers:

- `x-api-key: <API_KEY>`
- `Authorization: Bearer <API_KEY>`

If `API_KEY` is set and token is missing or invalid API returns `401 Unauthorized`.

If `API_KEY` is not set, `/api/*` endpoints are open.

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
