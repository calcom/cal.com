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

- _Step-1._ Install the snippet

    ```javascript
    (function(C, A, L) {
    let p = function(a, ar) {
      a.q.push(ar);
    };
    let d = C.document;
    C.Cal = C.Cal || function() {
      let cal = C.Cal;
      let ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        const api = function() {
          p(api, arguments);
        };
        const namespace = ar[1];
        api.q = api.q || [];
        typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar);
        return;
      }
      p(cal, ar);
    };
  })(window, "https://cal.com/embed.js", "init");
  ```

- _Step-2_. Give `init` instruction to it. It creates a queue so that even without embed.js being fetched, you can give instructions to embed.

    ```javascript
    Cal("init) // Creates default instance. Give instruction to it as Cal("instruction")
    ```

    **Optionally** if you want to install another instance of embed you can do

    ```javascript
    Cal("init", "NAME_YOUR_OTHER_INSTANCE"); // Creates a named instance. Give instructions to it as Cal.ns.NAME_YOUR_OTHER_INSTANCE("instruction")
    ```

- Step-1 and Step-2 must be followed in same order. After that you can give various instructions to embed as you like.

## Supported Instructions

Consider an instruction as a function with that name and that would be called with the given argument.

`inline` - Appends embed inline as the child of the element.

- `elementOrSelector` - Give it either a valid CSS selector or an HTMLElement instance directly

- `calLink` - Cal Link that you want to embed e.g. john. Just give the username. No need to give the full URL <https://cal.com/john>. It makes it easy to configure the calendar host once and use as many links you want with just usernames

`ui` - Configure UI for embed. Make it look part of your webpage.

- `styles` - It supports styling for `body` and `eventTypeListItem`. Right now we support just background on these two.

`preload` - If you want to open cal link on some action. Make it pop open instantly by preloading it.

- `calLink` - Cal Link that you want to embed e.g. john. Just give the username. No need to give the full URL <https://cal.com/john>

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

- Accessibility and UI/UX Issues
  - Loader on ModalBox/popup
  - If website owner links the booking page directly for an event, should the user be able to go to events-listing page using back button ?

- Bundling Related
  - Minify CSS in embed.js

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
