## Steps to create an app

- Create a folder in packages/app-store/{APP_NAME} = {APP}
- Fill it with a sample app
  - Modify {APP}/_metadata.ts with the data provided

## Approach

- appType is derived from App Name(a slugify operation that makes a string that can be used as a director name, a variable name for imports and a URL path).
- appType is then used to create the app directory. It becomes `config.type` of config.json. config.type is the value used to create an entry in App table and retrieve any apps or credentials. It also becomes App.dirName
- dirnames that don't start with _ are considered apps in packages/app-store and based on those apps .generated.ts* files are created. This allows pre-cli apps to keep on working.
- app directory is populated with app-store/_baseApp with newly updated config.json and package.json
- `packages/prisma/seed-app-store.config.json` is updated with new app.

NOTE: After app-store-cli is live, Credential.appId and Credential.type would be same for new apps. For old apps they would remain different. Credential.type would be used to identify credentials in integrations call and Credential.appId/App.slug would be used to identify apps.
If we rename all existing apps to their slug names, we can remove type and then use just appId to refer to things everywhere. This can be done later on.

## TODO

- Beta Release
  - Print slug after creation of app. Also, mention that it would be same as dir name
  - Handle legacy apps which have dirname as something else and type as something else. type is used to do lookups with key
  - Add comment in config.json that this file shouldn't be modified manually.
  - Install button not coming
  - Put lowercase and - restriction only on slug. Keep App Name and others unchanged. Also, use slug instead of appName for dirNames
    - Add space restriction as well for Appname. Maybe look for valid dirname or slug regex
  - Get strong confirmation for deletion of app. Get the name of the app from user that he wants to delete
  - App Description Missing
  - Select Box for App Type
    - App types Validations
  - Credentials table doesn't get new entries with cli. Figure out how to do it.
  - Using app/config.json -> Allow Editing App Details.
    - Edit App Type, Description, Title, Publisher Name, Email - Name shouldn't be allowed to change as that is unique.
  
- Improvements
  - Merge app-store:watch and app-store commands, introduce app-store --watch
  - Allow inputs in non interactive way as well - That would allow easily copy pasting commands.
  - Maybe get dx to run app-store:watch
  - App already exists check. Ask user to run edit/regenerate command
  - An app created through CLI should be able to completely skip API validation for testing purposes. Credentials should be created with no API specified specific to the app. It would allow us to test any app end to end not worrying about the corresponding API endpoint.

### Why we shouldn't have appType

- App can have multiple types and thus categories is more suitable for this.
- The reason we seem to be using appType is to refer to an app uniquely but we already have app slug for that.

## Roadmap

- Allow editing and updating app from the cal app itself - including assets uploading when developing locally.
- Improvements in shared code across app
  - Use baseApp/api/add.ts for all apps with configuration of credentials creation and redirection URL.
- Delete creation side effects if App creation fails - Might make debugging difficult
  - This is so that web app doesn't break because of additional app folders or faulty db-seed
  