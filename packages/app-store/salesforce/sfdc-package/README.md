# Cal.com SFDC Package

An unlocked Salesforce package that syncs Salesforce User record changes to Cal.com in real time.

## Overview

When a Salesforce User record is updated, this package detects which fields changed and POSTs those changes to Cal.com's `/api/integrations/salesforce/user-sync` endpoint via an async HTTP callout.

## Architecture

```
UserUpdateTrigger (after update)
  -> UserUpdateHandler.handleAfterUpdate()
       - Iterates over updated User records
       - Calls getPopulatedFieldsAsMap() on old and new records to diff them
       - Builds a UserChangePayload per user with only the changed fields
  -> CalComCalloutQueueable (enqueued as a single job for all payloads)
       - Queries Organization.IsSandbox to select the Named Credential
       - Sends each payload as a POST request with a 30-second timeout
```

### Change detection caveat

`UserUpdateHandler.getChangedFields` uses `SObject.getPopulatedFieldsAsMap()` on both the old and new trigger records, then iterates over the **new** record's populated fields looking for differences. This means:

- Fields that are populated on both old and new records and differ are detected.
- Fields that exist only on the new record (not populated on old) are included if their value differs from `null`.
- Fields that were populated on the old record but are **not populated** on the new record are **not** detected, because the loop only iterates over `newFields.keySet()`.

### Named Credentials

The queueable selects a Named Credential based on `Organization.IsSandbox`:

| Org type                | Named Credential      |
| ----------------------- | --------------------- |
| Sandbox / Scratch Org   | `CalCom_Development`  |
| Production              | `CalCom_Production`   |

Both credentials currently point to `https://app.cal.com`. To test against a local dev instance, update the `CalCom_Development` credential endpoint in the scratch org's Named Credential settings (see the [parent README](../README.md#developing-the-sfdc-package)).

## Payload structure

```json
{
  "salesforceUserId": "005xx000001Svk3AAC",
  "email": "user@example.com",
  "instanceUrl": "https://your-org.my.salesforce.com",
  "orgId": "00Dxx0000001gERAZQ",
  "changedFields": {
    "FirstName": "NewValue",
    "Title": "Senior Engineer"
  },
  "timestamp": "2025-06-15T14:30:00.000Z"
}
```

| Field              | Source                                          |
| ------------------ | ----------------------------------------------- |
| `salesforceUserId` | Trigger record ID                               |
| `email`            | `User.Email` from the new record                |
| `instanceUrl`      | `URL.getOrgDomainUrl().toExternalForm()`        |
| `orgId`            | `UserInfo.getOrganizationId()`                  |
| `changedFields`    | Map of field API name to new value              |
| `timestamp`        | `Datetime.now()` formatted as ISO 8601 UTC      |

## File structure

```
sfdc-package/
├── force-app/main/default/
│   ├── triggers/
│   │   └── UserUpdateTrigger.trigger          # after update on User
│   ├── classes/
│   │   ├── UserUpdateHandler.cls              # Diffs old/new fields, builds payloads
│   │   ├── CalComCalloutQueueable.cls         # Async HTTP POST to Cal.com
│   │   ├── UserUpdateHandlerTest.cls          # Tests for the handler
│   │   ├── CalComCalloutQueueableTest.cls     # Tests for the queueable
│   │   └── CalComHttpMock.cls                 # Shared HttpCalloutMock for tests
│   └── namedCredentials/
│       ├── CalCom_Development.namedCredential-meta.xml
│       └── CalCom_Production.namedCredential-meta.xml
├── sfdx-project.json                          # Package definition and version aliases
├── .forceignore
└── .sfdx/sfdx-config.json
```

## Publishing

See [Publishing the SFDC Package](../README.md#publishing-the-sfdc-package) in the parent README for instructions on creating package versions, listing them, and generating install links.
