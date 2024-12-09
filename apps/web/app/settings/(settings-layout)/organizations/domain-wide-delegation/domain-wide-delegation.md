## Setting up Domain-Wide Delegation for Google Calendar API

Step 1: Create a Google Cloud Project

Before you can create a service account, you'll need to set up a Google Cloud project.

 1. Create a Google Cloud Project:
        - Go to the Google Cloud Console
        - Select Create Project
        - Give your project a name and select your billing account (if applicable)
        - Click Create
  2. Enable the Google Calendar API:
     1. Go to the Google Cloud Console
     2. Select API & Services → Library
     3. Search for "Google Calendar API"
     4. Click Enable

Step 2: Create a Service Account

A service account is needed to act on behalf of users

 1. Navigate to the Service Accounts page:
    - In the Google Cloud Console, go to IAM & Admin → Service Accounts
 2. Create a New Service Account:
    - Click on Create Service Account
    - Give your service account a name and description
    - Click Create and Continue

Step 3: To Be taken by Cal.com instance admin:
   - Create a Workspace Platform with slug="google". Slug has to be exactly this. This is how we know we need to use Google Calendar and Google Meet.

Last Step (To Be Taken By Cal.com organization Owner/Admin): Assign Specific API Permissions via OAuth Scopes:
    - Create DWD with workspace platform "google"
      - User must be a member of the Google Workspace to be able to enable DWD as there is a validation if the user's calendar can be accessed through the service account
    - Get the Client ID from there
    - Go to your Google Admin Console (admin-google-com)
    - Navigate to Security → API Controls → Manage Domain-Wide Delegation
    - Here, you'll authorize the Client ID(Unique ID) to access the Google Calendar API
    - Add the necessary API scopes for Google Calendar(Full access to Google Calendar)
        https://www.googleapis.com/auth/calendar

## How Domain-Wide Delegation works
- cal.com instance admin needs to create a workspace platform which requires Service Account Key.
- After this, organization owner can create a domain-wide-delegation for that workspace platform and a domain of their choice.
- No Credential table entry is created at the moment but the workspace platform's related apps will be considered as "installed" for the users with email matchind dwd domain. An in-memory credential like object is created for this purpose. It allows avoiding creation of thousands of records for all the members of the organization when dwd is enabled.
- DWD Credential is applicable to Users only. 
   - For team, we don't use dwd credential as you can impersonate a user and not team through Dwd credential. Currently supported apps(Google Calendar and Google Meet) don't support team installation, so we could simply allow enabling DWD without any issues.
- Disabling a workspace platform stops it from being used for any new organizations and also disables any DWD using the workspace platform from being edited.
   - It still all existing DWDs to keep on working
- Adding any number of DWDs for a particular workspace always gives the same Client ID as DWD uses the workspace's default Service Account.
- Deleting or Disabling a DWD is identical in terms of it disabling DWD immediately. The only difference is that deleting a DWD removes it from the database.