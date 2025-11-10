# Follow-up Questions Feature Implementation Guide

## Overview
This document outlines the implementation for adding conditional "follow-up questions" to Cal.com's booking request forms. This feature allows form creators to show/hide questions based on answers to previous questions.

## Use Case Example
- **Primary Question**: "How did you hear about us?"
  - Options: "web", "print", "social media", "personal reference"
- **Follow-up Questions**:
  - If "web" → Show text field: "Source web site"
  - If "social media" → Show dropdown: "Social media site" (X/Twitter, Mastodon, Facebook, Other)

## Architecture Overview

The implementation touches these key areas:
1. **Field Schema** - Add conditional logic properties
2. **Form Rendering** - Conditional field visibility
3. **Validation** - Ensure dependent fields are validated correctly
4. **UI/UX** - Field builder interface for setting conditions

## Implementation Steps

### 1. Extend Field Schema with Conditional Logic

**File**: `packages/prisma/zod-utils.ts`

Add conditional logic properties to the `baseFieldSchema`:

```typescript
// Add this near line 1050, after the existing field schema properties
export const fieldDependencySchema = z.object({
  // The field ID that this field depends on
  fieldId: z.string(),
  // The operator to use for comparison
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'any_of', 'none_of']),
  // The value(s) to compare against
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const baseFieldSchema = z.object({
  // ... existing properties ...
  
  /**
   * Conditional logic for showing/hiding fields based on other field values
   * When specified, the field will only be shown if the condition is met
   */
  dependsOn: z.array(fieldDependencySchema).optional(),
  
  /**
   * Logical operator to combine multiple dependencies
   * @default 'AND'
   */
  dependencyLogic: z.enum(['AND', 'OR']).default('AND').optional(),
});
```

### 2. Update Routing Forms Field Schema

**File**: `packages/app-store/routing-forms/zod.ts`

Extend the routing form field schema:

```typescript
export const zodNonRouterField = z.object({
  id: z.string(),
  label: z.string(),
  identifier: z.string().optional(),
  placeholder: z.string().optional(),
  type: z.string(),
  selectText: z.string().optional(),
  required: z.boolean().optional(),
  deleted: z.boolean().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        id: z.string().or(z.null()),
      })
    )
    .optional(),
  
  // ADD THESE NEW PROPERTIES
  /**
   * Conditional logic for follow-up questions
   */
  dependsOn: z.array(z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'any_of', 'none_of']),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })).optional(),
  
  /**
   * How to combine multiple dependencies
   */
  dependencyLogic: z.enum(['AND', 'OR']).default('AND').optional(),
});
```

### 3. Create Field Dependency Utility Functions

**New File**: `packages/app-store/routing-forms/lib/fieldDependencies.ts`

