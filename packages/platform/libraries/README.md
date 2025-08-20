# How to work with platform libraries in Dev

We version this package using NPM:
https://www.npmjs.com/package/@calcom/platform-libraries?activeTab=code

Here is the workflow:
1. If you change platform libraries for the first time, then run `yarn local` to build them locally for the first time. This will also make v2 api point to the local libraries.
2. If you change them for the second time, then run `yarn build:dev` to re-build them.
3. Once you are happy with platform libraries:
- run `yarn publish-npm` - it will check "@calcom/platform-libraries" version in npm and update it's package.json to the next version and then it will publish the package to npm, update the version of "@calcom/platform-libraries" in the api v2 package.json, reset "@calcom/platform-libraries" to 0.0.0 and run yarn install.

# Before Merging to main

- Publish Your Version of Libraries on NPM:
  - To publish, ensure you are a contributor to the platform libraries' NPM package.
  - Authenticate yourself via the CLI using npm auth.
  - Increment the version number accordingly.
  - Run yarn publish to publish your version.
- Once it's published, change back the version in packages/platform/libraries/package.json back to 0.0.0
- Run yarn
- You should now be using the npm package instead of the locally built version

# When to publish new version of platform libraries
- New exports in the index.js of platform libraries
- Code change in the functions already exported
- Prisma schema change breaking implementation of functions in the currently used releases of platform libraries