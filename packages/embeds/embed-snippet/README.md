# embed-snippet

Vanilla JS embed snippet that is responsible to fetch @calcom/embed-core and thus show Cal Link as an embed on a page.

## Development

`yarn build` will generate dist/snippet.es.js. If you are going to test react embeds, make sure that you have built it so that they get the upto-date snippet

- which can be used as `<script type="module" src=...`
- You can also copy the appropriate portion of the code and install it directly as `<script>CODE_SUGGESTED_TO_BE_COPIED</script>`