```typescript
import type { FormResponse, Field } from "../types/types";

export type FieldDependency = {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'none_of';
  value: string | number | string[];
};

/**
 * Evaluates a single dependency condition
 */
export function evaluateDependency(
  dependency: FieldDependency,
  response: FormResponse
): boolean {
  const fieldResponse = response[dependency.fieldId];
  
  if (!fieldResponse || fieldResponse.value === undefined) {
    return false;
  }

  const responseValue = fieldResponse.value;
  const dependencyValue = dependency.value;

  switch (dependency.operator) {
    case 'equals':
      return responseValue === dependencyValue;
    
    case 'not_equals':
      return responseValue !== dependencyValue;
    
    case 'contains':
      if (typeof responseValue === 'string' && typeof dependencyValue === 'string') {
        return responseValue.toLowerCase().includes(dependencyValue.toLowerCase());
      }
      if (Array.isArray(responseValue) && typeof dependencyValue === 'string') {
        return responseValue.includes(dependencyValue);
      }
      return false;
    
    case 'not_contains':
      if (typeof responseValue === 'string' && typeof dependencyValue === 'string') {
        return !responseValue.toLowerCase().includes(dependencyValue.toLowerCase());
      }
      if (Array.isArray(responseValue) && typeof dependencyValue === 'string') {
        return !responseValue.includes(dependencyValue);
      }
      return true;
    
    case 'any_of':
      if (Array.isArray(dependencyValue)) {
        if (Array.isArray(responseValue)) {
          return responseValue.some(val => dependencyValue.includes(val));
        }
        return dependencyValue.includes(responseValue as string);
      }
      return false;
    
    case 'none_of':
      if (Array.isArray(dependencyValue)) {
        if (Array.isArray(responseValue)) {
          return !responseValue.some(val => dependencyValue.includes(val));
        }
        return !dependencyValue.includes(responseValue as string);
      }
      return true;
    
    default:
      return false;
  }
}

/**
 * Checks if a field should be shown based on its dependencies
 */
export function shouldShowField(
  field: Field,
  response: FormResponse
): boolean {
  // If no dependencies, always show
  if (!field.dependsOn || field.dependsOn.length === 0) {
    return true;
  }

  const dependencyLogic = field.dependencyLogic || 'AND';
  const results = field.dependsOn.map(dep => evaluateDependency(dep, response));

  if (dependencyLogic === 'AND') {
    return results.every(result => result === true);
  } else {
    // OR logic
    return results.some(result => result === true);
  }
}

/**
 * Gets all fields that should be shown based on current responses
 */
export function getVisibleFields(
  fields: Field[] | undefined,
  response: FormResponse
): Field[] {
  if (!fields) return [];
  
  return fields.filter(field => {
    // Don't show deleted fields
    if (field.deleted) return false;
    
    // Check dependencies
    return shouldShowField(field, response);
  });
}

/**
 * Validates that all required visible fields have values
 */
export function validateVisibleFields(
  fields: Field[] | undefined,
  response: FormResponse
): { isValid: boolean; missingFields: string[] } {
  if (!fields) return { isValid: true, missingFields: [] };
  
  const visibleFields = getVisibleFields(fields, response);
  const missingFields: string[] = [];

  for (const field of visibleFields) {
    if (field.required) {
      const fieldResponse = response[field.id];
      if (!fieldResponse || !fieldResponse.value || 
          (Array.isArray(fieldResponse.value) && fieldResponse.value.length === 0)) {
        missingFields.push(field.label);
      }
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
```

### 4. Update FormInputFields Component

**File**: `packages/app-store/routing-forms/components/FormInputFields.tsx`

```typescript
import type { Dispatch, SetStateAction } from "react";

import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import { getQueryBuilderConfigForFormFields } from "../lib/getQueryBuilderConfig";
import isRouterLinkedField from "../lib/isRouterLinkedField";
import { getUIOptionsForSelect } from "../lib/selectOptions";
import { getFieldResponseForJsonLogic } from "../lib/transformResponse";
// ADD THIS IMPORT
import { shouldShowField } from "../lib/fieldDependencies";
import type { SerializableForm, FormResponse } from "../types/types";
import { ConfigFor, withRaqbSettingsAndWidgets } from "./react-awesome-query-builder/config/uiConfig";

export type FormInputFieldsProps = {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
  response: FormResponse;
  setResponse: Dispatch<SetStateAction<FormResponse>>;
  disabledFields?: string[];
};

export default function FormInputFields(props: FormInputFieldsProps) {
  const { form, response, setResponse, disabledFields = [] } = props;

  const formFieldsQueryBuilderConfig = withRaqbSettingsAndWidgets({
    config: getQueryBuilderConfigForFormFields(form),
    configFor: ConfigFor.FormFields,
  });

  return (
    <>
      {form.fields?.map((field) => {
        if (isRouterLinkedField(field)) {
          // @ts-expect-error FIXME @hariombalhara
          const routerField = field.routerField;
          field = routerField ?? field;
        }
        
        // ADD THIS CHECK - Only render if field should be shown
        if (!shouldShowField(field, response)) {
          return null;
        }
        
        const widget = formFieldsQueryBuilderConfig.widgets[field.type];
        if (!("factory" in widget)) {
          return null;
        }
        const Component = widget.factory;

        const options = getUIOptionsForSelect(field);
        const fieldIdentifier = getFieldIdentifier(field);
        return (
          <div key={field.id} className="block flex-col sm:flex ">
            <div className="min-w-48 mb-2 flex-grow">
              <label id="slug-label" htmlFor="slug" className="text-default flex text-sm font-medium">
                {field.label}
              </label>
            </div>
            <Component
              value={response[field.id]?.value ?? ""}
              placeholder={field.placeholder ?? ""}
              // required property isn't accepted by query-builder types
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              /* @ts-ignore */
              required={!!field.required}
              listValues={options}
              disabled={disabledFields?.includes(fieldIdentifier)}
              data-testid={`form-field-${fieldIdentifier}`}
              setValue={(value: number | string | string[]) => {
                setResponse(() => {
                  return {
                    ...response,
                    [field.id]: {
                      label: field.label,
                      identifier: field?.identifier,
                      value: getFieldResponseForJsonLogic({ field, value }),
                    },
                  };
                });
              }}
            />
          </div>
        );
      })}
    </>
  );
}

export const FormInputFieldsSkeleton = () => {
  const numberOfFields = 5;
  return (
    <>
      {Array.from({ length: numberOfFields }).map((_, index) => (
        <div key={index} className="mb-4 block flex-col sm:flex ">
          <SkeletonText className="mb-2 h-3.5 w-64" />
          <SkeletonText className="mb-2 h-9 w-32 w-full" />
        </div>
      ))}
    </>
  );
};
```

