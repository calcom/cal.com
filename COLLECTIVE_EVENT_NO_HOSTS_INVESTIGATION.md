# COLLECTIVE Event with NO HOSTS - Investigation

## Problem Summary

Event Type ID `3838918` (and likely `3829465`) is a **COLLECTIVE** event with **NO HOSTS** assigned, causing a `NOT_FOUND` error when user `cal@cloudtrack.uk` (userId: `1832840`) tries to access it, even though they are an OWNER of team `133008`.

## Critical Finding: COLLECTIVE Event Configuration

```json
{
    "id": 3838918,
    "title": "Collective",
    "schedulingType": "COLLECTIVE",
    "userId": null,           // ❌ No owner
    "teamId": 133008,         // ✅ Belongs to CloudTRACK Projects team
    "hosts": [],              // ❌ EMPTY - No hosts assigned!
    "team": {
        "slug": "cloudtrack-projects"
    }
}
```

## User Information

```json
{
    "userId": 1832840,
    "email": "cal@cloudtrack.uk",
    "membership": {
        "teamId": 133008,
        "accepted": true,
        "role": "OWNER"
    }
}
```

## Hypothesis: Why COLLECTIVE Events with No Hosts Fail Access Control

### The Access Control Query

The `EventTypeRepository.findById` method checks these conditions (lines 787-820):

```typescript
const eventType = await this.prismaClient.eventType.findFirst({
  where: {
    AND: [
      {
        OR: [
          // Condition 1: User is in the event type's users list
          {
            users: {
              some: {
                id: userId,
              },
            },
          },
          // Condition 2: Event belongs to a team the user is a member of
          {
            AND: [
              { teamId: { not: null } }, 
              { teamId: { in: userTeamIds } }
            ],
          },
          // Condition 3: User is the owner
          {
            userId: userId,
          },
        ],
      },
      {
        id,
      },
    ],
  },
  select: CompleteEventTypeSelect,
});
```

### Analysis for COLLECTIVE Event with No Hosts

Let's check each condition:

#### ❌ Condition 1: User in `users` list
```typescript
users: {
  some: {
    id: userId,
  },
}
```
- **COLLECTIVE events don't use the `users` relation**
- COLLECTIVE events use the `hosts` relation instead
- The `users` array is for **ROUND_ROBIN** events
- **Result**: This condition FAILS because `users` list is likely empty

#### ✅ Condition 2: Team member
```typescript
AND: [
  { teamId: { not: null } },    // ✅ teamId is 133008
  { teamId: { in: userTeamIds } } // ✅ Should pass if userTeamIds includes 133008
]
```
- Event has `teamId: 133008`
- User has membership with team 133008
- **Result**: This condition SHOULD PASS

#### ❌ Condition 3: Owner
```typescript
userId: userId
```
- Event has `userId: null`
- **Result**: This condition FAILS

### The Core Problem: Team Membership Not Being Found

**If Condition 2 should pass but still fails, it means:**

```typescript
const userTeamIds = await MembershipRepository.findUserTeamIds({ userId });
// This is returning [] or not including 133008
```

**Possible reasons:**

1. **Profile-Based Query Issue**
   - Membership exists for `userId: 1832840`
   - But `MembershipRepository.findUserTeamIds` might be getting a different userId
   - Or using profile-based lookup instead of direct userId

2. **Membership Not Accepted** (but we confirmed `accepted: true`)

3. **Cached Empty Result**
   - Previous query cached an empty team list

4. **Transaction Isolation**
   - Membership was added after the query started

## The COLLECTIVE + No Hosts Scenario

### Why This Is Problematic

COLLECTIVE events are designed to require **ALL assigned hosts** to be available. The workflow is:

1. Create COLLECTIVE event on team
2. Assign team members as hosts
3. Booking requires ALL hosts to be free

**When `hosts: []` (empty):**
- The event has no one assigned to it
- It's a "zombie" event - belongs to a team but has no hosts
- Access control might be treating it as incomplete/invalid

### How This Likely Happened

1. Event was created as COLLECTIVE
2. No hosts were ever assigned, OR
3. All hosts were removed later

