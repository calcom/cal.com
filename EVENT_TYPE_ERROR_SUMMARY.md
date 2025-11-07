# Event Type NOT_FOUND Error - Investigation Summary

## Confirmed Facts

### Event ID: `3838918` ✅
**This is the event that's failing with NOT_FOUND error**

Event Details:
```json
{
    "id": 3838918,
    "title": "Collective" (or "TEST"),
    "slug": "collective",
    "schedulingType": "COLLECTIVE",
    "teamId": 133008,
    "userId": null,
    "hosts": [],  // ← Empty!
    "team": {
        "slug": "cloudtrack-projects"
    }
}
```

### User Details: ✅
```json
{
    "userId": 1832840,
    "email": "cal@cloudtrack.uk",
    "username": "cloudtrack"
}
```

### Membership Details: ✅
```json
{
    "id": 1068884,
    "userId": 1832840,
    "teamId": 133008,
    "accepted": true,
    "role": "OWNER"
}
```

### Session Details: ✅
```json
{
    "user": {
        "id": 1832840,
        "email": "cal@cloudtrack.uk"
    },
    "profileId": 260358,
    "upId": "260358"  // ← Profile-based, not usr-1832840
}
```

---

## The Problem

User is **OWNER** of team 133008 with **accepted membership**, but gets `NOT_FOUND` when accessing event 3838918 which belongs to that team.

## Root Cause Analysis

The access control query in `EventTypeRepository.findById` checks three conditions:

```typescript
OR: [
  // 1. User in event type's users list (for ROUND_ROBIN)
  { users: { some: { id: userId } } },
  
  // 2. User is member of the event's team
  { AND: [
      { teamId: { not: null } }, 
      { teamId: { in: userTeamIds } }  // ← This is failing!
    ] 
  },
  
  // 3. User is the owner
  { userId: userId }
]
```

For event 3838918:
- ❌ Condition 1 FAILS: COLLECTIVE events don't use `users` relation (they use `hosts`)
- ❌ Condition 3 FAILS: Event has `userId: null`
- ❓ **Condition 2 SHOULD PASS but is failing**

### Why Condition 2 Is Failing

```typescript
// This query should return [133008] but might be returning []
const userTeamIds = await MembershipRepository.findUserTeamIds({ userId });
```

**Most Likely Cause**: Profile-based session (`upId: "260358"`) is not properly resolving to `userId: 1832840` when querying memberships.

## Diagnostic Queries to Run

### Query 1: Verify profile → user mapping
```sql
-- Does profile 260358 map to userId 1832840?
SELECT 
    p.id as profile_id,
    p.uid as profile_uid,
    p."userId",
    u.id as user_id,
    u.email
FROM "Profile" p
JOIN "users" u ON u.id = p."userId"
WHERE p.id = 260358;
```
**Expected**: `userId` should be `1832840`

### Query 2: Verify membership exists (we already know this passes ✅)
```sql
SELECT * FROM "Membership" 
WHERE "userId" = 1832840 
  AND "teamId" = 133008;
```
**Expected**: Returns OWNER membership with `accepted: true`

### Query 3: Check if other events in team 133008 work
```sql
SELECT 
    id,
    title,
    slug,
    "schedulingType",
    "userId",
    (SELECT COUNT(*) FROM "Host" WHERE "eventTypeId" = "EventType".id) as host_count
FROM "EventType"
WHERE "teamId" = 133008
ORDER BY id;
```
**Purpose**: If ALL events fail → team-wide issue. If only COLLECTIVE with no hosts fail → specific validation issue.

## Next Steps to Debug

### Step 1: Check the diagnostic logs
When you access event 3838918, look for this log output:

```json
{
  "eventTypeId": 3838918,
  "userId": 1832840,  // ← Should be this
  "userTeamIds": [???],  // ← Should include 133008
  "membershipFound": true/false,
  "message": "Direct membership check for team 133008"
}
```

**If `userTeamIds` does NOT include 133008**, we've found the bug!

### Step 2: Test with other events in team 133008
Try accessing a different event type in the same team:
- If **ALL events fail** → The `MembershipRepository.findUserTeamIds` query is broken for this user
- If **only COLLECTIVE with no hosts fails** → There's specific validation for these events

### Step 3: Quick workaround to test
Add yourself as a host to the event:

```sql
INSERT INTO "Host" ("eventTypeId", "userId", "isFixed", "scheduleId")
VALUES (3838918, 1832840, false, NULL);
```

Then try accessing the event again. If this fixes it, we know it's checking the hosts array.

## Most Likely Root Cause (95% confidence)

**The `MembershipRepository.findUserTeamIds({ userId: 1832840 })` query is returning `[]` or not including team `133008`.**

This could be because:
1. **Profile-based context issue**: When session uses `upId: "260358"`, the code might be passing the profile ID instead of user ID to the membership query
2. **OR**: There's a query builder bug in how it resolves team memberships
3. **OR**: The session user ID doesn't match the membership user ID (highly unlikely given the data)

## The Key Question

**When `EventTypeRepository.findById` runs, what userId is being passed to `MembershipRepository.findUserTeamIds`?**
- If it's `1832840` ✅ but returns `[]` → Membership query is broken
- If it's `260358` ❌ → Profile ID is being used instead of user ID
- If it's something else ❌ → Session/context resolution is wrong

