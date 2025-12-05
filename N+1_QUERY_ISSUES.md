# N+1 Query Issues: Prisma Calls Inside Loops

This document lists all identified instances where Prisma database calls are made inside loops, leading to the N+1 query problem.

## Summary

**Total Issues Found: 10+**

## Issues by File

### 1. `packages/features/tasker/tasks/crm/createCRMEvent.ts`

**Location:** Lines 115-156

**Issue:** `prisma.credential.findUnique` called inside a `for...of` loop iterating over `Object.keys(eventTypeAppMetadata)`

**Code:**
```typescript
for (const appSlug of Object.keys(eventTypeAppMetadata)) {
  // ... validation code ...
  const crmCredential = await prisma.credential.findUnique({
    where: {
      id: app.credentialId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });
  // ... rest of loop ...
}
```

**Fix:** Batch fetch all credentials using `prisma.credential.findMany` with `where: { id: { in: credentialIds } }` before the loop.

---

### 2. `packages/features/credentials/handleDeleteCredential.ts`

**Location:** Lines 280-311

**Issue:** Multiple Prisma operations inside nested loops:
- `prisma.booking.update` inside a `for...of` loop (line 281)
- `prisma.payment.delete` inside a nested `for...of` loop (line 293)
- `prisma.attendee.deleteMany` inside the outer loop (line 300)
- `prisma.bookingReference.updateMany` inside the outer loop (line 306)

**Code:**
```typescript
for (const booking of unpaidBookings) {
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CANCELLED,
      cancellationReason: "Payment method removed",
    },
  });

  for (const payment of booking.payment) {
    await deletePayment(payment.id, credential);
    await prisma.payment.delete({
      where: { id: payment.id },
    });
  }

  await prisma.attendee.deleteMany({
    where: { bookingId: booking.id },
  });

  await prisma.bookingReference.updateMany({
    where: { bookingId: booking.id },
    data: { deleted: true },
  });
  // ... rest of loop ...
}
```

**Fix:** 
- Use `prisma.booking.updateMany` with `where: { id: { in: bookingIds } }`
- Use `prisma.payment.deleteMany` with `where: { id: { in: paymentIds } }`
- Use single `prisma.attendee.deleteMany` with `where: { bookingId: { in: bookingIds } }`
- Use single `prisma.bookingReference.updateMany` with `where: { bookingId: { in: bookingIds } }`

---

### 3. `packages/trpc/server/routers/viewer/availability/team/listTeamAvailability.handler.ts`

**Location:** Lines 75-82

**Issue:** `userRepo.enrichUserWithItsProfileExcludingOrgMetadata` called inside a `for...of` loop, which internally calls `ProfileRepository.findManyForUser` (a Prisma query)

**Code:**
```typescript
for (const membership of memberships) {
  membershipWithUserProfile.push({
    ...membership,
    user: await userRepo.enrichUserWithItsProfileExcludingOrgMetadata({
      user: membership.user,
    }),
  });
}
```

**Fix:** Batch fetch all profiles using `ProfileRepository.findManyForUsers` with all user IDs before the loop, then map them.

---

### 4. `packages/trpc/server/routers/viewer/eventTypes/heavy/update.handler.ts`

**Location:** Lines 432-443

**Issue:** `ctx.prisma.hostGroup.upsert` called inside a `.map()` with `async` callback

**Code:**
```typescript
await Promise.all(
  hostGroups.map(async (group) => {
    await ctx.prisma.hostGroup.upsert({
      where: { id: group.id },
      update: { name: group.name },
      create: {
        id: group.id,
        name: group.name,
        eventTypeId: id,
      },
    });
  })
);
```

**Fix:** While `Promise.all` allows parallel execution, this could still be optimized. Consider using `prisma.$transaction` with individual upserts or batch operations if possible.

---

### 5. `packages/features/ee/workflows/api/scheduleEmailReminders.ts`

**Location:** Lines 50-64

**Issue:** `prisma.workflowReminder.update` called inside a `.map()` with `async` callback

**Code:**
```typescript
const handlePastCancelledReminders = remindersToDelete.map(async (reminder) => {
  try {
    if (reminder.referenceId) {
      await deleteScheduledSend(reminder.referenceId);
    }
  } catch (err) {
    logger.error(`Error deleting scheduled send (ref: ${reminder.referenceId}): ${err}`);
  }

  try {
    await prisma.workflowReminder.update({
      where: { id: reminder.id },
      data: { referenceId: null },
    });
  } catch (err) {
    // ... error handling ...
  }
});
```

**Fix:** Use `prisma.workflowReminder.updateMany` with `where: { id: { in: reminderIds } }` and `data: { referenceId: null }`.

---

### 6. `packages/features/eventtypes/lib/getEventTypesByViewer.ts`

**Location:** Lines 134-144

