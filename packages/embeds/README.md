# Embeds

This folder contains all the various flavours of embeds.

`core` contains the core library written in vanilla JS that manages the embed.
`snippet` contains the Vanilla JS Code Snippet that can be installed on any website and would automatically fetch the `core` library.

Please see the respective folder READMEs for details on them.

## Publishing to NPM. It will soon be automated using changesets github action

To publish the packages. Following steps should be followed. All commands are to be run at the root.

1. `yarn changeset` -> Creates changelog files and adds summary to changelog. Select embed packages only here.
2. `yarn changeset version` -> Bumps the versions as required
3. Get the PR reviewed and merged
4. `yarn publish-embed` -> Releases all packages. We can't use `yarn changeset publish` because it doesn't support workspace: prefix removal yet. See https://github.com/changesets/changesets/issues/432#issuecomment-1016365428

## Skeleton Loader

Skeleton loader is shown for supported page types. For all other page types, default non-skeleton loader is shown.
Status:
- Layout
  - [x] Responsive
  - [x] Mobile Layout
  - [x] month_view Layout
  - [ ] week_view Layout
  - [ ] column_view Layout
- Theming
  - [x] Dark and Light theme
      NOTE: _If user has preference for theme configured within app, that has to be communicated clearly in the embed too for skeleton to work_
  - [x] Change in system theme should reflect without page refresh
- Page Types supported
  - [x] user.event.booking.slots
  - [x] team.event.booking.slots
  - [x] [Partially supported] user.event.booking.form - Shows skeleton but of the slots page
  - [x] [Partially supported] team.event.booking.form - Shows skeleton but of the slots page
  - [ ] user.profile
  - [ ] team.profile


 
## How Routing Prerendering works
- Use API to prerender a booking link for "modal"
- When CTA is clicked by user, we check if there is a "prerendered"/"being prerendered" modal for this namespace.
- If yes, we open up the modal showing the skeleton loader and send the POST request to /api/router endpoint
- When we get the response from the endpoint, we pass on all the query params to the already rendered/being rendered iframe and embed-iframe updates the URL of the iframe to have the new query params through history.replaceState(i.e. without reloading the page)


## Prerendering vs Preloading
- Preloading loads the calLink in iframe with the sole purpose of preloading the static assets, so that when the embed actually opens, it uses the static assets from browser cache.
- Prerendering means continuing over the preloaded iframe, so that the user books on the prerendered iframe only. So, it is much more complex than preloading and gives much more benefits in terms of performance.
Note: API wise `prerender` delegates its task to `preload` API which then identifies whether to preload or prerender.


## Modalbox re-opening performance optimization
- ModalBox supports reusing the same cal-modal-box element and thus same iframe and thus providing a lightning fast experience when the same modal is opened multiple times [This feature is currently disabled in code because of stale booking page UI issues]

## Embed Core Architecture and Features

### Architecture Overview

#### Initialization and Bootstrap Process
The embed system initializes through a multi-step process:
1. The embed script is loaded on the parent page
2. It creates a global `Cal` object that acts as the entry point
3. The system initializes necessary custom elements (`cal-modal-box`, `cal-floating-button`, `cal-inline`)
4. A namespace-based action manager is created for event handling

#### Parent-Iframe Communication System
Communication between the parent page and the embedded iframe uses a message-based system:

```typescript
// Parent to Iframe communication example
interface InterfaceWithParent {
  ui: (config: UiConfig) => void;
  connect: (config: PrefillAndIframeAttrsConfig) => void;
}

// Event data structure
type EventData<T> = {
  type: string;
  namespace: string;
  fullType: string;
  data: EventDataMap[T];
};
```

The system uses namespaced events to ensure multiple embeds on the same page don't interfere with each other.

#### Instruction Queue System
Commands are queued before the iframe is ready:

```typescript
type Instruction = SingleInstruction | SingleInstruction[];
type InstructionQueue = Instruction[];

// Commands are queued if iframe isn't ready
if (!this.iframeReady) {
  this.iframeDoQueue.push(doInIframeArg);
  return;
}
```

### Embedding Methods

#### Inline Embedding
Embeds the calendar directly within the page flow:
```typescript
Cal.inline({
  elementOrSelector: "#my-cal-inline",
  calLink: "organization/event-type"
});
```

#### Modal Embedding
Creates a modal dialog with the calendar:
```typescript
Cal.modal({
  calLink: "organization/event-type",
  config: {
    // Optional configuration
  }
});
```

#### FloatingButton Embedding
Adds a floating action button that opens the calendar in a modal. It uses modal embedding under the hood.
```typescript
Cal.floatingButton({
  calLink: "organization/event-type",
  buttonText: "Book meeting",
  buttonPosition: "bottom-right"
});
```

### Configuration and Customization

#### Prefill System
Allows pre-filling form fields:
```typescript
Cal.inline({
  calLink: "organization/event-type",
  config: {
    name: "John Doe",
    email: "john@example.com",
    notes: "Initial discussion"
  }
});
```

#### Query Parameter Handling
The system allows automatically forwarding query params to the iframe, by setting. This code must be present right after the embed snippet is added to the page.
```js
Cal.config = Cal.config || {};
Cal.config.forwardQueryParams=true
```

### Advanced Features

#### Routing Prerendering System
The prerendering system optimizes the initial load:
```typescript
Cal.prerender({
  calLink: "organization/event-type",
  type: "modal"
});
```

Key aspects:

- Creates a hidden iframe
- Loads the booking page but doesn't send the slots availability request
- Tries to reuse whenever it makes sense and do a fresh load otherwise

Iframe Reuse and Reload Conditions. There could be three situations:

1. Reuse
2. Reuse the iframe but refetch the slots
3. Do a fresh load in iframe

- **Reuse**:
  - Modal opens when
    - Modal is not in a failed state
    - config, params are same as the last time
    - No threshold violations

- **Reuse the iframe but refetch the slots**:
  - Only embed `config` changes (handled via "connect" flow)
  - Query query params changes (handled via "connect" flow)
  - Crossed slots stale time threshold (EMBED_MODAL_IFRAME_SLOT_STALE_TIME)

- **Fresh Reload Conditions**:
  - Different path being loaded(i.e. /pro vs /free)
  - Modal is in a failed state
  - Time since last render exceeds EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS
