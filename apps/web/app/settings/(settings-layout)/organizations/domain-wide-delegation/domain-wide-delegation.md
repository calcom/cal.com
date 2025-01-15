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
    - Navigate to Security → Access and Data Controls -> API controls -> Manage Domain-Wide Delegation
    - Here, you'll authorize the Client ID(Unique ID) to access the Google Calendar API
    - Add the necessary API scopes for Google Calendar(Full access to Google Calendar)
        https://www.googleapis.com/auth/calendar


## Onboarding Improvement
- Google Calendar is pre-installed for any new member of the organization(assuming the user has an email of the DWD domain) and Destination Calendar and Selected Calendar are configurable. On next step, Google Meet is pre-installed and shown at the top and could be set as default.

## Restrictions after enabling DWD
- Enabling DWD for a particular workspace in Cal.com(only google supported at the moment) disables the user from disconnecting that credential.

## Who can create DWD and enable it? 
- Only the owner/admin of the organization can create DWD
- Only the owner/admin of the organization can enable the created DWD. Following additional requirements are there:
   -  The client ID must be added to the Google Admin Console
   -  The user's email must be a member of the Google Workspace
   -  The user's email must be verified.

## Disabling DWD
 -  Disabling DWD maintains the user's preferences in terms of SelectedCalendars and DestinationCalendar.

## Developer Notes
### Terminology
- DWD Credential: A DWD service account key along with user's email becomes the DWD Credential which is an alternative to regular Credential in DB.
- DWD: Domain Wide Delegation
- non-dwd credential: Regular credentials that are stored in Credentials table

### How DWD works
- We use the Cal.com user's email to impersonate that user using DWD Credential(which is just a service account key at the moment)
   - That gives us read/write permission to get availability of the user and create new events in their calendar.

### What is a DWD Credential?
- A DWD service account key along with user's email becomes the DWD Credential which is an alternative to regular Credential in DB.
- DWD doesn't completely replace the regular credentials. DWD Credential gives access to the cal.com user's email in Google Calendar. So, if the user needs to connect to some other email's calendar, we need to use the regular credentials.

### Important Points
- No Credential table entry is created when enabling DWD. The workspace platform's related apps will be considered as "installed" for the users with email matching dwd domain. An in-memory credential like object is created for this purpose. It allows avoiding creation of thousands of records for all the members of the organization when dwd is enabled.
- DWD Credential is applicable to Users only. 
   - For team, we don't use dwd credential as you can impersonate a user and not team through Dwd credential. Currently supported apps(Google Calendar and Google Meet) don't support team installation, so we could simply allow enabling DWD without any issues.
- Disabling a workspace platform stops it from being used for any new organizations and also disables any DWD using the workspace platform from being edited.
   - It still all existing DWDs to keep on working
- Adding any number of DWDs for a particular workspace always gives the same Client ID as DWD uses the workspace's default Service Account.
- We should disable DWD and not delete it when we want to stop using it temporarily. Deleting DWD also removes all the seletedCalendar entries connected to it. 

### How apps/installed loads the credentials
1. Identify the logged in user's email
2. Identify the domainWideDelegations for that email's domain
3. Build in-memory credentials for the domainWideDelegations and use them along with the actual credentials(that user might have connected) of the user
4. We don't show the non-dwd connected calendar(if there is a corresponding dwd connected calendar). Though we use the non-dwd credentials to identify the selected calendars, for the dwd connected calendar.

### Impact on existing users booking flow
- There should be no impact on availability on enabling DWD because we keep on using the existing credentials along with new DWD credential.
- When booking the event, we sort the credentials with DWD credentials last, so there should be no impact on creating calendar events.
   - NOTE: We will followup with sorting the credentials with DWD credentials first in a followup PR(They are preferred because they don't expire)

### Impact on APIs - [ To Verify ]
- We don't support DWD through APIs yet. So, all existing APIs would continue to work with non-dwd credentials only.

### Performance Issues
- There could be 100s of users in an organization with already connected calendars. Enabling DWD adds a duplicate credential(in-memory) for each of them.
   - Because a credential isn't aware of which email it is for(without connecting with Google Calendar API itself), we can't identify which credential is for which SelectedCalendar and thus we can't deduplicate them. This has an impact on fetching the availability and thus for a team event with x participants, we could have 2x requests to Google Calendar API. Because for big value of x, user might be using routing and thus the actual value might be much lower. So, we could be fine. Also, we would have Calendar Cache enabled there already to reduce the requests.

### Notes when testing locally
- You need to enable the feature through feature flag.
- You could use Acme org and login as owner1-acme@example.com
- Make sure to change the email of the user above to your workspace owner's email(other member's email might also work). This is necessary otherwise you won't be able to enable DWD for the organization.
   - Note: After changing the email, you would have to logout and login again as required by NextAuth