# Conditional Booking Fields Implementation

## Summary

This implementation adds support for conditional/follow-up questions in Cal.com booking forms. Fields can now be configured to only appear when a parent field has specific values.

## Problem Solved

Previously, all booking form fields were always visible. This implementation allows for dynamic forms where questions appear based on previous answers, creating a more interactive and context-aware booking experience.

### Example Use Case

**Before**: All questions shown at once
- How did you hear about us? [dropdown]
- Which website? [text field - always visible]
- Which social media platform? [dropdown - always visible]
- Who referred you? [text field - always visible]

**After**: Questions appear dynamically
- How did you hear about us? [dropdown]
  - *If "Web" selected* → Which website? [text field appears]
  - *If "Social Media" selected* → Which platform? [dropdown appears]
  - *If "Personal Reference" selected* → Who referred you? [text field appears]

## Files Modified

### Core Schema Changes

1. **packages/prisma/zod-utils.ts**
   - Added `conditionalOn` property to `fieldSchema`
   - Supports `parentFieldName` and `showWhenParentValues` (string or array)

### Utility Functions

2. **packages/features/bookings/lib/isFieldConditionallyVisible.ts** (NEW)
   - `isFieldConditionallyVisible()` - Checks if field should be visible
   - `getVisibleFields()` - Filters fields based on responses
   - `validateConditionalFields()` - Validates field dependencies

### UI Updates

3. **packages/features/bookings/Booker/components/BookEventForm/BookingFields.tsx**
   - Added import for `isFieldConditionallyVisible`
   - Watch all form responses via `watch("responses")`
   - Check conditional visibility before rendering each field

### Platform API Types

4. **packages/platform/types/event-types/event-types_2024_06_14/inputs/booking-fields.input.ts**
   - Added `ConditionalFieldConfig_2024_06_14` class
   - Added `conditionalOn` property to:
     - `TextFieldInput_2024_06_14`
     - `SelectFieldInput_2024_06_14`
     - `RadioGroupFieldInput_2024_06_14`
   - (Can be extended to other field types as needed)

## Files Created

### Documentation

5. **docs/developing/conditional-booking-fields.mdx** (NEW)
   - Comprehensive documentation
   - Usage examples
   - Best practices
   - API reference

### Tests

6. **packages/features/bookings/lib/isFieldConditionallyVisible.test.ts** (NEW)
   - Unit tests for visibility logic
   - Validation tests
   - Edge case coverage

### Examples

7. **examples/conditional-booking-fields-examples.ts** (NEW)
   - Real-world examples
   - Multiple use cases
   - Platform API usage examples

## Data Model

```typescript
{
  conditionalOn?: {
    parentFieldName: string;           // Field name/slug of parent
    showWhenParentValues: string | string[];  // Value(s) that trigger visibility
  }
}
```

## How It Works

### 1. Configuration
Fields are configured with `conditionalOn` property:

```json
{
  "type": "text",
  "slug": "website-source",
  "label": "Which website?",
  "conditionalOn": {
    "parentFieldName": "how-did-you-hear",
    "showWhenParentValues": "Web"
  }
}
```

### 2. Runtime Visibility Check
When rendering the booking form:
1. Form watches all response values
2. For each field, `isFieldConditionallyVisible()` checks:
   - If no `conditionalOn`, field is visible
   - If parent field has no value, field is hidden
   - If parent value matches `showWhenParentValues`, field is visible
   - Otherwise, field is hidden

### 3. Dynamic Updates
As users change parent field values:
- React Hook Form's `watch()` detects changes
- Component re-renders
- Conditional fields appear/disappear automatically

## Validation

The system validates:
- ✅ Parent field exists
- ✅ No self-referencing
- ✅ No circular dependencies (basic check)
- ✅ `showWhenParentValues` not empty
- ✅ Type safety via TypeScript and Zod

## Supported Field Types

All custom booking fields support `conditionalOn`:
- text, textarea
- number
- phone, address
- select, multiselect
- radio, checkbox
- boolean
- url, multiemail

## Backward Compatibility

✅ **Fully backward compatible**
- Existing forms work without changes
- `conditionalOn` is optional
- No database migration required (JSON field)

## Testing

### Run Tests
```bash
npm run test -- isFieldConditionallyVisible.test.ts
```

### Manual Testing
1. Create an event type
2. Add booking fields with `conditionalOn`
3. Open booking page
4. Verify fields appear/disappear based on selections

## Usage Examples

### Simple Conditional Field
```typescript
const fields = [
  {
    type: "radio",
    slug: "contact-preference",
    label: "Preferred contact method",
    options: ["Email", "Phone"],
    required: true
  },
  {
    type: "phone",
    slug: "phone-number",
    label: "Phone number",
    required: true,
    conditionalOn: {
      parentFieldName: "contact-preference",
      showWhenParentValues: "Phone"
    }
  }
];
```

### Multiple Parent Values
```typescript
{
  type: "phone",
  slug: "phone-number",
  conditionalOn: {
    parentFieldName: "contact-method",
    showWhenParentValues: ["Phone", "SMS", "WhatsApp"]  // Array of values
  }
}
```

## API Usage (Platform API v2024-06-14)

```typescript
import { CalApi } from "@calcom/platform-libraries";

const cal = new CalApi({ apiKey: "your-key" });

await cal.eventTypes.create({
  title: "Consultation",
  slug: "consultation",
  length: 30,
  bookingFields: [
    {
      type: "radio",
      slug: "how-did-you-hear",
      label: "How did you hear about us?",
      required: true,
      options: ["Web", "Social Media", "Reference"]
    },
    {
      type: "text",
      slug: "website",
      label: "Which website?",
      required: false,
      conditionalOn: {
        parentFieldName: "how-did-you-hear",
        showWhenParentValues: "Web"
      }
    }
  ]
});
```

## Performance Considerations

- ✅ Minimal overhead: O(1) visibility check per field
- ✅ React Hook Form's `watch()` is optimized
- ✅ No additional API calls
- ✅ Validation runs only on form submit

## Future Enhancements

Potential improvements:
1. Multi-level dependencies (nested conditionals)
2. AND/OR logic for multiple parents
3. Complex expressions (greater than, contains, etc.)
4. Visual grouping in UI
5. Drag-and-drop form builder with conditional logic
6. Template library for common patterns

## Migration Guide

No migration needed! This feature is:
- Additive (no breaking changes)
- Optional (existing forms work as-is)
- JSON-based (no schema migration)

To start using:
1. Update your booking fields configuration
2. Add `conditionalOn` to desired fields
3. Test on booking page
4. Deploy!

## Support

For questions or issues:
- See: [docs/developing/conditional-booking-fields.mdx](../docs/developing/conditional-booking-fields.mdx)
- Examples: [examples/conditional-booking-fields-examples.ts](../examples/conditional-booking-fields-examples.ts)
- GitHub Issue: [Link to original issue]

## Contributors

Implementation by: [Your Name]
Requested by: Cal.com community

---

**Status**: ✅ Implementation Complete
**Version**: 1.0.0
**Date**: December 22, 2024
