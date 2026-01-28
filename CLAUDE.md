# Business rules
1. Managed event types
- When a managed event type is created we create a managed event type for team (parent managed event type) and for each user that has been assigned to it (child managed event type). Parent managed event type will have "teamId" set in the EventType table row and child one "userId". If we create managed event type and assign Alice and Bob then three rows will be inserted in the EventType table.
- It is possible to book only child managed event type.

2. Organizations and teams both are stored in the "Team" table. Organizations have "isOrganization" set to true, and if the entry has
"parentId" set then it means it is a team within an organization.

3. There are two types of OAuth clients you have to distinguish between:
- "OAuth client" which resides in the "OAuthClient" table. This OAuth client allows 3rd party apps users to connect their cal.com accounts.
- "Platform OAuth client" which resides in the "PlatformOAuthClient" table. This OAuth client is used only by platform customers integrating cal.com scheduling directly in their platforms.
If someone says "platform OAuth client" then they mean the one in the "PlatformOAuthClient" table.

# API v2 (apps/api/v2)
1. If the api needs to reuse some dependency from the monorepo, then it has to be re-exported via the "@calcom/platform-libraries" and only then api v2 can import.
For example, "packages/platform/libraries/emails.ts" exports "OrganizerRescheduledEmail" that api v2 then imports as following: import {OrganizerRescheduledEmail} from "@calcom/platform-libraries/emails". It is important to group individual re-exports in individual files like with this "packages/platform/libraries/emails.ts" example.