### 5. Update Form Validation

**File**: `packages/app-store/routing-forms/lib/validateFormFields.ts` (if exists, or create new)

```typescript
import type { FormResponse, Field } from "../types/types";
import { validateVisibleFields } from "./fieldDependencies";

export function validateRoutingForm(
  fields: Field[] | undefined,
  response: FormResponse
): { isValid: boolean; errors: string[] } {
  const { isValid, missingFields } = validateVisibleFields(fields, response);
  
  const errors: string[] = [];
  
  if (!isValid) {
    errors.push(
      `The following required fields are missing: ${missingFields.join(", ")}`
    );
  }
  
  // Add any other validation logic here
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### 6. Type Definitions Update

**File**: `packages/app-store/routing-forms/types/types.d.ts`

Add the dependency types to the Field interface:

```typescript
// Add these type definitions near the existing Field type

export type FieldDependency = {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'none_of';
  value: string | number | string[];
};

// Update the SerializableField type to include dependencies
// This should be part of the existing Field type through zodFieldView
```

### 7. Database Schema (Optional)

Since Cal.com uses JSON fields for storing form fields and routes, the conditional logic will be stored within the JSON structure. No Prisma migration is needed unless you want to add database-level constraints.

**Note**: The form fields are stored as JSON in the `app_RoutingForms_Form` table's `fields` column, so the new properties will be automatically stored.

## Example Usage

### Creating a Form with Follow-up Questions

Here's how a form creator would set up conditional fields:

```typescript
const formFields = [
  {
    id: "field_1",
    label: "How did you hear about us?",
    type: "select",
    required: true,
    options: [
      { id: "web", label: "Web" },
      { id: "print", label: "Print" },
      { id: "social_media", label: "Social Media" },
      { id: "personal_reference", label: "Personal Reference" }
    ]
  },
  {
    id: "field_2",
    label: "Source web site",
    type: "text",
    required: true,
    // This field only shows if "Web" is selected in field_1
    dependsOn: [
      {
        fieldId: "field_1",
        operator: "equals",
        value: "web"
      }
    ]
  },
  {
    id: "field_3",
    label: "Social media site",
    type: "select",
    required: true,
    options: [
      { id: "twitter", label: "X/Twitter" },
      { id: "mastodon", label: "Mastodon" },
      { id: "facebook", label: "Facebook" },
      { id: "other", label: "Other" }
    ],
    // This field only shows if "Social Media" is selected in field_1
    dependsOn: [
      {
        fieldId: "field_1",
        operator: "equals",
        value: "social_media"
      }
    ]
  }
];
```

### Complex Conditions Example

```typescript
{
  id: "field_4",
  label: "Please specify which conference(s)",
  type: "multiselect",
  required: true,
  options: [
    { id: "conf1", label: "Conference A" },
    { id: "conf2", label: "Conference B" }
  ],
  // Show if source is either "Web" OR "Print"
  dependsOn: [
    {
      fieldId: "field_1",
      operator: "any_of",
      value: ["web", "print"]
    }
  ]
}
```

## Testing Strategy

### Unit Tests

Create test file: `packages/app-store/routing-forms/lib/__tests__/fieldDependencies.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { evaluateDependency, shouldShowField, getVisibleFields } from "../fieldDependencies";
import type { FormResponse, Field } from "../../types/types";

describe("fieldDependencies", () => {
  describe("evaluateDependency", () => {
    it("should return true for equals operator when values match", () => {
      const dependency = {
        fieldId: "field1",
        operator: "equals" as const,
        value: "web"
      };
      
      const response: FormResponse = {
        field1: { label: "Source", value: "web" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(true);
    });
    
    it("should return false for equals operator when values don't match", () => {
      const dependency = {
        fieldId: "field1",
        operator: "equals" as const,
        value: "web"
      };
      
      const response: FormResponse = {
        field1: { label: "Source", value: "print" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(false);
    });
    
    it("should handle any_of operator with arrays", () => {
      const dependency = {
        fieldId: "field1",
        operator: "any_of" as const,
        value: ["web", "print"]
      };
      
      const response: FormResponse = {
        field1: { label: "Source", value: "web" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(true);
    });
  });
  
  describe("shouldShowField", () => {
    it("should show field with no dependencies", () => {
      const field = {
        id: "field1",
        label: "Test",
        type: "text"
      } as Field;
      
      expect(shouldShowField(field, {})).toBe(true);
    });
    
    it("should show field when dependency is met", () => {
      const field = {
        id: "field2",
        label: "Follow-up",
        type: "text",
        dependsOn: [
          {
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          }
        ]
      } as Field;
      
      const response: FormResponse = {
        field1: { label: "Question", value: "yes" }
      };
      
      expect(shouldShowField(field, response)).toBe(true);
    });
    
    it("should hide field when dependency is not met", () => {
      const field = {
        id: "field2",
        label: "Follow-up",
        type: "text",
        dependsOn: [
          {
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          }
        ]
      } as Field;
      
      const response: FormResponse = {
        field1: { label: "Question", value: "no" }
      };
      
      expect(shouldShowField(field, response)).toBe(false);
    });
  });
});
```

### Integration Tests

Test the complete form flow with conditional fields in:
`packages/app-store/routing-forms/__tests__/conditionalFields.integration.test.ts`

## UI Builder Enhancement (Future Work)

For the form builder UI, you'll need to add:

1. **Field Dependency Editor**: A UI component to set up conditional logic when creating/editing fields
2. **Visual Indicators**: Show which fields have dependencies
3. **Dependency Graph**: Visualize field relationships

This would typically be added to the form builder interface, but the exact location depends on how the routing forms UI is structured.

## Migration Guide

For existing forms:
1. The new properties (`dependsOn`, `dependencyLogic`) are optional
2. Existing forms without these properties will work unchanged
3. Form creators can gradually add conditional logic to existing forms

## Performance Considerations

1. **Field Evaluation**: Done client-side for immediate UX
2. **Re-renders**: Component memoization may be needed for large forms
3. **Validation**: Server-side validation should also check dependencies

## Security Considerations

1. **Server-side Validation**: Always validate on the server that conditional fields are properly filled
2. **Dependency Loops**: Prevent circular dependencies (field A depends on field B which depends on field A)
3. **Hidden Data**: Ensure hidden fields' data is not required server-side

## Next Steps for Contributors

1. ✅ Review this implementation guide
2. ⬜ Implement the schema changes
3. ⬜ Create utility functions
4. ⬜ Update FormInputFields component
5. ⬜ Add unit tests
6. ⬜ Add integration tests
7. ⬜ Build UI for setting up dependencies (form builder)
8. ⬜ Update documentation
9. ⬜ Submit PR with all changes

## Questions or Issues?

If you encounter issues during implementation:
- Check the Cal.com Discord community
- Review similar conditional logic implementations in the codebase
- Test thoroughly with various field types and conditions

## References

- **Cal.com Repository**: https://github.com/calcom/cal.com
- **Routing Forms Documentation**: See `/packages/app-store/routing-forms/README.md`
- **React Awesome Query Builder**: Used for routing logic
