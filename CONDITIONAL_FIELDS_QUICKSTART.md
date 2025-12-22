# Conditional Booking Fields - Quick Start Guide

## What Was Implemented?

✅ **Conditional/Follow-up Questions** feature for Cal.com booking forms

This allows booking fields to appear dynamically based on answers to previous questions, creating more intelligent and contextual booking experiences.

## Real-World Example

**Scenario**: You ask "How did you hear about us?"

**Before this feature:**
- All follow-up questions shown at once (confusing)
- Users had to ignore irrelevant questions
- Forms looked cluttered

**After this feature:**
```
👤 How did you hear about us?
   ○ Web
   ○ Social Media  ← [User selects this]
   ○ Personal Reference
   ○ Other

   [Conditional field appears below]
   📱 Which social media platform?
      ▼ Twitter/X
        Facebook
        LinkedIn
        Instagram
        Mastodon
```

Only relevant follow-up questions appear!

## How to Use

### 1. Basic Example (JSON Configuration)

```json
{
  "bookingFields": [
    {
      "type": "radio",
      "slug": "how-did-you-hear",
      "label": "How did you hear about us?",
      "required": true,
      "options": ["Web", "Social Media", "Personal Reference"]
    },
    {
      "type": "text",
      "slug": "which-website",
      "label": "Which website?",
      "required": false,
      "conditionalOn": {
        "parentFieldName": "how-did-you-hear",
        "showWhenParentValues": "Web"
      }
    }
  ]
}
```

### 2. Multiple Trigger Values

Show a field when parent has ANY of multiple values:

```json
{
  "type": "phone",
  "slug": "phone-number",
  "label": "Your phone number",
  "conditionalOn": {
    "parentFieldName": "contact-method",
    "showWhenParentValues": ["Phone", "SMS", "WhatsApp"]
  }
}
```

### 3. Via Platform API (TypeScript)

```typescript
import { CalApi } from "@calcom/platform-libraries";

const cal = new CalApi({ apiKey: "cal_live_..." });

await cal.eventTypes.create({
  title: "Product Demo",
  slug: "product-demo",
  length: 30,
  bookingFields: [
    {
      type: "select",
      slug: "company-size",
      label: "Company size",
      required: true,
      options: ["1-10", "11-50", "51-200", "201+"]
    },
    {
      type: "text",
      slug: "company-name",
      label: "Company name",
      required: true,
      conditionalOn: {
        parentFieldName: "company-size",
        showWhenParentValues: ["51-200", "201+"]
      }
    }
  ]
});
```

## Configuration Properties

```typescript
conditionalOn: {
  // The slug/name of the parent field
  parentFieldName: string;
  
  // Value(s) that make this field visible
  // Can be a single string or array of strings
  showWhenParentValues: string | string[];
}
```

## Supported Field Types

✅ All field types support `conditionalOn`:
- text, textarea
- select, multiselect
- radio, checkbox
- number, phone
- address, url
- boolean, multiemail

## Rules & Validation

The system automatically validates:
1. ✅ Parent field must exist
2. ✅ Field cannot be conditional on itself
3. ✅ No circular dependencies
4. ✅ At least one trigger value required

## Common Patterns

### Pattern 1: Service Type Selection
```json
[
  {
    "type": "radio",
    "slug": "service",
    "label": "Service type",
    "options": ["Consultation", "Training", "Support"]
  },
  {
    "type": "number",
    "slug": "attendees",
    "label": "Number of attendees",
    "conditionalOn": {
      "parentFieldName": "service",
      "showWhenParentValues": "Training"
    }
  }
]
```

### Pattern 2: Contact Preference
```json
[
  {
    "type": "checkbox",
    "slug": "contact-methods",
    "label": "Contact preferences",
    "options": ["Email", "Phone", "SMS"]
  },
  {
    "type": "phone",
    "slug": "phone",
    "label": "Phone number",
    "conditionalOn": {
      "parentFieldName": "contact-methods",
      "showWhenParentValues": ["Phone", "SMS"]
    }
  }
]
```

