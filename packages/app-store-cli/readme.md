## Steps to create an app

- Any files that you add here are automatically copied to new app created through the cli.
- Create a folder in packages/app-store/{APP_NAME} = {APP}
- Fill it with a sample app
  - Modify {APP}/_metadata.ts with the data provided
- ## package.json

Change name and description 

**Variables**

**PREFIXES**: 

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

### Why we shouldn't have appType

- App can have multiple types and thus categories is more suitable for this.
- The reason we seem to be using appType is to refer to an app uniquely but we already have app slug for that.

## Roadmap

- Allow editing and updating app from the cal app itself - including assets uploading when developing locally.
- Improvements in shared code across app
  - Use baseApp/api/add.ts for all apps with configuration of credentials creation and redirection URL.
- Delete creation side effects if App creation fails - Might make debugging difficult
  - This is so that web app doesn't break because of additional app folders or faulty db-seed
  