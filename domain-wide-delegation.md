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

Step 3: Connecting Deployment Environment To Google Cloud Project using Workload Identity Federation
  Vercel: Follow this guide: https://vercel.com/docs/security/secure-backend-access/oidc/gcp
  First setup Google Cloud using the above guide and then paste the environment variables to your Vercel project.
 GCP_PROJECT_ID=domain-wide-delegation-testing
 GCP_PROJECT_NUMBER=777450754675
 GCP_SERVICE_ACCOUNT_EMAIL=vercel-cal-staging@domain-wide-delegation-testing.iam.gserviceaccount.com
 GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
 GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel

Last Step (To Be Taken By Cal.com organization Owner/Admin): Assign Specific API Permissions via OAuth Scopes:
    - Go to your Google Admin Console (admin-google-com)
    - Navigate to Security → API Controls → Manage Domain-Wide Delegation
    - Here, you'll authorize the service account's client ID(Unique ID) to access the Google Calendar API
    - Add the necessary API scopes for Google Calendar(Full access to Google Calendar)
        https://www.googleapis.com/auth/calendar

