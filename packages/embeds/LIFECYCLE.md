# Cal.com Embed Lifecycle Events

This document details the lifecycle events and states of Cal.com embeds, showing the interaction flow between the parent page and the iframe.

## Embed Handshake (Core Communication)

The handshake is the foundational communication protocol that establishes a bi-directional channel between the parent page and the iframe. All other embed functionality depends on this handshake being completed successfully.

See [embed-handshake.mermaid](./embed-handshake.mermaid) for the detailed handshake sequence.
See [embed-message-protocol.mermaid](./embed-message-protocol.mermaid) for the message passing architecture.

### Handshake Summary

1. **Parent creates iframe** (hidden) with embed parameters
2. **Iframe fires `__iframeReady`** via postMessage when ready to receive commands
3. **Parent acknowledges** by sending `parentKnowsIframeReady` back to iframe
4. **Iframe makes body visible** and fires `linkReady` (or `linkPrerendered`)
5. **Parent flushes queued commands** that were called before handshake completed

### Message Format

All messages use the `originator: "CAL"` identifier to distinguish Cal.com embed messages:

```javascript
// Parent → Iframe (Commands)
{ originator: "CAL", method: "ui", arg: { theme: "dark" } }

// Iframe → Parent (Events)
{ originator: "CAL", type: "__iframeReady", data: { isPrerendering: false } }
```

## Inline Embed Lifecycle

Inline embeds are created immediately when `Cal.inline()` is called. They have a simpler lifecycle without prerendering support.

See [inline-embed-lifecycle.mermaid](./inline-embed-lifecycle.mermaid) for the complete sequence diagram.

## Modal Embed Lifecycle

Modal embeds are created when a CTA is clicked or `Cal.modal()` is called. They support reuse, state management, and prerendering.

See [modal-embed-lifecycle.mermaid](./modal-embed-lifecycle.mermaid) for the complete sequence diagram.

## Modal Prerendering Flow

Prerendering allows loading the booking page in the background before the user opens the modal, enabling instant display when the CTA is clicked.

See [modal-prerendering-flow.mermaid](./modal-prerendering-flow.mermaid) for the complete sequence diagram.

## Visibility Flow

The embed system carefully manages visibility to prevent visual glitches:

1. **Initial Creation**: Both iframe and body start hidden while the page loads
2. **After Communication Established**: iframe becomes visible once it's ready to communicate
3. **After Content Ready**: Loader is removed and iframe is fully visible
4. **After Parent Acknowledges**: Body content becomes visible, background stays transparent

## Event Details

1. **Initial Load**
   - embed.js loads in parent page
   - For inline embeds: Creates elements immediately
   - For modal embeds: Waits for CTA click (unless prerendering)

2. **iframe Creation**
   - iframe is created hidden
   - Loader is shown to the user
   - Embed system initializes

3. **__iframeReady Event**
   - Fired by: Iframe
   - Indicates: Embed is ready to receive messages from parent
   - Actions: Makes iframe visible (unless prerendering) and processes any queued commands

4. **__dimensionChanged Event**
   - Fired by: Iframe
   - Purpose: Keeps iframe size matched to content
   - Triggers: When content size changes or page finishes loading
   - Note: Parent adjusts iframe dimensions to prevent scrollbars

5. **__windowLoadComplete Event**
   - Fired by: Iframe
   - Indicates: Page has fully loaded
   - Purpose: Signals that dimension calculations are reliable

6. **linkReady Event**
   - Fired by: Iframe
   - Indicates: iframe content is fully ready for user interaction
   - Requirements: Content height is known, and for booker pages, slots are loaded (if skeleton loader is used)
   - Actions: Parent removes loader and makes iframe visible

7. **parentKnowsIframeReady Event**
   - Fired by: Parent
   - Indicates: Parent acknowledges that iframe is ready
   - Actions: Makes body content visible
   - Note: During prerendering, this triggers linkPrerendered event instead

8. **__connectInitiated Event**
   - Fired by: Iframe
   - Indicates: Prerendered embed is being connected with new configuration
   - Triggers: When connect() is called to activate a prerendered embed

9. **__connectCompleted Event**
   - Fired by: Iframe
   - Indicates: Connect flow has finished updating the embed
   - Triggers: After URL params are updated and slots are ready (if needed)

10. **linkPrerendered Event**
    - Fired by: Iframe
    - Indicates: Prerendered embed is ready in the background
    - Note: Embed stays hidden until user opens it via connect()

11. **bookerViewed Event**
    - Fired by: Iframe
    - Indicates: Booker has been viewed for the first time in current page view
    - Triggers: On first linkReady event (viewId === 1)
    - Note: Not fired during prerendering. Includes event information and slots loading status.

