# SQL-Based Calendar Cache Implementation Plan

## Updated Schema (Cal.com Conventions)

```sql
-- Main events table storing individual calendar events
model CalendarEvent {
  id               BigInt    @id @default(autoincrement())
  credentialId     Int
  userId           Int?
  calendarId       String    @db.VarChar(255)
  
  // Google Calendar event fields
  googleEventId    String    @db.VarChar(255)
  googleEtag       String?   @db.VarChar(255)
  status           String    @db.VarChar(50) // confirmed, cancelled, tentative
  summary          String?   @db.Text
  
  // DateTime fields (stored as UTC timestamps)
  startTime        DateTime
  endTime          DateTime
  timezone         String?   @db.VarChar(100)
  
  // Tracking fields
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  googleCreatedAt  DateTime?
  googleUpdatedAt  DateTime?
  
  // Sync tracking
  sequence         Int?      @default(0)
  icalUid          String?   @db.VarChar(255)
  
  // Relations
  credential       Credential @relation(fields: [credentialId], references: [id], onDelete: Cascade)
  user             User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([credentialId, calendarId, googleEventId])
  @@index([credentialId, calendarId, startTime, endTime], name: "idx_calendar_events_time_range")
  @@index([status], name: "idx_calendar_events_status")
  @@index([updatedAt], name: "idx_calendar_events_updated")
  @@index([googleEventId], name: "idx_calendar_events_google_id")
  @@index([credentialId, updatedAt], name: "idx_calendar_events_cleanup")
}

// Sync tokens table for incremental updates
model CalendarSyncToken {
  id           BigInt   @id @default(autoincrement())
  credentialId Int
  calendarId   String   @db.VarChar(255)
  syncToken    String   @db.Text
  lastSyncAt   DateTime @default(now())
  
  // Relations
  credential   Credential @relation(fields: [credentialId], references: [id], onDelete: Cascade)
  
  @@unique([credentialId, calendarId])
  @@index([lastSyncAt], name: "idx_calendar_sync_tokens_cleanup")
}
```

## Feature Flag Configuration

### 1. Add Feature Flags to Config
```typescript
// packages/features/flags/config.ts
export const FEATURES = {
  // ... existing flags
  "calendar-cache-sql": {
    description: "Use SQL-based calendar cache instead of JSON",
    enabled: false,
  },
  "calendar-cache-sql-write": {
    description: "Write to SQL calendar cache (dual-write mode)",
    enabled: false,
  },
} as const;
```

### 2. Feature Flag Usage Pattern
```typescript
// packages/features/calendar-cache/calendar-cache-sql.repository.ts
import { checkFeatureFlag } from "@calcom/features/flags/features.repository";

export class CalendarCacheSqlRepository {
  async shouldUseSqlCache(userId?: number, teamId?: number): Promise<boolean> {
    return await checkFeatureFlag("calendar-cache-sql", userId, teamId);
  }
  
  async shouldWriteToSqlCache(userId?: number, teamId?: number): Promise<boolean> {
    return await checkFeatureFlag("calendar-cache-sql-write", userId, teamId);
  }
}
```

## Implementation Strategy

### Phase 1: Schema & Repository Setup
1. **Create migration** for new tables
2. **Implement SqlCalendarCacheRepository** alongside existing repository
3. **Add feature flag checks** in calendar service

### Phase 2: Dual-Write Implementation
```typescript
// packages/app-store/googlecalendar/lib/CalendarService.ts
async setAvailabilityInCache(args: FreeBusyArgs, data: any) {
  // Always write to existing JSON cache
  await this.legacyCacheRepository.upsertCachedAvailability({...});
  
  // Conditionally write to SQL cache
  if (await this.sqlCacheRepository.shouldWriteToSqlCache(this.credential.userId)) {
    await this.sqlCacheRepository.upsertEvents({...});
  }
}

async getCachedAvailability(args: FreeBusyArgs) {
  // Check if SQL cache should be used for reading
  if (await this.sqlCacheRepository.shouldUseSqlCache(this.credential.userId)) {
    return await this.sqlCacheRepository.getCachedAvailability(args);
  }
  
  // Fallback to JSON cache
  return await this.legacyCacheRepository.getCachedAvailability(args);
}
```

