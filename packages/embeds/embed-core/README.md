# embed-core

See [index.html](index.html) to see various examples

## How to use embed on any webpage no matter what framework
See <https://docs.cal.com/integrations/embed>

## Development

Run the following command and then you can test the embed in the automatically opened page `http://localhost:3002`

```bash
yarn dev
```

## Running Tests

Ensure that App is running on port 3000 already and then run following command:

```bash
yarn test-playwright
```

## Shipping to Production

```bash
yarn build
```

Make `dist/embed.umd.js` servable on URL <http://cal.com/embed.js>

## DX

- Hot reload doesn't work with CSS files in the way we use vite.

## Concepts of making Iframe behave like inline-block

- So that it can be placed anywhere on the page.To achieve that embed JS
  - keeps a tight control on width of iframe but still allowing content to take the entire width available outside the iframe.
  - increases the iframe width and height to an extent that scroll doesn't occur.

- Problems & Workarounds embed.js took
  - To allow iframe content to consider the width outside iframe, on certain actions embed JS is informed of a request in increase in width. In that case, iframe's width is temporarily set to 100% and now suddenly iframe content has the exact same space available as the parent. It re-adjusts content and then inform parent to lock the width at that. 
    - But because of the two steps, there is a temporary increase in width(to 100%) which might be noticeable, if there is a background set on body of iframe. This problem seems unsolvable at the moment.
    - So, let iframe behave like a block element, taking the entire width available to it by setting it's width to 100%. It automatically handles responsiveness well.
    - By default Iframe would be positioned in center horizontally and thus if there is some content above it positioned left, iframe wouldn't look aligned to content

## Known Bugs and Upcoming Improvements

- Unsupported Browsers and versions. Documenting them and gracefully handling that.
- Need to create a booking Shell so that common changes for embed can be applied there.

- Accessibility and UI/UX Issues
  - let user choose the loader for ModalBox
  - If website owner links the booking page directly for an event, should the user be able to go to events-listing page using back button ?
  - Let user specify both dark and light theme colors. Right now the colors specified are for light theme.
  - Embed doesn't adapt to screen size without page refresh.
    - Try opening in portrait mode and then go to landscape mode.
  - In inline mode, due to changing height of iframe, the content goes beyond the fold. Automatic scroll needs to be implemented.
  - On Availability page, when selecting date, width doesn't increase. max-width is there but because of strict width restriction with iframe, it doesn't allow it to expand.

- Branding
  - Powered by Cal.com and 'Try it for free'. Should they be shown only for FREE account.
  - Branding at the bottom has been removed for UI improvements, need to see where to add it.

- API
  - Allow loader color customization using UI command itself too.

- Automation Tests
  - Run automation tests in CI

- Bundling Related
  - Comments in CSS aren't stripped off

- Debuggability
  - Send log messages from iframe to parent so that all logs can exist in a single queue forming a timeline.
    - user should be able to use "on" instruction to understand what's going on in the system
  - Error Tracking for embed.js
    - Know where exactly it’s failing if it does.

- Color Scheme
  - Need to reduce the number of colors on booking page, so that UI configuration is simpler

- Dev Experience/Ease of Installation
  - Improved Demo
    - Seeding might be done for team event so that such an example is also available readily in index.html
  - Do we need a one liner(like `window.dataLayer.push`) to inform SDK of something even if snippet is not yet on the page but would be there e.g. through GTM it would come late on the page ?
  - Show Demo of inline-block behavior of embed.
    - width and height of iframe, both are according to the iframe content
    

- Might be better to pass all configuration using a single base64encoded query param to booking page.

- Performance Improvements
  - Custom written Tailwind CSS is sent multiple times for different custom elements.
  
- Embed Code Generator

- Release Issues
  - Compatibility Issue - When embed-iframe.js is updated in such a way that it is not compatible with embed.js, doing a release might break the embed for some time. e.g. iframeReady event let's say get's changed to something else
    - Best Case scenario - App and Website goes live at the same time. A website using embed loads the same updated and thus compatible versions of embed.js and embed-iframe.js
    - Worst case scenario - App goes live first, website PR isn't merged yet and thus a website using the embed would load updated version of embed-iframe but outdated version of embed.js possibly breaking the embed.
    - Ideal Solution: It would be to keep the libraries versioned and embed.js should instruct app within iframe to load a particular version. But if we push a security fix, it is possible that someone is still enforcing embed to load version with security issue. Need to handle this.
    - Quick Solution: Serve embed.js also from app, so that they go live together and there is only a slight chance of compatibility issues on going live. Note, that they can still occur as 2 different requests are sent at different times to fetch the libraries and deployments can go live in between,

- UI Config Features
  - Theme switch dynamically - If user switches the theme on website, he should be able to do it on embed. Add a demo for the API. Also, test system theme handling.
    - How would the user add on hover styles just using style attribute ?

- If just iframe refreshes due to some reason, embed script can't replay the applied instructions.

- React Component
  - `onClick` support with automatic preloading
- Shadow DOM is currently in open state, which probably means that any styling change on website can possibly impact loader.

## Pending Documentation

- READMEs
  - How to make a new element configurable using UI instruction ?
  - Why do we NOT want to provide completely flexible CSS customization by adding whatever CSS user wants. ?
  - Feature Documentation
    - Inline mode doesn't cause any scroll in iframe by default. It more looks like it is part of the website.
- docs.cal.com
  - A complete document on how to use embed

- app.cal.com
  - Get Embed code for each event-type