### Pattern 3: Urgency-Based Questions
```json
[
  {
    "type": "select",
    "slug": "urgency",
    "label": "How urgent?",
    "options": ["Low", "Medium", "High", "Critical"]
  },
  {
    "type": "textarea",
    "slug": "emergency-details",
    "label": "Describe the emergency",
    "required": true,
    "conditionalOn": {
      "parentFieldName": "urgency",
      "showWhenParentValues": "Critical"
    }
  }
]
```

## Testing Your Implementation

### 1. Create Event Type with Conditional Fields
```bash
# Via UI: Event Types → New → Advanced → Booking Fields
# OR via API (see examples above)
```

### 2. Test on Booking Page
1. Navigate to your event type's booking page
2. Select different parent field values
3. Verify conditional fields appear/disappear
4. Submit form to verify validation works

### 3. Expected Behavior
- ✅ Conditional field hidden initially
- ✅ Appears when parent value matches
- ✅ Disappears when parent value changes
- ✅ Required validation only applies when visible
- ✅ Value preserved when field is hidden

## Files to Reference

📁 **Implementation Files:**
- `packages/prisma/zod-utils.ts` - Schema definition
- `packages/features/bookings/lib/isFieldConditionallyVisible.ts` - Visibility logic
- `packages/features/bookings/Booker/components/BookEventForm/BookingFields.tsx` - UI integration

📚 **Documentation:**
- `docs/developing/conditional-booking-fields.mdx` - Full documentation
- `examples/conditional-booking-fields-examples.ts` - Code examples
- `CONDITIONAL_FIELDS_IMPLEMENTATION.md` - Technical details

🧪 **Tests:**
- `packages/features/bookings/lib/isFieldConditionallyVisible.test.ts`

## Best Practices

### ✅ DO:
- Keep conditional logic simple (1-2 levels max)
- Place parent fields before their children
- Use clear, descriptive field labels
- Make conditional fields optional when possible
- Test all possible paths through your form

### ❌ DON'T:
- Create circular dependencies
- Nest conditionals more than 2-3 levels deep
- Make critical required fields conditional
- Use complex validation on conditional fields
- Hide fields that users have already filled

## Troubleshooting

### Field not appearing?
- ✓ Check parent field name matches exactly (case-sensitive)
- ✓ Verify parent value matches trigger value
- ✓ Confirm parent field is before conditional field
- ✓ Check browser console for validation errors

### Field still showing?
- ✓ Ensure `conditionalOn` is properly formatted
- ✓ Verify parent value doesn't match any trigger values
- ✓ Clear form and try again

### Validation errors?
- ✓ Run `validateConditionalFields()` on your configuration
- ✓ Check for circular dependencies
- ✓ Verify all referenced parent fields exist

## Migration from Static Forms

**No changes needed!** This feature is:
- ✅ Fully backward compatible
- ✅ Optional (existing forms work unchanged)
- ✅ Additive (no breaking changes)

To upgrade existing forms:
1. Identify related questions
2. Choose parent-child relationships
3. Add `conditionalOn` to child fields
4. Test thoroughly
5. Deploy!

## Advanced Use Cases

See `examples/conditional-booking-fields-examples.ts` for:
- Multi-step service selection
- Dynamic contact forms
- Event-specific questionnaires
- Complex branching logic

## Support & Feedback

- 📖 Full docs: `docs/developing/conditional-booking-fields.mdx`
- 💻 Code examples: `examples/conditional-booking-fields-examples.ts`
- 🐛 Found a bug? Open a GitHub issue
- 💡 Feature request? Discussion welcome!

## Summary

This implementation adds a powerful `conditionalOn` property to booking fields, enabling dynamic, context-aware forms that only show relevant questions to users. It's:

- ✅ **Easy to use** - Simple JSON configuration
- ✅ **Flexible** - Works with all field types
- ✅ **Validated** - Automatic dependency checking
- ✅ **Performant** - No extra API calls
- ✅ **Compatible** - Works with existing forms
- ✅ **Well-tested** - Comprehensive test coverage

**Start using it today to create smarter booking forms!** 🚀
