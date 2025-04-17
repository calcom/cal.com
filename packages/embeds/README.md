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


  ## Life cycle
  - embed.js is loaded(No event)
    - Action taken by Parent: 
      - Inline
        - cal-element is added to the DOM which contains the iframe and a loader(default/skeleton)
        - iframe is created and sets style.visibility="hidden", so that it can't be shown
        - loader is shown
      - Modal
        - Nothing happens unless it is prerender case
  
  - ModalBox CTA is clicked(No event)
    - Action taken by Parent:
      - Inline
       - cal-modal-box is added to the DOM which contains the iframe and a loader(default/skeleton)
       - .........
  - iframe webpage starts rendering(No event)
    - body tag is set to visibility: hidden, so that it doesn't show any content by default.
    - Question: Why do we need to set body.visibility to hidden? It was done earlier because iframe.visiblity was not set to hidden, but now it is done.

  - __iframeReady(an event as well)
    - Event fired when: Embed is ready to receive messages from parent(i.e. their is some code that would response to postmessages in iframe)
    - Event fired by: Iframe
    - Notes:
      - It is fired immediately after embed-iframe.ts is loaded.

  - linkReady(an event as well)
    - Event fired when: the iframe is fully ready to be used.
    - Event fired by: Iframe
    - Action taken by Parent: 
      - Changes loading/state attribute on Cal custom elements to done/loaded, which in turns removes the loader
      - Sets style.visibility="" for the iframe element, effectively resetting the visibility style to what it was before it was earlier set to "hidden"
  
  - parentKnowsIframeReady(an event as well)
    - Event fired when: Parent knows that iframe is ready to receive messages
    - Event fired by: Parent
    


## How Routing Prerendering works
- Use API to prerender a booking link for "modal"
- When CTA is clicked by user, we check if there is a "prerendered"/"being prerendered" modal for this namespace.
- If yes, we open up the modal showing the skeleton loader and send the POST request to /api/router endpoint
- When we get the response from the endpoint, we pass on all the query params to the already rendered/being rendered iframe and embed-iframe updates the URL of the iframe to have the new query params through history.replaceState(i.e. without reloading the page)


