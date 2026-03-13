# Cal.com SFDC Package

An unlocked Salesforce package that syncs Salesforce User record changes to Cal.com in real time.

## What It Does

When a Salesforce User record is updated (e.g. name, email, title, department), the package automatically detects the changed fields and sends them to Cal.com's `/api/integrations/salesforce/user-sync` endpoint via an asynchronous HTTP callout.

### How It Works

1. **`UserUpdateTrigger`** fires on `after update` of the `User` object.
2. **`UserUpdateHandler`** compares old and new field values, building a payload of only the changed fields for each modified user.
3. **`CalComCalloutQueueable`** sends each payload as a `POST` request to Cal.com using Salesforce Named Credentials. It automatically selects the correct credential based on the org type:
   - **Sandbox / Scratch Org** -> `CalCom_Development`
   - **Production** -> `CalCom_Production`

### Payload Structure

```json
{
  "salesforceUserId": "<Salesforce User ID>",
  "email": "user@example.com",
  "instanceUrl": "https://your-org.my.salesforce.com",
  "orgId": "<Salesforce Org ID>",
  "changedFields": {
    "FirstName": "NewValue",
    "Title": "NewTitle"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Package Structure

```
sfdc-package/
  force-app/main/default/
    triggers/
      UserUpdateTrigger.trigger        # Entry point - fires on User updates
    classes/
      UserUpdateHandler.cls            # Detects changed fields and builds payloads
      CalComCalloutQueueable.cls       # Sends payloads to Cal.com asynchronously
      CalComCalloutQueueableTest.cls   # Tests for the queueable callout
      UserUpdateHandlerTest.cls        # Tests for the update handler
      CalComHttpMock.cls               # HTTP mock for unit tests
    namedCredentials/
      CalCom_Development.namedCredential-meta.xml
      CalCom_Production.namedCredential-meta.xml
  sfdx-project.json                    # Package definition and version aliases
```

## Generating the Install Link

### Prerequisites

- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) installed
- Access to the Dev Hub org (`team@cal.com`)

### Steps

All commands should be run from the `sfdc-package` directory:

```bash
cd packages/app-store/salesforce/sfdc-package
```

#### 1. Create a New Package Version

```bash
sf package version create \
  --package "calcom-sfdc-package" \
  --installation-key-bypass \
  --wait 20 \
  --target-dev-hub team@cal.com
```

Add `--code-coverage` when you are ready to promote to production (requires 75% Apex test coverage).

#### 2. List Package Versions

```bash
sf package version list --target-dev-hub team@cal.com
```

Find the `Subscriber Package Version Id` (starts with `04t`) for the version you want to install.

#### 3. Build the Install Link

The install URL follows this format:

```
https://login.salesforce.com/packaging/installPackage.apexp?p0=<SUBSCRIBER_PACKAGE_VERSION_ID>
```

Replace `<SUBSCRIBER_PACKAGE_VERSION_ID>` with the `04t` ID from step 2. For example, using the latest version in `sfdx-project.json`:

```
https://login.salesforce.com/packaging/installPackage.apexp?p0=04tKk0000000SwwIAE
```

> **Note:** Beta versions (not promoted) can only be installed in sandbox and scratch orgs. To allow installation in production, promote the version first:
>
> ```bash
> sf package version promote \
>   --package "calcom-sfdc-package@<VERSION>" \
>   --target-dev-hub team@cal.com
> ```
>
> Replace `<VERSION>` with the version number (e.g. `0.1.0-2`).
