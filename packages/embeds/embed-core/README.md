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


## How to test

Create embed.es.js in `dist`
```bash
yarn build
```

```bash
npx http-server .
```
