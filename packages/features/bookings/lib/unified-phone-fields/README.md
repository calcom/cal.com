# Unified Phone Fields

## Phone Fields in the Booking Form

There are four distinct phone-related mechanisms in the booking form. Each has different origins, storage, and rendering behavior.

### 1. Attendee Phone Number (`attendeePhoneNumber`)

A predefined system field added by `getBookingFields` (`lib/getBookingFields.ts`). Its `editable` is `"system-but-optional"`, meaning the organizer can toggle it on/off.

- **Hidden by default.** Auto-toggled visible when the organizer switches Confirmation type from Email to Phone, or when workflow sources are merged into it (see Unified Phone Fields below).
- Can also be manually enabled by the organizer in the event type's booking fields configuration.

### 2. Location Field's Phone Option

This is **not** a booking field. When a location of type `"phone"` (attendee phone) is configured, the Booker renders an inline phone input on the fly.

- Rendered by `FormBuilderField` → `Components.tsx` → `RadioInputWithLabel`.
- The value is stored as location JSON: `{"value": "phone", "optionValue": "+91..."}`.
- Options are derived at runtime from the event type's `locations` via `getLocationOptionsForSelect`.

### 3. SMS Reminder Workflow (`smsReminderNumber`)

Added when a workflow with `SMS_ATTENDEE` or `WHATSAPP_ATTENDEE` steps is attached to the event type.

- **Read time (backward compat):** `getBookingFields` checks if the field already exists in DB-stored `bookingFields`. If missing (pre-workflow events), it inserts the field after the location field for backward compatibility.
- **Write time:** Workflows add/update the field via `upsertBookingField` in `packages/trpc/server/routers/viewer/workflows/util.ts`.
- **Rendering:** In the Booker, the field is hidden when the location's phone option is already chosen (handled in `BookingFields.tsx`).
- **Sources:** Each workflow step creates a `FieldSource` with `type: "workflow"` and `subType: "sms"`.

### 4. Cal.ai Workflow (`aiAgentCallPhoneNumber`)

Added when a Cal.ai phone-call workflow is attached.

- No backward compatibility insertion needed (newer feature — field only exists when a Cal.ai workflow adds it).
- **Write time:** Same `upsertBookingField` path in `packages/trpc/server/routers/viewer/workflows/util.ts`.
- **Sources:** Each workflow step creates a `FieldSource` with `type: "workflow"` and `subType: "calai"`.

---

## Unified Phone Fields (`shouldMergePhoneSystemFields`)

When enabled, the separate `smsReminderNumber` and `aiAgentCallPhoneNumber` fields are merged into a single `attendeePhoneNumber` field. The booker sees one phone input; the number routes to all configured services.

### Event Type Setting

- **Column:** `EventType.shouldMergePhoneSystemFields` (`Boolean?`, default `true`) in `schema.prisma`.
- **UI toggle:** Advanced tab (`apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx`). Shown when phone-based workflows exist on the event type.

### How Merging Works

`mergePhoneFieldSources()` in `lib/managePhoneFields.ts`:

1. Extracts workflow sources from the non-target fields (`smsReminderNumber`, `aiAgentCallPhoneNumber`).
2. Tags each source with its `subType` (`"sms"` or `"calai"`) using `SUB_TYPE_MAP`.
3. Consolidates all tagged sources into the `attendeePhoneNumber` field's `sources` array.
4. Removes the individual non-target fields from `bookingFields`.
5. Un-hides `attendeePhoneNumber` and marks it required if any merged source requires it.

Called by `getBookingFieldsWithSystemFields` (server-side) when `shouldMergePhoneSystemFields` is enabled.

### How Splitting Works

`splitPhoneFieldSources()` in `lib/managePhoneFields.ts` — the inverse operation:

1. Reads `subType` on each source in `attendeePhoneNumber`.
2. Moves `"sms"` sources back to a `smsReminderNumber` field (created if missing).
3. Moves `"calai"` sources back to an `aiAgentCallPhoneNumber` field (created if missing).
4. Restores `attendeePhoneNumber`'s hidden state if no workflow sources remain.

Used when the organizer toggles `shouldMergePhoneSystemFields` off to restore individual fields.

### Rescheduling & Mode Toggling

`resolveAndMutatePhoneFieldValues()` in `lib/resolvePhoneFieldValues.ts` handles the case where a booking was created in one mode (unified or split) and is rescheduled in another. It:

1. **Backfills** `responses.smsReminderNumber` from the DB `booking.smsReminderNumber` column (older bookings stored it only in the column).
2. **Resolves** the canonical `smsReminderNumber` value for DB persistence.
3. **Populates** `responses.attendeePhoneNumber` from available phone sources when unified mode is enabled.

Called from:
- **Client:** `Booker/hooks/useInitialFormValues.ts` — pre-populates the reschedule form.
- **Server (pre-validation):** `lib/handleNewBooking/getBookingData.ts` — mutates responses before schema validation to handle stale booker fallbacks.
- **Server (post-validation):** `lib/service/RegularBookingService.ts` — resolves the `smsReminderNumber` DB column value after booking data extraction.

### DB Column Resolution (Phase 2 Priority)

The `smsReminderNumber` DB column is resolved with a fallback chain that differs by mode:

**Unified enabled:** `attendeePhoneNumber` → `smsReminderNumber` → `aiAgentCallPhoneNumber` → DB column → `undefined`
**Unified disabled:** `smsReminderNumber` → `attendeePhoneNumber` (fallback) → `undefined`

When unified is enabled, all phone sources feed into one number. When disabled, fields are independent but fall back to `attendeePhoneNumber` if their own value is missing — this handles stale bookers or API V2 requests that only send `attendeePhoneNumber` after unified was just toggled off.

