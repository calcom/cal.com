## How to build an App using the CLI
Refer to https://developer.cal.com/guides/how-to-build-an-app

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
