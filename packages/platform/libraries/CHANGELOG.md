## 0.0.22
Export `updateNewTeamMemberEventTypes` from `"@calcom/lib/server/queries"` so that we can assign newly created organizations
teams members to event-types that have been marked as "assign all team members"

## 0.0.20
In event-types create handler (packages/trpc/server/routers/viewer/eventTypes/create.handler.ts) enable passing scheduleId so that when an event type is created it can be connected
to a specific schedule.

## 0.0.19
Added - create event type handler was [updated](https://github.com/calcom/cal.com/pull/15774) for system admins not to be required
to be part of org team when creating event type for team. Update libraries to include these changes.