## Testing the Hypothesis

### Query 1: Check what `findUserTeamIds` returns

```sql
-- This is what the code should execute
SELECT "teamId" 
FROM "Membership" 
WHERE "userId" = 1832840 
  AND "accepted" = true;
```

**Expected Result**: Should include `133008`

**If it doesn't include 133008:**
- The membership query is broken
- Wrong userId is being passed
- Database connection issue

### Query 2: Check the event type directly

```sql
SELECT 
    et.id,
    et."teamId",
    et."userId",
    et."schedulingType",
    (SELECT COUNT(*) FROM "Host" h WHERE h."eventTypeId" = et.id) as host_count,
    (SELECT COUNT(*) FROM "_user_eventtype" uet WHERE uet."A" = et.id) as users_count
FROM "EventType" et
WHERE et.id = 3838918;
```

**Expected Result for COLLECTIVE with no hosts:**
```
id: 3838918
teamId: 133008
userId: null
schedulingType: COLLECTIVE
host_count: 0      ← Problem!
users_count: 0
```

### Query 3: Simulate the exact access control query

```sql
-- Simulate the findFirst query
WITH user_team_ids AS (
    SELECT "teamId" 
    FROM "Membership" 
    WHERE "userId" = 1832840 
      AND "accepted" = true
)
SELECT 
    et.id,
    et."teamId",
    et."userId",
    et."schedulingType",
    CASE 
        WHEN EXISTS (SELECT 1 FROM "_user_eventtype" uet WHERE uet."A" = et.id AND uet."B" = 1832840) 
        THEN true ELSE false 
    END as user_in_users_list,
    CASE 
        WHEN et."teamId" IN (SELECT "teamId" FROM user_team_ids) 
        THEN true ELSE false 
    END as user_is_team_member,
    CASE 
        WHEN et."userId" = 1832840 
        THEN true ELSE false 
    END as user_is_owner
FROM "EventType" et
WHERE et.id = 3838918;
```

**Expected Result:**
```
user_in_users_list: false
user_is_team_member: TRUE   ← This SHOULD be true
user_is_owner: false
```

**If `user_is_team_member` is FALSE, then:**
- The `Membership` table doesn't have the expected record
- There's a database inconsistency

## Most Likely Root Causes (Ranked)

### 1. **Profile-Based Session + UserId Query Mismatch** (80% likely)

```typescript
// Session uses profile-based upId
session.upId = "260358"  // Profile ID

// But findUserTeamIds expects userId
MembershipRepository.findUserTeamIds({ userId })

// If userId being passed is wrong, we get empty teamIds
```

**Evidence:**
- Session shows `upId: "260358"` (profile-based)
- Membership is stored with `userId: 1832840`
- There might be a profile→user ID mapping issue

**The Fix Would Be:**
Ensure that when using profile-based sessions, the code properly resolves to the underlying `userId` before querying memberships.

### 2. **COLLECTIVE Event Validation Bug** (40% likely)

**Theory**: The code might have additional validation for COLLECTIVE events:
- "If COLLECTIVE and hosts.length === 0, deny access"
- This would be a business logic check, not just access control

**Where to Look:**
- Event type validation middleware
- COLLECTIVE event specific checks
- Booking availability logic that leaks into access control

### 3. **Stale Context/Cache** (30% likely)

The `EventTypeRepository.findById` might be using a stale context where:
- User's team memberships were cached before joining team 133008
- Database connection is using old transaction
- Next.js cache serving old data

### 4. **Hosts Required for Access** (20% likely)

There might be a hidden rule:
- "For COLLECTIVE events, user must be in `hosts` array to edit"
- Since `hosts: []`, no one can access it
- Team membership alone isn't enough for COLLECTIVE events

## Diagnostic Logs to Check

When you reproduce the error, look for these specific log patterns:

### Log Pattern 1: UserId Mismatch
```json
{
  "eventTypeId": 3838918,
  "userId": 1832840,  // ✅ Correct
  "userTeamIds": [],  // ❌ Empty or missing 133008
  "membershipFound": false
}
```
**Meaning**: The `findUserTeamIds` query is returning wrong results

