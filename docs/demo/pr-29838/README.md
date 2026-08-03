# PR #29838 visual demo

Inline embed skeleton after load + resize across the 768px breakpoint.

## Before (bug)
`resizeHandler` refreshed skeleton styles with `setAttribute("style", ...)`, which could wipe `display: none` from `toggleLoader(false)`. After the embed finished loading, resizing could make the skeleton visible again.

## After (fix)
Layout/resize updates preserve hidden state once loaded. Skeleton stays hidden after load when the window crosses the mobile/desktop breakpoint.
