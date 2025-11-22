# Contributing: Follow-up Questions Feature

Thank you for your interest in contributing the follow-up questions feature to Cal.com! This guide will help you implement conditional field logic for booking forms.

## 📋 Quick Overview

This feature adds the ability to show/hide form fields based on answers to previous questions. For example:
- Primary question: "How did you hear about us?" (select: web, print, social media, personal reference)
- Follow-up for "web": Text field asking "Source web site"
- Follow-up for "social media": Dropdown asking which platform

## 🎯 Implementation Checklist

- [ ] Read through the full implementation guide
- [ ] Set up your Cal.com development environment
- [ ] Create a feature branch: `git checkout -b feature/follow-up-questions`
- [ ] Implement schema changes
- [ ] Create utility functions
- [ ] Update components
- [ ] Write tests
- [ ] Test manually with real forms
- [ ] Update documentation
- [ ] Submit pull request

## 📂 Files to Modify/Create

### New Files
1. ✅ **`packages/app-store/routing-forms/lib/fieldDependencies.ts`**
   - Core utility functions for evaluating field dependencies
   - Already created as reference implementation

2. ✅ **`packages/app-store/routing-forms/lib/__tests__/fieldDependencies.test.ts`**
   - Unit tests for dependency evaluation
   - Already created with comprehensive test cases

### Files to Modify

3. **`packages/prisma/zod-utils.ts`** (around line 1050)
   - Add `dependsOn` and `dependencyLogic` to `baseFieldSchema`
   - See implementation guide for exact code

4. **`packages/app-store/routing-forms/zod.ts`** (around line 7)
   - Add conditional logic properties to `zodNonRouterField`
   - See implementation guide for exact code

5. **`packages/app-store/routing-forms/components/FormInputFields.tsx`**
   - Import `shouldShowField` utility
   - Add conditional rendering check
   - See `FormInputFields.EXAMPLE.tsx` for reference

6. **`packages/app-store/routing-forms/types/types.d.ts`**
   - Add `FieldDependency` type if needed
   - Type definitions should flow from zod schemas

## 🚀 Step-by-Step Implementation

### Step 1: Understand the Current Architecture

Cal.com's routing forms use:
- **Zod schemas** for validation and type safety
- **JSON storage** in PostgreSQL for dynamic form configurations  
- **React components** for rendering forms
- **React Awesome Query Builder** for routing logic

The form fields are stored as JSON, so no database migration is needed!

### Step 2: Add Schema Support

#### In `packages/prisma/zod-utils.ts`:

```typescript
// Add after the existing baseFieldSchema properties (around line 1050)

export const fieldDependencySchema = z.object({
  fieldId: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'any_of', 'none_of']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

// Then update baseFieldSchema to include:
export const baseFieldSchema = z.object({
  // ... existing properties ...
  
  dependsOn: z.array(fieldDependencySchema).optional(),
  dependencyLogic: z.enum(['AND', 'OR']).default('AND').optional(),
});
```

#### In `packages/app-store/routing-forms/zod.ts`:

```typescript
export const zodNonRouterField = z.object({
  // ... existing properties ...
  
  dependsOn: z.array(z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'any_of', 'none_of']),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })).optional(),
  dependencyLogic: z.enum(['AND', 'OR']).default('AND').optional(),
});
```

### Step 3: Use the Utility Functions

The utility functions in `fieldDependencies.ts` are already created. They provide:

- `evaluateDependency()` - Checks if a single condition is met
- `shouldShowField()` - Determines if a field should be visible
- `getVisibleFields()` - Filters fields based on current responses
- `validateVisibleFields()` - Validates only visible required fields
- `detectCircularDependencies()` - Prevents infinite loops
- `sortFieldsByDependencies()` - Orders fields correctly

### Step 4: Update FormInputFields Component

In `packages/app-store/routing-forms/components/FormInputFields.tsx`:

```typescript
// 1. Add import
import { shouldShowField } from "../lib/fieldDependencies";

// 2. In the component, add this check before rendering each field:
if (!shouldShowField(field, response)) {
  return null;
}
```

See `FormInputFields.EXAMPLE.tsx` for the complete implementation.

### Step 5: Test Your Changes

#### Unit Tests
```bash
# Run the field dependencies tests
yarn test packages/app-store/routing-forms/lib/__tests__/fieldDependencies.test.ts
```

#### Manual Testing

1. Start Cal.com locally
2. Create a new routing form
3. Add fields with dependencies (you may need to manually edit the form JSON initially)
4. Test that fields show/hide correctly

Example test form configuration:
```json
{
  "fields": [
    {
      "id": "source",
      "label": "How did you hear about us?",
      "type": "select",
      "required": true,
      "options": [
        { "id": "web", "label": "Web" },
        { "id": "print", "label": "Print" },
        { "id": "social", "label": "Social Media" },
        { "id": "reference", "label": "Personal Reference" }
      ]
    },
    {
      "id": "website",
      "label": "Which website?",
      "type": "text",
      "required": true,
      "dependsOn": [
        {
          "fieldId": "source",
          "operator": "equals",
          "value": "web"
        }
      ]
    },
    {
      "id": "social_platform",
      "label": "Which social media platform?",
      "type": "select",
      "required": true,
      "options": [
        { "id": "twitter", "label": "X/Twitter" },
        { "id": "mastodon", "label": "Mastodon" },
        { "id": "facebook", "label": "Facebook" },
        { "id": "other", "label": "Other" }
      ],
      "dependsOn": [
        {
          "fieldId": "source",
          "operator": "equals",
          "value": "social"
        }
      ]
    }
  ]
}
```

## 🧪 Testing Strategy

### Unit Tests
- ✅ Test all operators (equals, not_equals, contains, etc.)
- ✅ Test AND/OR logic
- ✅ Test with missing field responses
- ✅ Test validation of visible vs hidden fields
- ✅ Test circular dependency detection

### Integration Tests
- Test full form submission flow
- Test with routing logic
- Test with various field types
- Test server-side validation

### Manual Tests
- Create forms with conditional fields
- Test on desktop and mobile
- Test with different user roles
- Test with existing bookings

## 🎨 Future Enhancements (Phase 2)

After the core feature is working, consider:

1. **Visual Field Builder UI**
   - Drag-and-drop dependency configuration
   - Visual dependency graph
   - Dependency preview

2. **Advanced Conditions**
   - Numeric comparisons (greater than, less than)
   - Date comparisons
   - Regular expression matching
   - Complex nested conditions

3. **Field Actions**
   - Copy values from other fields
   - Calculated fields
   - Dynamic default values

4. **Performance Optimizations**
   - Memoization for large forms
   - Lazy evaluation of dependencies
   - Virtualized rendering for many fields

## 📝 Documentation Updates

Update these files:
- `packages/app-store/routing-forms/README.md` - Add usage examples
- API documentation - Document new field properties
- User documentation - How to create conditional fields

## 🐛 Common Issues & Solutions

### Issue: Fields not hiding/showing
**Solution**: Check that `shouldShowField` is imported and called correctly. Verify the response object has the expected structure.

### Issue: TypeScript errors
**Solution**: Ensure all type definitions are updated. The types should flow from the Zod schemas automatically.

### Issue: Validation errors on hidden fields
**Solution**: Use `validateVisibleFields` instead of validating all fields. Hidden fields should not be required.

### Issue: Performance with many fields
**Solution**: Consider memoizing the `shouldShowField` calls or using React.memo for field components.

## 📚 Resources

- **Main Implementation Guide**: See `FOLLOW_UP_QUESTIONS_IMPLEMENTATION.md`
- **Cal.com Contributing Guide**: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Cal.com Discord**: https://cal.com/slack
- **Routing Forms Code**: `packages/app-store/routing-forms/`

## 🤝 Getting Help

If you get stuck:

1. Check the implementation guide for detailed code examples
2. Review the test files for usage examples
3. Ask in the Cal.com Discord #contributors channel
4. Look at similar conditional logic in the codebase
5. Create a draft PR and ask for feedback

## ✅ Pull Request Checklist

Before submitting your PR:

- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Code follows Cal.com style guidelines
- [ ] TypeScript types are correct
- [ ] No console.log or debug code
- [ ] Documentation is updated
- [ ] Manually tested on local environment
- [ ] Tested with existing routing forms (backwards compatibility)
- [ ] Performance impact considered
- [ ] Security implications reviewed

## 📋 PR Description Template

```markdown
## Description
Adds support for conditional follow-up questions in routing forms. Fields can now be shown/hidden based on answers to previous questions.

## Changes
- Added `dependsOn` and `dependencyLogic` properties to field schema
- Created utility functions for evaluating field dependencies
- Updated FormInputFields component to conditionally render fields
- Added comprehensive unit tests
- Added validation logic for visible fields only

## Example Usage
[Include screenshot or example JSON of a form with conditional fields]

## Testing
- [ ] Unit tests pass
- [ ] Manually tested conditional field display
- [ ] Tested validation with required conditional fields
- [ ] Tested backwards compatibility with existing forms

## Related Issues
Closes #[issue number]

## Screenshots
[If applicable, add screenshots showing conditional fields in action]
```

## 🎉 Thank You!

Your contribution will help thousands of Cal.com users create better, more intelligent booking forms. We appreciate your time and effort!

Questions? Comments? Reach out in the Cal.com community or comment on your PR.

---

**Happy Coding! 🚀**
