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

## Prometheus metrics

Endpoint:

- `GET /metrics`

Includes:

- Default Node.js process metrics from `prom-client`.
- `http_requests_total` counter.
- `http_request_duration_seconds` histogram.

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
