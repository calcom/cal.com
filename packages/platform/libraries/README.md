# How to work with platform libraries in Dev

whenever you want to change anything in platform libraries, or if you modify the code of one of the functions imported in libraries you will need to build the code again.

first thing to know is that we version this package using NPM

https://www.npmjs.com/package/@calcom/platform-libraries?activeTab=code

In order to work using the locally built platform libraries you need to:

- in packages/platform/libraries/package.json set the version to for example 1.2.3

- in apps/api/v2/package.json add to dependencies:
    "@calcom/platform-libraries-1.2.3": "npm:@calcom/platform-libraries@1.2.3"

- in api v2 code simply import using the new alias:
    import {
        getAllUserBookings as getAllUserBookings1.2.3,
    } from "@calcom/platform-libraries-1.2.3";


since the versions are matching in both package.json yarn will try to use the locally built code

now go to packages/platform/libraries and do

- yarn build:dev

then go back to /apps/api/v2 and run

- yarn

- yarn dev

# Before Merging to main
- Publish Your Version of Libraries on NPM:
	- To publish, ensure you are a contributor to the platform libraries' NPM package.
	- Authenticate yourself via the CLI using npm auth.
	- Increment the version number accordingly.
	- Run yarn publish to publish your version.
- Once it's published, change back the version in packages/platform/libraries/package.json back to 0.0.0
- Run yarn
- You should now be using the npm package instead of the locally built version