### Log Pattern 2: Profile Resolution Issue
```json
{
  "sessionUpId": "260358",
  "resolvedUserId": ???,  // What ID is actually being used?
  "membershipUserId": 1832840
}
```
**Meaning**: Profile → UserId resolution is broken

### Log Pattern 3: Event Type Found But Access Denied
```json
{
  "eventTypeExists": {
    "id": 3838918,
    "teamId": 133008,
    "schedulingType": "COLLECTIVE",
    "hosts": []
  },
  "message": "Event type exists but user doesn't have access"
}
```
**Meaning**: Access control logic is rejecting despite team membership

## Recommended Solutions

### Solution 1: Add Hosts to COLLECTIVE Event ⭐

```sql
-- Add the team owner as a host
INSERT INTO "Host" ("eventTypeId", "userId", "isFixed")
VALUES (3838918, 1832840, false);
```

This makes the event functional and might fix access.

### Solution 2: Convert to ROUND_ROBIN

```sql
-- Change scheduling type to ROUND_ROBIN
UPDATE "EventType" 
SET "schedulingType" = 'ROUND_ROBIN'
WHERE id = 3838918;

-- Add user to users list
INSERT INTO "_user_eventtype" ("A", "B")
VALUES (3838918, 1832840);
```

### Solution 3: Fix Profile-Based Membership Lookup

If the issue is profile-based queries, we need to ensure:
```typescript
// When upId is profile-based
const profile = await ProfileRepository.findByUpId(upId);
const userId = profile.user.id;  // ← Use this for membership queries

// Then
const teamIds = await MembershipRepository.findUserTeamIds({ userId });
```

## SQL Queries to Run

### Query 1: Verify membership exists
```sql
SELECT 
    m.id,
    m."userId",
    m."teamId",
    m."accepted",
    m."role",
    u.email,
    t.slug as team_slug
FROM "Membership" m
JOIN "users" u ON u.id = m."userId"
JOIN "Team" t ON t.id = m."teamId"
WHERE m."userId" = 1832840 
  AND m."teamId" = 133008;
```

### Query 2: Check all COLLECTIVE events with no hosts
```sql
SELECT 
    et.id,
    et.title,
    et."teamId",
    et."schedulingType",
    t.slug as team_slug,
    (SELECT COUNT(*) FROM "Host" h WHERE h."eventTypeId" = et.id) as host_count
FROM "EventType" et
LEFT JOIN "Team" t ON t.id = et."teamId"
WHERE et."schedulingType" = 'COLLECTIVE'
  AND et."teamId" = 133008
  AND NOT EXISTS (
      SELECT 1 FROM "Host" h WHERE h."eventTypeId" = et.id
  );
```

### Query 3: Check profile → user mapping
```sql
SELECT 
    p.id as profile_id,
    p.uid as profile_uid,
    p."userId",
    u.id as user_id,
    u.email,
    u.username
FROM "Profile" p
JOIN "users" u ON u.id = p."userId"
WHERE p.id = 260358 OR p.uid = '260358';
```

Expected: `userId` should be `1832840`

## Next Steps

1. **Run the diagnostic SQL queries above** to confirm:
   - Membership exists and is accepted
   - Profile 260358 maps to userId 1832840
   - Event 3838918 has 0 hosts

2. **Check server logs** when reproducing the error:
   - What userId is passed to `findUserTeamIds`?
   - What teamIds are returned?
   - Does the membership check succeed?

3. **Quick Fix**: Add yourself as a host to the event

4. **Proper Fix**: Investigate why team membership isn't sufficient for COLLECTIVE events

## Hypothesis Confidence

**Primary Hypothesis (90% confidence):**
The `MembershipRepository.findUserTeamIds({ userId })` is not returning team 133008, likely because:
- Wrong userId is being passed (profile ID instead of user ID)
- Or the query is using a profile-based lookup that's failing

**Secondary Hypothesis (60% confidence):**
COLLECTIVE events with `hosts: []` have additional access restrictions that require users to be explicitly in the hosts array, and team membership alone isn't sufficient.

