# Calendar Subscription  

The **Calendar Subscription** feature keeps your calendars synchronized while ensuring efficient caching.  

When enabled, it uses **webhooks** to automatically listen for updates and apply changes in real time.  
This means new events, modifications, or deletions are instantly captured and reflected across the system — no manual refresh or constant polling required.  

## Key Benefits  
- **Efficiency**: reduces API calls with optimized caching strategies.  
- **Reliability**: guarantees updates through webhook event delivery.  
- **Real-Time Sync**: ensures calendars are always up-to-date with minimal latency.  
- **Scalability**: supports multiple calendars and handles high-volume updates seamlessly.  

By subscribing to calendars via webhooks, you gain a smarter, faster, and more resource-friendly way to keep your data in sync.  

## Feature Flags

This feature can be enabled using two feature flags:
1. `calendar-subscription-cache` that will allow calendar cache to be recorded and used thru calendars, this flag is for globally enable this feature that should be managed individually by teams through team_Features 

### Enabling cache feature
`insert into Feature`
INSERT INTO "public"."Feature" ("slug", "enabled", "description", "type", "stale", "lastUsedAt", "createdAt", "updatedAt", "updatedBy") VALUES
('calendar-cache-serve', 'f', 'Whether to serve calendar cache by default or not on a team/user basis.', 'OPERATIONAL', 'f', NULL, '2025-09-16 17:02:09.292', '2025-09-16 17:02:09.292', NULL);


`insert into TeamFeatures 
INSERT INTO "public"."TeamFeatures" ("teamId", "featureId", "assignedAt", "assignedBy", "updatedAt") VALUES
(1, DEFAULT, DEFAULT, DEFAULT, DEFAULT);

### Enabling sync feature
2. `calendar-subscription-sync` this flag will enable canlendar sync for all calendars, diferently from cache it will be enabled globally for all users regardinless it is a team, individual or org.
INSERT INTO "public"."Feature" ("slug", "enabled", "description", "type", "stale", "lastUsedAt", "createdAt", "updatedAt", "updatedBy") VALUES
('calendar-cache-serve', 'f', 'Whether to serve calendar cache by default or not on a team/user basis.', 'OPERATIONAL', 'f', NULL, '2025-09-16 17:02:09.292', '2025-09-16 17:02:09.292', NULL);

## Team Feature Flags


## Architecture 

