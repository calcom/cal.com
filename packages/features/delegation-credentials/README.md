# Delegation Credentials

## Setting up Delegation Credential for Google Calendar API

Step 0: Create a Workspace Platform(to be done once for the Cal.com instance, by the Cal.com instance admin)

- Create a Workspace Platform through admin interface at <https://app.cal.com/settings/admin/workspace-platforms>
  - Use slug="google". Slug has to be exactly this. This is how we know we need to use Google Calendar and Google Meet.
  - Use "Google" as the name of the workspace platform. Change it as per your liking.
  - Optionally provide description for the workspace platform.

Step 1: Create a Google Cloud Project or use existing one(to be done once for the Cal.com instance)

Before you can create a service account, you'll need to set up a Google Cloud project.

 1. Create a Google Cloud Project:
     1. Go to the Google Cloud Console
     2. Select Create Project
     3. Give your project a name and select your billing account (if applicable)
     4. Click Create
 2. Enable the Google Calendar API:
     1. Go to the Google Cloud Console
     2. Select API & Services → Library
     3. Search for "Google Calendar API"
     4. Click Enable

Step 2: Create a Service Account in Google Cloud Console(to be done for every organization)

A service account is needed to act on behalf of users

 1. Navigate to the Service Accounts page:
    - In the Google Cloud Console, go to IAM & Admin → Service Accounts
 2. Create a New Service Account:
    - Click on Create Service Account
    - Give your service account a name and description
    - Click Create and Continue(Optional steps can be skipped)
 3. Download the Service Account Key JSON file

Step 3: Create Delegation Credential(To Be taken by Cal.com instance admin):

- Impersonate the organization owner and go to https://app.cal.com/settings/organizations/delegation-credential to create a Delegation Credential

  - Use domain as "acme.com" if @acme.com is the email address for your Google Workspace
  - Choose Workspace Platform as "Google"
  - Add Service Account Key JSON file(obtained in Step 2)
  - Click on "Create" button

Step 4: Copy the Client ID and OAuth Scope (To Be Taken By Cal.com organization Owner/Admin in Cal.com):

- Go to https://app.cal.com/settings/organizations/delegation-credential
  - Copy the Client ID for your Google Workspace domain(e.g. acme.com)
    - Client ID is a number like 123456789012345678901 that

Step 5: Add Client ID under Domain-Wide Delegation (To Be taken By Google Workspace Admin):

- Go to your Google Admin Console(admin.google.com)
  - Navigate to Security → Access and Data Controls -> API controls -> Manage Domain-Wide Delegation
  - Here, you'll authorize the Client ID to access the Google Calendar API
  - Add the following API scope for Google Calendar(Full access to Google Calendar. We use it to read freebusy time and create/update events in the members' calendars)
    - `https://www.googleapis.com/auth/calendar`

Step 6: Enable Delegation Credential(To Be taken By Cal.com organization Owner/Admin in Cal.com):

- Prerequisite: The owner/admin must be part of the Google Workspace to enable Delegation Credential
- Go to https://app.cal.com/settings/organizations/delegation-credential
  - Enable Delegation Credential
    - If you have added the Client ID for correct Google Workspace, the Delegation Credential would be enabled, otherwise you would see an error message, that should help and contact support if you still face issues.

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
- Delegation User Credential: A Delegation User Credential is a Credential record in DB that uses DelegationCredential record to actually access the user's calendar. A Credential record with delegationCredentialId set is a Delegation User Credential.
- In-DB Delegation Credential: Another name for Delegation User Credential. This is used to build the CalendarCache records.
- In-Memory Delegation Credential: It is a Credential like object but only in-memory and has id=-1. This is used to to connect with the third party Calendar. We might want to move away from In-Memory Delegation Credential to use In-DB Delegation Credential in future.

### How Delegation Credential works

- We use the Cal.com user's email to impersonate that user using Delegation Credential(which is just a service account key at the moment)
  - That gives us read/write permission to get availability of the user and create new events in their calendar.

### What is a Delegation Credential?

- A Delegation Credential service account key along with user's email becomes the Delegation Credential which is an alternative to regular Credential in DB.
- Delegation Credential doesn't completely replace the regular credentials. Delegation Credential gives access to the cal.com user's email in Google Calendar. So, if the user needs to connect to some other email's calendar, we need to use the regular credentials.

### Cron Jobs

Cron jobs ensure that for each and every member of the organization that has Delegation Credential enabled, corresponding SelectedCalendar records are there. These crons currently run every 5 minutes and process a batch in one run to avoid overloading the DB and third party CalendarAPIs, look at vercel.json for the up-to-date schedule.

- `credentials` cron job creates Delegation User Credential records for all the members of the organization who don't have Delegation User Credentials yet. It also ensures that on disabling Delegation Credential, the Delegation User Credentials are deleted which automatically deletes the SelectedCalendar and CalendarCache records through DB cascade.
- `selected-calendars` cron job creates SelectedCalendar records for all the Delegation User Credentials of the organization who don't have Selected Calendars yet.

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
4. We don't show the non DelegationCredential connected calendar(if there is a corresponding DelegationCredential connected calendar). Though we use the non DelegationCredential credentials to identify the selected calendars, for the DelegationCredential connected calendar.

### Impact of disabling Delegation Credential

- It immediately stops generating in-memory delegation user credentials. So, any members who haven't manually connected their Calendar and thus their calendar connections were working only because of Delegation Credential, would have their calendar connections broken.
- Credentials cron job would delete the Delegation User Credentials which will then cascade to delete the SelectedCalendar and CalendarCache records.

### Impact of enabling Delegation Credential
- Existing calendar-cache records are re-used as we identify the relevant record by userId and key of CalendarCache record.
  - Any updates to those calendar-cache records keep on working by using the non-delegation credential attached with the SelectedCalendar record.
  - In case there is an error while watching the SelectedCalendar using non-delegation credential, we will delete the SelectedCalendar record and create a new one using Delegation User Credential.
- For any new members, we create Credential records and SelectedCalendar records through cron jobs and thus their calendar-cache records will also be created.

### Notes when testing locally

- You need to enable the feature through feature flag.
- You could use Acme org and login as <owner1-acme@example.com>
- Make sure to change the email of the user above to your workspace owner's email(other member's email might also work). This is necessary otherwise you won't be able to enable Delegation Credential for the organization.
  - Note: After changing the email, you would have to logout and login again