12. **bookerReopened Event**
    - Fired by: Iframe
    - Indicates: Booker has been reopened after modal was closed
    - Triggers: On subsequent linkReady events (viewId > 1) when modal is reopened without reload
    - Note: Distinguishes between first view (bookerViewed) and reopen (bookerReopened). Uses viewId to determine if it's a reopen.

13. **bookerReloaded Event**
    - Fired by: Iframe
    - Indicates: Booker has been reloaded (full page reload within modal)
    - Triggers: On linkReady after fullReload action is taken (when reloadInitiated flag is set)
    - Note: Distinguishes between first view (bookerViewed), reopen (bookerReopened), and reload (bookerReloaded). Fires only once per reload.

14. **bookerReady Event**
    - Fired by: Iframe
    - Indicates: Booker view is loaded and slots are fully ready for user interaction
    - Triggers: When booker view is loaded and slots are successfully loaded
    - Note: Only fires for booker pages (not booking success view or other non-booker pages). This is different from linkReady which fires for any embed page. The bookerReady event signals that users can now select a slot.

## Prerendering Flow

Prerendering loads the booking page in the background before the user needs it:

1. **Prerender Phase**:
   - Embed is loaded with `prerender=true` parameter
   - Only essential events are allowed (communication and sizing)
   - Embed stays hidden from the user
   - No tracking events are fired

2. **Connect Phase** (when user opens the modal):
   - Parent calls `connect()` with user's configuration
   - URL parameters are updated to match user's input
   - Slots may be refreshed if needed
   - Embed becomes visible and ready for interaction
   - Full event tracking is enabled

## Command Queue System

The embed system queues commands sent before the iframe is ready. Once the iframe is ready, all queued commands are processed in order, and new commands execute immediately.

### How Command Queuing Works

```
┌──────────────────────────────────────────────────────────────┐
│                     doInIframe(cmd)                          │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │   iframeReady?      │
                └─────────┬───────────┘
                          │
           ┌──────────────┼──────────────┐
           │ No           │              │ Yes
           ▼              │              ▼
   ┌───────────────┐      │      ┌───────────────┐
   │ Push to queue │      │      │ postMessage   │
   │ (iframeDoQueue)│     │      │ to iframe     │
   └───────────────┘      │      └───────────────┘
                          │
                          │ On __iframeReady event:
                          ▼
                ┌─────────────────────┐
                │ Flush queue:        │
                │ forEach → postMessage│
                │ Clear queue         │
                └─────────────────────┘
```

### Available Commands (Parent → Iframe)

| Method | Purpose | Example |
|--------|---------|---------|
| `ui` | Apply styles, theme, branding | `{ method: "ui", arg: { theme: "dark" } }` |
| `parentKnowsIframeReady` | Acknowledge handshake | `{ method: "parentKnowsIframeReady" }` |
| `connect` | Activate prerendered embed | `{ method: "connect", arg: { config, params } }` |

## Popup Window Analogy

Think of the embed like `window.open("url", "cal-booker")` with a hypothetical enhancement - when you close the popup, it stays in the background ready to spring back:

- **`bookerViewed`** = Opening a new popup window (first time, or after previous was destroyed due to staleness)
- **`bookerReopened`** = Clicking CTA that targets the same window name, bringing back the hidden popup
- **`bookerReloaded`** = Popup window navigating to a new URL (full page reload within the same popup)
- **Staleness/full reload** = When the popup was actually destroyed (not just hidden), so CTA opens a fresh one

This mental model helps understand the lifecycle:
1. User clicks CTA → Embed modal opens → `bookerViewed` event (similar to opening a new popup)
2. User closes modal and clicks CTA again (short time) → Existing embed springs back → `bookerReopened` event (similar to focusing a hidden popup)
3. User clicks CTA after long time → Embed was destroyed due to staleness → Fresh load → `bookerViewed` event (similar to opening a new popup after the old one was closed)
4. Modal stays open but iframe content reloads (fullReload) → `bookerReloaded` event (similar to popup navigating to new URL)

## Event Tracking System

The embed system tracks user interactions and page views:

- **Page View Tracking**: Distinguishes between first view and refocus events when users navigate within the embed
- **Booker View Events**: Fires when the booker is viewed for the first time or focused
- **Availability Events**: Tracks when slots/availability data is loaded or refreshed
- **Event Deduplication**: Prevents duplicate events for the same page view
- **Prerendering**: Tracking events are suppressed during prerendering phase

## Error Handling

Page Load Errors:
   - System monitors CalComPageStatus
   - On non-200 status: fires linkFailed event
   - Includes error code and URL information