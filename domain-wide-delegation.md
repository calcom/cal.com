# Setting up Domain-Wide Delegation for Google Calendar API

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

Last Step (To Be Taken By Cal.com organization Owner/Admin): Assign Specific API Permissions via OAuth Scopes:
    - Go to your Google Admin Console (admin-google-com)
    - Navigate to Security → API Controls → Manage Domain-Wide Delegation
    - Here, you'll authorize the service account's client ID(Unique ID) to access the Google Calendar API
    - Add the necessary API scopes for Google Calendar(Full access to Google Calendar)
        https://www.googleapis.com/auth/calendar