**Issue:** `userRepo.enrichUserWithItsProfile` called inside nested `.map()` calls with `async` callbacks

**Code:**
```typescript
children: await Promise.all(
  (eventType.children || []).map(async (c) => ({
    ...c,
    users: await Promise.all(
      c.users.map(
        async (u) =>
          await userRepo.enrichUserWithItsProfile({
            user: u,
          })
      )
    ),
  }))
),
```

**Fix:** Collect all user IDs from all children, batch fetch profiles, then map them back.

---

### 7. `packages/features/bookings/lib/handleSeats/cancel/cancelAttendeeSeat.ts`

**Location:** Lines 86-127

**Issue:** `getDelegationCredentialOrFindRegularCredential` called inside a `for...of` loop, which may call `CredentialRepository.findCredentialForCalendarServiceById` (a Prisma query)

**Code:**
```typescript
for (const reference of bookingToDelete.references) {
  if (reference.credentialId || reference.delegationCredentialId) {
    const credential = await getDelegationCredentialOrFindRegularCredential({
      id: {
        credentialId: reference.credentialId,
        delegationCredentialId: reference.delegationCredentialId,
      },
      delegationCredentials,
    });
    // ... rest of loop ...
  }
}
```

**Fix:** Collect all credential IDs, batch fetch them before the loop, then map them.

---

### 8. `packages/trpc/server/routers/viewer/workflows/update.handler.ts`

**Location:** Lines 258-395

**Issue:** `WorkflowReminderRepository.findWorkflowRemindersByStepId` called inside a `.map()` with `async` callback (line 274), which likely makes Prisma queries

**Code:**
```typescript
await Promise.all(
  userWorkflow.steps.map(async (oldStep) => {
    // ... code ...
    const remindersFromStep = await WorkflowReminderRepository.findWorkflowRemindersByStepId(oldStep.id);
    // ... rest of loop ...
  })
);
```

**Fix:** Collect all step IDs, batch fetch reminders using `findMany` with `where: { stepId: { in: stepIds } }`, then group by stepId.

---

### 9. `packages/features/bookings/lib/service/RecurringBookingService.ts`

**Location:** Lines 68-123

**Issue:** While this file has a `for` loop calling `regularBookingService.createBooking`, this may not be a direct Prisma N+1 issue if the service batches operations internally. However, it's worth reviewing if `createBooking` makes individual Prisma calls per iteration.

**Code:**
```typescript
for (let key = isRoundRobin ? 1 : 0; key < data.length; key++) {
  const booking = data[key];
  // ... setup code ...
  const eachRecurringBooking = await promiseEachRecurringBooking;
  createdBookings.push(eachRecurringBooking);
  // ... rest of loop ...
}
```

**Note:** This may be acceptable if `createBooking` is designed to handle individual bookings, but should be reviewed for optimization opportunities.

---

### 10. `packages/features/bookings/lib/handleSeats/lib/lastAttendeeDeleteBooking.ts`

**Location:** Lines 33-48 (similar pattern to #7)

**Issue:** `getDelegationCredentialOrFindRegularCredential` called inside a loop, which may call Prisma

**Code:**
```typescript
for (const reference of originalRescheduledBooking.references) {
  if (reference.credentialId || reference.delegationCredentialId) {
    const credential = await getDelegationCredentialOrFindRegularCredential({
      id: {
        credentialId: reference.credentialId,
        delegationCredentialId: reference.delegationCredentialId,
      },
      delegationCredentials,
    });
    // ... rest of loop ...
  }
}
```

**Fix:** Same as #7 - batch fetch credentials before the loop.

---

## Additional Patterns to Check

The following patterns were found but need further investigation to confirm if they cause N+1 issues:

- Files using `.map(async ...)` with Prisma calls inside (many instances found)
- Files with `for...of` loops that may contain Prisma calls (need manual review)
- Repository methods called inside loops that may internally use Prisma

## Recommendations

1. **Batch Operations:** Replace individual Prisma calls in loops with batch operations using `findMany`, `updateMany`, `deleteMany`, etc.

2. **Pre-fetch Data:** Collect all IDs needed before loops, fetch them in a single query, then map results back.

3. **Use Transactions:** For multiple related operations, consider using `prisma.$transaction` with batched operations.

4. **Review Repository Methods:** Check if repository methods called in loops can be optimized to accept arrays of IDs.

5. **Add Monitoring:** Consider adding query logging to identify N+1 issues in production.

## Next Steps

1. Prioritize fixes based on:
   - Frequency of execution (hot paths)
   - Number of iterations (larger loops = bigger impact)
   - User-facing impact

2. Create tickets for each issue with:
   - File path and line numbers
   - Current code snippet
   - Proposed fix
   - Performance impact estimate

3. Consider adding ESLint rules or static analysis to catch these patterns in CI/CD.

