# embed-core

See [index.html](index.html) to understand how it can be used.

## Features

- The  Embed SDK can be added asynchronously
  - You can add it through any tag manager like GTM if you like[Need to Test]
- Available configurations are
  - `theme`
  - Prefilling of
    - `name`
    - `email`
    - `notes`
    - `guests`


## Development

Run the following command and then you can test the embed in the automatically opened page `http://localhost:3001`

```bash
yarn dev
```


## Shipping to Production

```bash
yarn build
```

Make `dist/embed.umd.js` servable on URL http://cal.com/embed.js
