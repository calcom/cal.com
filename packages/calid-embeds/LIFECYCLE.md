# Cal ID Embed Lifecycle

## States

| State | Description |
|-------|-------------|
| `NOT_INITIALIZED` | iframe just created |
| `INITIALIZED` | after `__iframeReady` fires |
| `prerenderState` | `null` → `"inProgress"` → `"completed"` |

## Basic Flow

1. **embed.js loads** → creates iframe (hidden) + shows loader
2. **iframe renders** → fires `__iframeReady` → parent makes iframe visible
3. **dimensions sync** → `__dimensionChanged` fires → parent resizes iframe
4. **fully ready** → `linkReady` fires → loader removed, iframe shown
5. **parent confirms** → `parentKnowsIframeReady` fires → body becomes visible

## Key Events

- `__iframeReady` — iframe can now receive messages; queued commands flush
- `__dimensionChanged` — iframe content size changed; parent adjusts height
- `linkReady` — embed fully ready; parent removes loader
- `parentKnowsIframeReady` — parent acknowledged; body visibility enabled
- `__routeChanged` — internal navigation occurred
- `linkFailed` — page returned non-200; includes error code + URL

## Prerender Mode

Set `prerender=true` in the URL to load the iframe before the user opens it.

1. iframe loads silently in background (`prerenderState: "inProgress"`)
2. Only `__iframeReady` and `__dimensionChanged` are processed
3. Call `connect()` with config → `prerenderState: "completed"` → normal flow resumes

## Command Queue

Commands sent before `__iframeReady` are queued and replayed in order once the iframe is ready.

## Visibility Rules

- iframe starts as `visibility: hidden`
- body starts as `visibility: hidden`
- iframe becomes visible after `__iframeReady` (skipped during prerender)
- body becomes visible after `parentKnowsIframeReady`
- background always stays transparent