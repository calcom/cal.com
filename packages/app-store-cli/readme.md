## Steps to create an app

- Create a folder in packages/app-store/{APP_NAME} = {APP}
- Fill it with a sample app
  - Modify {APP}/\_metadata.ts with the data provided

## Approach

- appType is derived from App Name(a slugify operation that makes a string that can be used as a director name, a variable name for imports and a URL path).
- appType is then used to create the app directory. It becomes `config.type` of config.json. config.type is the value used to create an entry in App table and retrieve any apps or credentials. It also becomes App.dirName
- dirnames that don't start with \_ are considered apps in packages/app-store and based on those apps .generated.ts\* files are created. This allows pre-cli apps to keep on working.
- app directory is populated with app-store/\_baseApp with newly updated config.json and package.json
- `packages/prisma/seed-app-store.config.json` is updated with new app.

NOTE: After app-store-cli is live, Credential.appId and Credential.type would be same for new apps. For old apps they would remain different. Credential.type would be used to identify credentials in integrations call and Credential.appId/App.slug would be used to identify apps.
If we rename all existing apps to their slug names, we can remove type and then use just appId to refer to things everywhere. This can be done later on.

## TODO

- Improvements
  - Edit command Improvements
    - Prefill fields in edit command -> It allows only that content to change which user wants to change.
    - Don't override icon.svg
  - Merge app-store:watch and app-store commands; introduce app-store --watch
  - Allow inputs in non interactive way as well - That would allow easily copy pasting commands.
  - An app created through CLI should be able to completely skip API validation for testing purposes. Credentials should be created with no API specified specific to the app. It would allow us to test any app end to end not worrying about the corresponding API endpoint.
  - Require assets path relative to app dir.

## Roadmap

- Avoid delete and edit on apps created outside of cli
- Someone can add wrong directory name(which doesn't satisfy slug requirements) manually. How to handle it.
- Allow editing and updating app from the cal app itself - including assets uploading when developing locally.
- Improvements in shared code across app
  - Use baseApp/api/add.ts for all apps with configuration of credentials creation and redirection URL.
- Delete creation side effects if App creation fails - Might make debugging difficult
  - This is so that web app doesn't break because of additional app folders or faulty db-seed
