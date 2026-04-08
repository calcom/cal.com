---
name: get-axiom-logs
description: Fetch and analyze logs from Axiom — pass an Axiom URL or a filter expression. Use this skill whenever the user asks to inspect production logs, debug a request by ID, or analyze errors from the Vercel/Axiom log stream.
---

# Get Axiom Logs

Fetch logs from Axiom and analyze them. Uses `agent-browser --auto-connect` to leverage the user's existing authenticated browser session, so no API tokens are needed.

## How it works

The script calls Axiom's `/api/v1/datasets/_apl` API endpoint through the browser's `fetch` (to reuse session cookies), avoiding the need for API tokens or DOM scraping of virtualized tables.

## Input

The user provides one of:

1. **An Axiom URL** — e.g. `https://app.axiom.co/cal-2e7u/stream/vercel?q=...`
2. **A filter expression** — e.g. `request.id == "abc123"`
3. **A raw APL query** — e.g. `['vercel'] | where message contains 'error'`

## Parsing the input

### From an Axiom URL

Extract:
- **Org ID** from the path: `app.axiom.co/<org-id>/...` → e.g. `cal-2e7u`
- **Dataset** from the path: `.../stream/<dataset>` → e.g. `vercel`
- **Filters** from the `q` query param. It is often double-URL-encoded JSON with this structure:
  ```json
  {"op":"and","field":"","children":[{"op":"==","value":"<value>","field":"<field>"}]}
  ```
  Convert each child to APL: `['<dataset>'] | where ['<field>'] == '<value>'`. The `op` may be `==`, `contains`, etc. — translate accordingly (`contains '<value>'`).

### From a filter expression

Parse `<field> == "<value>"` and use default org `cal-2e7u` and dataset `vercel`.

### From a raw APL query

Pass through directly.

## Execution

Run the bundled script from the repo root:

```bash
node agents/skills/get-axiom-logs/scripts/axiom-logs.js --org <org-id> --query '<APL query>' [--start <ISO>] [--end <ISO>]
```

Or with shorthand:

```bash
node agents/skills/get-axiom-logs/scripts/axiom-logs.js --org <org-id> --dataset <dataset> --filter <field> --value <value>
```

## Email addresses in `request.path`

When filtering for an email address inside a URL/path field (e.g. `request.path`), Vercel may store either the raw `@` or URL-encoded `%40` form depending on the client. **Always query both** with an `or`:

```
['vercel'] | where ['request.path'] contains 'user@example.com' or ['request.path'] contains 'user%40example.com'
```

## Analyzing results

After fetching logs:

1. Parse the JSON output — `rows` contains the log entries, `rowCount` the total, `axiomUrl` is the direct link to the stream view in the Axiom UI, `rawLogsPath` is where the raw JSON is saved on disk.
2. **Always show the `axiomUrl`** at the top of the analysis so the user can open it in their browser.
3. **Always show the `rawLogsPath`** so the user knows where the raw logs are saved.
4. Present a **summary** of what happened:
   - Timeline of events
   - Error levels and messages
   - Key fields: `request.path`, `request.statusCode`, `level`, `message`
   - Duration and memory usage if available (`report.durationMs`, `report.maxMemoryUsedMb`)
5. Identify the **root cause** if errors are present.
6. Highlight any **warnings** (high latency, OOM, timeouts, etc.).

## Vercel Lambda log multiplexing — important caveat

A single Vercel `request.id` can have logs from **multiple concurrent requests** mixed in. Warm Lambda instances handling concurrent invocations stamp all stdout with whichever `request.id` Vercel attached at the routing layer, but in-process `console.log`s from other concurrent requests bleed into the same stream.

**Signs the logs have been multiplexed:**
- Multiple distinct `bookingUid`s (or other entity IDs) for what should be one request
- Log lines that reference users/emails unrelated to the original request
- Trace IDs that don't match across all rows

**How to disambiguate:** look at the `trace_*` ID inside structured `distributed-trace` log messages. Logs that genuinely belong to the same request share the same trace ID. When in doubt, filter by trace ID or by the entity ID (e.g. `bookingUid`) instead of `request.id`.

## Defaults

- Default org: `cal-2e7u`
- Default dataset: `vercel`
- Default time range: last 24 hours. **Expand to several days** if the initial query returns 0 rows but the user expects results — Vercel logs are bursty and the user's report may be from outside the default window.

## Requirements

- `agent-browser` CLI installed and authenticated to Axiom in the connected browser session
- Node.js (for running the script)
