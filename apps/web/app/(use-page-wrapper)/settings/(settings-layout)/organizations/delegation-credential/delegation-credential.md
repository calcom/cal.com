# Delegation Credentials

## Setting up Delegation Credential for Google Calendar API

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
    - Click Create and Continue(Optional steps can be skipped)

Step 3: To Be taken by Cal.com instance admin:

- Create a Workspace Platform with slug="google". Slug has to be exactly this. This is how we know we need to use Google Calendar and Google Meet.

Last Step (To Be Taken By Cal.com organization Owner/Admin): Assign Specific API Permissions via OAuth Scopes:
- Create Delegation Credential with workspace platform "google"
  - User must be a member of the Google Workspace to be able to enable Delegation Credential as there is a validation if the user's calendar can be accessed through the service account
  - Get the Client ID from there
  - Go to your Google Admin Console (admin-google-com)
  - Navigate to Security → Access and Data Controls -> API controls -> Manage Domain-Wide Delegation
  - Here, you'll authorize the Client ID(Unique ID) to access the Google Calendar API
  - Add the following API scope for Google Calendar(Full access to Google Calendar)
    - `https://www.googleapis.com/auth/calendar`

## Onboarding Improvements

- Just adding a member to the organization would do the following:
  - Member to receive events in their calendar, even if they don't login to their account and complete the onboarding process.
  - The booking location would be Google Meet, even if the user hasn't set it as default(Though Cal Video would show up as default, but we still use Google Meet in this case. We will fix it later.)
  - It would still not use their calendar for conflict checking, but user can complete the onboarding(just select one calendar there for conflict checking)
- Onboarding process: Google Calendar is pre-installed for any new member of the organization(assuming the user has an email of the Delegation Credential domain) and Destination Calendar and Selected Calendar are configurable. On next step, Google Meet is pre-installed and shown at the top and could be set as default.

## Restrictions after enabling Delegation Credential

- Enabling Delegation Credential for a particular workspace in Cal.com(only google/outlook supported at the moment) disables the user from disconnecting that credential.

## Who can create Delegation Credential and enable it?

- Only the owner/admin of the organization can create Delegation Credential
- Only the owner/admin of the organization can enable the created Delegation Credential. Following additional requirements are there:
  - The client ID must be added to the Google Admin Console
  - The user's email must be a member of the Google Workspace
  - The user's email must be verified.

## Disabling Delegation Credential

- Disabling Delegation **Credential** maintains the user's preferences in terms of SelectedCalendars and DestinationCalendar.

## Developer Notes

### Terminology

- Delegation Credential: A Delegation Credential service account key along with user's email becomes the Delegation Credential which is an alternative to regular Credential in DB.
- DWD: Domain Wide Delegation
- non-dwd credential: Regular credentials that are stored in Credentials table

### How Delegation Credential works

- We use the Cal.com user's email to impersonate that user using Delegation Credential(which is just a service account key at the moment)
  - That gives us read/write permission to get availability of the user and create new events in their calendar.

### What is a Delegation Credential?

- A Delegation Credential service account key along with user's email becomes the Delegation Credential which is an alternative to regular Credential in DB.
- Delegation Credential doesn't completely replace the regular credentials. Delegation Credential gives access to the cal.com user's email in Google Calendar. So, if the user needs to connect to some other email's calendar, we need to use the regular credentials.

### Important Points

- No Credential table entry is created when enabling Delegation Credential. The workspace platform's related apps will be considered as "installed" for the users with email matching dwd domain. An in-memory credential like object is created for this purpose. It allows avoiding creation of thousands of records for all the members of the organization when Delegation Credential is enabled.
- Delegation Credential is applicable to Users only.
  - For team, we don't use Delegation Credential as you can impersonate a user and not team through Delegation Credential. Currently supported apps(Google Calendar and Google Meet) don't support team installation, so we could simply allow enabling Delegation Credential without any issues.
- Disabling a workspace platform stops it from being used for any new organizations and also disables any Delegation Credential using the workspace platform from being edited.
  - It still all existing Delegation Credentials to keep on working
- Workspace default service account is unused and is to be removed.

### How apps/installed loads the credentials

1. Identify the logged in user's email
2. Identify the domainWideDelegations for that email's domain
3. Build in-memory credentials for the domainWideDelegations and use them along with the actual credentials(that user might have connected) of the user
4. We don't show the non-dwd connected calendar(if there is a corresponding dwd connected calendar). Though we use the non-dwd credentials to identify the selected calendars, for the dwd connected calendar.

### Impact of disabling Delegation Credential

Disabling effectively stops generating in-memory delegation user credentials. So, any members who haven't manually connected their Calendar and thus their calendar connections were working only because of Delegation Credential, would have their connections broken.

#### What would not work correctly ?

- Calendar won't be checked for conflicts. So, they could get booked at a time when they are marked busy in their calendar.
  - Cal.com bookings would still be checked for conflicts.
- Bookings might not appear in the attendee and host's Google Calendar. Because we would be unable to use the API to create the events in calendar and Google doesn't always add events to calendar automatically based on .ics file alone.
- Cal Video would be used as the booking location instead of Google Meet.

#### What would work correctly ?

- Bookings would still go through. People relying on Salesforce for booking details, would face no issues.
- Cal.com bookings would still be checked for conflicts.

### Notes when testing locally

- You need to enable the feature through feature flag.
- You could use Acme org and login as <owner1-acme@example.com>
- Make sure to change the email of the user above to your workspace owner's email(other member's email might also work). This is necessary otherwise you won't be able to enable Delegation Credential for the organization.
  - Note: After changing the email, you would have to logout and login again
