# embed-core

See [index.html](index.html) to understand how it can be used.

## Features

- The Embed SDK can be added asynchronously
  - You can add it through any tag manager like GTM if you like[Need to Test]
- Available configurations are
  - `theme`
  - Prefilling of
    - `name`
    - `email`
    - `notes`
    - `guests`

## How to use embed on any webpage no matter what framework
See <https://docs.cal.com/integrations/embed>

## Development

Run the following command and then you can test the embed in the automatically opened page `http://localhost:3002`

```bash
yarn dev
```

## Shipping to Production

```bash
yarn build
```

Make `dist/embed.umd.js` servable on URL <http://cal.com/embed.js>

## Upcoming Improvements

- Unsupported Browsers and versions. Documenting them and gracefully handling that.
- Features Documentation
  - Inline mode doesn't cause any scroll in iframe by default. It more looks like it is part of the website.
- Accessibility and UI/UX Issues
  - Loader on ModalBox/popup
  - Popup not exactly in center. 
    - Also, Height is more initially and then it gets decreased.
  - Rounded borders are on iframe and it is scrollable which makes the rounded borders at the bottom not visible without scroll
  - Make it customizable by user.
  - If website owner links the booking page directly for an event, should the user be able to go to events-listing page using back button ?
  - ~~Close on backdrop click~~

- Bundling Related
  - ~~Minify CSS in embed.js~~

- Debuggability
  - Send log messages from iframe to parent so that all logs can exist in a single queue forming a timeline.
    - user should be able to use "on" instruction to understand what's going on in the system
  - Error Tracking for embed.js
    - Know where exactly it’s failing if it does.

- Improved Demo
  - Seeding might be done for team event so that such an example is also available readily in index.html

- Dev Experience/Ease of Installation
  - Do we need a one liner(like `window.dataLayer.push`) to inform SDK of something even if snippet is not yet on the page but would be there e.g. through GTM it would come late on the page ?
- Might be better to pass all configuration using a single base64encoded query param to booking page.
- Embed Code Generator

- UI Config Features
  - Theme switch dynamically - If user switches the theme on website, he should be able to do it on embed.
  - Text Color
    - Brand color
    - At some places Text is colored by using the color specific tailwind class. e.g. `text-gray-400` is the color of disabled date. He has 2 options, If user wants to customize that
      - He can go and override the color on the class which doesn’t make sense
      - He can identify the element and change the color by directly adding style, which might cause consistency issues if certain elements are missed.
    - Challenges
      - How would the user add on hover styles just using style attribute ?
- React Component
  - `onClick` support with preloading

## Pending Documentation

- READMEs
  - How to make a new element configurable using UI instruction ?
  - Why do we NOT want to provide completely flexible CSS customization by adding whatever CSS user wants. ?

- docs.cal.com
  - A complete document on how to use embed

- app.cal.com
  - Get Embed code for each event-type
