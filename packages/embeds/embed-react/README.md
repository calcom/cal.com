# cal-react

Embed Cal Link as a React Component

To know how to use it, follow the steps at <https://developer.cal.com/embed/install-with-react>

## Development

Following command starts a hot reloading server
`yarn dev`

If you are working with embed on website, don't forget to do `yarn build` after every change.

## Running Tests

Runs tests and updates the snapshots. Right now we don't care about snapshots
`yarn embed-tests-quick --update-snapshots`
TODO

- Playwright tests.
  - Need to what these tests should be as embed-core already have tests. We probably just need to verify that embed-core API is called appropriately.
  - It would probably be better if Playwright tests exist at one place for all embeds.
- Distribution
  - It would be better DX to serve the unbuilt version with JSX, instead of built version with React.createElement calls. But because of WebPack loaders not running on node_modules automatically, it doesn't work automatically.
  - Right now if a typescript project uses the package, VSCode takes the user to .d.ts files instead of the functions definitions. How to solve it ?
