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

## How to use embed on any webpage no matter what framework.

- _Step-1._ Install the snippet

  ```javascript
  (function (C, A, L) {
    let d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () {
            api.q.push(arguments);
          };
          const namespace = arguments[1];
          api.q = api.q || [];
          namespace ? (cal.ns[namespace] = api) : null;
          return;
        }
        cal.q.push(ar);
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

Make `dist/embed.umd.js` servable on URL http://cal.com/embed.js
