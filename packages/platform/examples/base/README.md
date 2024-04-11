# Atoms examples
Example apps using atoms - customizable UI components to integrate scheduling into your product.

## Set up your sandbox

1. Open your browser at "https://app.cal.dev" and login with admin username `admin@example.com` and password `ADMINadmin2022!`.
2. In the web app navigate to `https://app.cal.dev/settings/platform/new` and create a platform. When asked for phone verification code enter `111111`.
3. In the web app navigate to `http://app.cal.dev/settings/platform/oauth-clients` and create a new oAuth client - give all permissions and set redirect uri to `http://localhost:4321` which points to example app.
4. Start the example app by running `yarn dev` and go to `http://localhost:4321`.
5. You can now use and customise the Cal.com Atoms

## Running examples apps locally

1. `yarn` in `packages/platform/atoms`
2. `yarn` in  `packages/platform/atoms/examples/base`
3. `yarn dev` in `packages/platform/atoms/examples/base`