### Scenarios by Request Source

#### API V2 (unified enabled) — single field sent

| Scenario | `smsReminderNumber` DB column | `attendeePhoneNumber` response |
|---|---|---|
| Only `attendeePhoneNumber` (**happy path**) | = `attendeePhoneNumber` | as-is |
| Only `smsReminderNumber` | = `smsReminderNumber` | populated from `smsReminderNumber` |
| Only `aiAgentCallPhoneNumber` | = `aiAgentCallPhoneNumber` | populated from `aiAgentCallPhoneNumber` |

#### API V2 (unified enabled) — conflicting values

| Fields present | `smsReminderNumber` DB column | Rationale |
|---|---|---|
| `attendeePhoneNumber` + any other(s) | `attendeePhoneNumber` wins | Canonical unified field |
| `smsReminderNumber` + `aiAgentCallPhoneNumber` (no `attendeePhoneNumber`) | `smsReminderNumber` wins | More established; maps to DB column |

#### WebApp (unified enabled)

- Booker always prefills `attendeePhoneNumber` → same as API happy path above.
- **Stale booker after toggle-off:** already-loaded bookers may still submit only `attendeePhoneNumber`. `getBookingData` calls `resolveAndMutatePhoneFieldValues` with `bookingFields` BEFORE schema validation, which backfills `smsReminderNumber`/`aiAgentCallPhoneNumber` from `attendeePhoneNumber` for fields present in `bookingFields`, so required-field checks pass. This is the same `RegularBookingService.createBooking` path shared with API V2 — no separate webapp handling needed.

#### API V2 (unified disabled) — single field sent

| Scenario | `smsReminderNumber` | `calAiPhoneNumber` | Notes |
|---|---|---|---|
| Only `attendeePhoneNumber` | backfilled from `attendeePhoneNumber` (if field in `bookingFields`) | backfilled from `attendeePhoneNumber` (if field in `bookingFields`) | Stale booker or API client that only knows about `attendeePhoneNumber` |
| Only `smsReminderNumber` | as-is | `undefined` | Normal split-mode booking |
| Only `aiAgentCallPhoneNumber` | `undefined` | as-is | No cross-populate between non-attendee fields |

#### API V2 (unified disabled) — conflicting values

| Fields present | Behavior | Rationale |
|---|---|---|
| `attendeePhoneNumber` + `smsReminderNumber` (different) | Each keeps its own value | Own value takes precedence over fallback |
| `attendeePhoneNumber` + `aiAgentCallPhoneNumber` (different) | Each keeps its own value | Own value takes precedence over fallback |
| `smsReminderNumber` + `aiAgentCallPhoneNumber` (different, no `attendeePhoneNumber`) | Each keeps its own value | No cross-populate between non-attendee fields |

#### WebApp (unified disabled)

- **Normal:** Booker shows individual `smsReminderNumber` and/or `aiAgentCallPhoneNumber` fields — each submitted independently.
- **Stale booker:** sends only `attendeePhoneNumber` → `getBookingData` pre-validation backfills the other fields from `attendeePhoneNumber` for fields present in `bookingFields`.

> **Stale booker definition:** When the organizer toggles `shouldMergePhoneSystemFields` off, any booker page that was already loaded in a user's browser still has the unified form (single `attendeePhoneNumber` field). That booker submits only `attendeePhoneNumber` without `smsReminderNumber`/`aiAgentCallPhoneNumber`, even though the server now expects those individual fields.

#### Field config changes on toggle-off

1. **Field config:** `splitPhoneFieldSources()` restores individual fields from merged `attendeePhoneNumber` sources.
2. **Rescheduling old bookings:** DB column `booking.smsReminderNumber` bridges the gap.
3. **New bookings:** Each field is independent, falls back to `attendeePhoneNumber` only if its own value is missing.

### DB Storage

- `booking.smsReminderNumber` column always receives the resolved phone number (regardless of unified/split mode).
- `booking.responses` JSON stores whichever fields were active at submission time (`attendeePhoneNumber` in unified mode, or `smsReminderNumber`/`aiAgentCallPhoneNumber` in split mode).

---

## Key Files

| File | Description |
|------|-------------|
| `lib/getBookingFields.ts` | Assembles system + custom booking fields; inserts phone fields from workflows |
| `lib/managePhoneFields.ts` | `mergePhoneFieldSources` / `splitPhoneFieldSources` — unified phone field logic |
| `lib/resolvePhoneFieldValues.ts` | Cross-populates phone values across modes; mutates responses for fallback in both enabled and disabled paths |
| `lib/handleNewBooking/getBookingData.ts` | Extracts and validates booking data; calls `resolveAndMutatePhoneFieldValues` with `bookingFields` BEFORE schema validation for stale-booker fallback |
| `lib/service/RegularBookingService.ts` | Main booking creation service; calls `resolveAndMutatePhoneFieldValues` AFTER validation (without `bookingFields`) to resolve `smsReminderNumber` DB column value |
| `lib/getBookingResponsesSchema.ts` | Zod schema for validating booking form responses |
| `Booker/hooks/useInitialFormValues.ts` | Sets initial form values; calls `resolveAndMutatePhoneFieldValues` client-side |
| `Booker/hooks/useBookingForm.ts` | Manages booking form state including unified phone field toggle |
| `types.ts` | Shared booking types including `shouldMergePhoneSystemFields` on event type |


## TODOs

- [x] **Fix stale booker fallback on server side:** `getBookingData` (in `lib/handleNewBooking/getBookingData.ts`) now calls `resolveAndMutatePhoneFieldValues` with `bookingFields` BEFORE schema validation, and the disabled path mutates responses with the `attendeePhoneNumber` fallback so required-field checks pass.