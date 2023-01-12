## How to build an App using the CLI
Refer to https://developer.cal.com/guides/how-to-build-an-app

## TODO
- Merge app-store:watch and app-store commands; introduce app-store --watch
- An app created through CLI should be able to completely skip API validation for testing purposes. Credentials should be created with no API specified specific to the app. It would allow us to test any app end to end not worrying about the corresponding API endpoint.
- Someone can add wrong directory name(which doesn't satisfy slug requirements) manually. How to handle it.
- Allow editing and updating app from the cal app itself - including assets uploading when developing locally.
- Use AppDeclarativeHandler across all apps. Whatever isn't supported in it, support that.