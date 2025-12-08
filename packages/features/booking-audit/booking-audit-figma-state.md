# Booking Audit Logs - Figma Design Implementation State

## Figma Design Reference
- **Design URL**: https://www.figma.com/design/PEej7KVGX4wYGVfo4RWHjs/Booking-Audit?node-id=1-2034
- **Implementation File**: `apps/web/modules/booking/logs/views/booking-logs-view.tsx`

## Currently Implemented

### 1. Actor Display with Avatar and Role Label
- **Status**: ✅ Implemented
- **Details**: 
  - Avatar icon displays before actor name (when `displayAvatar` is available)
  - Role label shows after actor name (e.g., "(Guest)", "(Attendee)")
  - Only shows role label for GUEST and ATTENDEE actor types

### 2. Expanded Details - Type Value Color
- **Status**: ✅ Implemented (color only)
- **Details**: 
  - Type values are displayed in green color (`text-[#096638]`)
  - **Note**: The actual type value (currently showing "RECORD_UPDATED") needs to be fixed later to show more meaningful values like "manual", "round_robin", "salesforce", etc.

### 3. Expanded Details - Actor Display
- **Status**: ✅ Implemented
- **Details**: 
  - Shows `actor.displayName` instead of `actor.type` in expanded details section
  - Falls back to `actor.type` if displayName is not available

### 4. Hover States for CTAs
- **Status**: ✅ Implemented
- **Details**: 
  - "Show details" / "Hide details" button has hover state
  - "JSON" toggle button has hover state

## Deferred Items

### 1. Action Titles (Descriptive Format)
- **Status**: ⏸️ Deferred
- **Reason**: Will be handled separately in a different way
- **Figma Design**: Shows contextual info inline (e.g., "Rescheduled call Mar 18, 2026 → Mar 19, 2026", "Assigned Marie Louise")
- **Current**: Generic labels (e.g., "Reschedule Requested", "Attendee Added")

### 2. Three-dot Menu (Kebab Menu)
- **Status**: ⏸️ Deferred
- **Reason**: Implementation approach is not clear yet
- **Figma Design**: Each log entry has a kebab menu (ellipsis) on the right side
- **Current**: Not implemented

### 3. JSON Display with Line Numbers and Syntax Highlighting
- **Status**: ⏸️ Deferred
- **Reason**: Larger task, will be tackled later
- **Figma Design**: 
  - Line numbers on the left side
  - Syntax-highlighted values (green for strings, orange for booleans, etc.)
- **Current**: Plain pre-formatted JSON

### 4. View Webhook Logs Link
- **Status**: ⏸️ Deferred
- **Reason**: Webhook logs feature is not supported yet
- **Figma Design**: Shows "View webhook logs ↗" link with external icon for WEBHOOK_TRIGGER entries
- **Current**: Not implemented

## Future Fixes Needed

### Type Value Display
- **Current Issue**: Type values show "RECORD_UPDATED" which doesn't make semantic sense
- **Expected Values**: Should show meaningful values like:
  - "manual" (for manual reassignments)
  - "round_robin" (for round-robin assignments)
  - "salesforce" (for Salesforce webhook triggers)
  - etc.
- **Status**: Color is implemented, but the actual value mapping needs to be fixed
- **Note**: The type value should come from the audit log data structure, not the generic record type

## Implementation Notes

- Avatar component is imported from `@calcom/ui/components/avatar`
- Actor role labels are determined by `

()` helper function
- Type value color uses `text-[#096638]` (green) to match Figma design
- Hover states use Tailwind classes (`hover:bg-emphasis`, etc.)

## Testing Checklist

- [x] Avatar displays when `displayAvatar` is available
- [x] Role label shows for Guest/Attendee actors
- [x] Type value is green in expanded details
- [x] Actor shows display name in expanded details
- [x] Hover states work on "Show details" button
- [x] Hover states work on "JSON" toggle button