### Phase 3: SQL Repository Implementation
```typescript
// packages/features/calendar-cache/calendar-cache-sql.repository.ts
export class CalendarCacheSqlRepository {
  async getCachedAvailability(args: FreeBusyArgs): Promise<EventBusyDate[]> {
    const events = await prisma.calendarEvent.findMany({
      where: {
        credentialId: this.credentialId,
        calendarId: { in: args.items.map(item => item.id) },
        status: { not: "cancelled" },
        startTime: { lt: new Date(args.timeMax) },
        endTime: { gt: new Date(args.timeMin) },
      },
      select: {
        startTime: true,
        endTime: true,
        googleEventId: true,
      },
      orderBy: { startTime: "asc" },
    });
    
    return events.map(event => ({
      start: event.startTime,
      end: event.endTime,
      id: event.googleEventId,
      source: null,
    }));
  }
  
  async upsertEvents(events: GoogleCalendarEvent[], calendarId: string) {
    const operations = events.map(event => 
      prisma.calendarEvent.upsert({
        where: {
          credentialId_calendarId_googleEventId: {
            credentialId: this.credentialId,
            calendarId,
            googleEventId: event.id,
          },
        },
        update: {
          status: event.status,
          summary: event.summary,
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          googleUpdatedAt: new Date(event.updated),
          updatedAt: new Date(),
        },
        create: {
          credentialId: this.credentialId,
          userId: this.userId,
          calendarId,
          googleEventId: event.id,
          status: event.status,
          summary: event.summary,
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          googleCreatedAt: new Date(event.created),
          googleUpdatedAt: new Date(event.updated),
        },
      })
    );
    
    await prisma.$transaction(operations);
  }
  
  async cleanupOldEvents(olderThanDays: number = 90) {
    await prisma.calendarEvent.deleteMany({
      where: {
        credentialId: this.credentialId,
        endTime: { lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) },
      },
    });
  }
}
```

## Migration Rollout Plan

### Stage 1: Infrastructure (Week 1)
- [ ] Create database migration
- [ ] Implement SQL repository
- [ ] Add feature flags to config
- [ ] Deploy with flags disabled

### Stage 2: Dual-Write (Week 2-3)
- [ ] Enable `calendar-cache-sql-write` for internal team
- [ ] Monitor data consistency between JSON and SQL
- [ ] Validate performance impact
- [ ] Gradual rollout to 10% of users

### Stage 3: Dual-Read (Week 4-5)
- [ ] Enable `calendar-cache-sql` for internal team
- [ ] Compare query performance vs JSON cache
- [ ] Test edge cases and error handling
- [ ] Gradual rollout to 25% of users

### Stage 4: Full Migration (Week 6+)
- [ ] Enable SQL cache for 100% of users
- [ ] Monitor for 2 weeks
- [ ] Remove JSON cache code
- [ ] Drop CalendarCache table

## Benefits of This Approach

### 1. **Zero-Risk Rollout**
- Existing functionality unchanged
- Feature flags allow instant rollback
- Dual-write ensures data consistency

### 2. **Performance Improvements**
```sql
-- Efficient date range queries
SELECT startTime, endTime, googleEventId 
FROM CalendarEvent 
WHERE credentialId = ? AND calendarId = ?
  AND status != 'cancelled'
  AND startTime < ? AND endTime > ?
ORDER BY startTime;

-- Simple cleanup operations
DELETE FROM CalendarEvent 
WHERE endTime < NOW() - INTERVAL '90 days';
```

### 3. **Simplified Logic**
- No complex JSON merge operations
- Database handles concurrency and transactions
- Built-in indexing for performance
- Standard SQL operations for maintenance

### 4. **Team-Based Control**
- Feature flags support team-level enablement
- Gradual rollout per organization
- A/B testing capabilities
- Easy monitoring and metrics

This implementation follows Cal.com's established patterns while providing a safe, gradual migration path from JSON to SQL-based calendar caching.
