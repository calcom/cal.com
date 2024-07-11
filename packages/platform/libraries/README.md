# How to work with platform libraries in Dev

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

- yarn build

then go back to /apps/api/v2 and run

- yarn

- yarn dev

