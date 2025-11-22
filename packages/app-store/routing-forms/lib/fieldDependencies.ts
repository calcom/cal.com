import type { FormResponse, Field } from "../types/types";

export type FieldDependency = {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'none_of';
  value: string | number | string[];
};

/**
 * Evaluates a single dependency condition
 * @param dependency - The dependency condition to evaluate
 * @param response - The current form responses
 * @returns true if the dependency condition is met, false otherwise
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
        return responseValue.toLowerCase().indexOf(dependencyValue.toLowerCase()) !== -1;
      }
      if (Array.isArray(responseValue) && typeof dependencyValue === 'string') {
        return responseValue.indexOf(dependencyValue) !== -1;
      }
      return false;
    
    case 'not_contains':
      if (typeof responseValue === 'string' && typeof dependencyValue === 'string') {
        return responseValue.toLowerCase().indexOf(dependencyValue.toLowerCase()) === -1;
      }
      if (Array.isArray(responseValue) && typeof dependencyValue === 'string') {
        return responseValue.indexOf(dependencyValue) === -1;
      }
      return true;
    
    case 'any_of':
      if (Array.isArray(dependencyValue)) {
        if (Array.isArray(responseValue)) {
          return responseValue.some(val => dependencyValue.indexOf(val) !== -1);
        }
        return dependencyValue.indexOf(responseValue as string) !== -1;
      }
      return false;
    
    case 'none_of':
      if (Array.isArray(dependencyValue)) {
        if (Array.isArray(responseValue)) {
          return !responseValue.some(val => dependencyValue.indexOf(val) !== -1);
        }
        return dependencyValue.indexOf(responseValue as string) === -1;
      }
      return true;
    
    default:
      return false;
  }
}

/**
 * Checks if a field should be shown based on its dependencies
 * @param field - The field to check
 * @param response - The current form responses
 * @returns true if the field should be shown, false otherwise
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
 * @param fields - All form fields
 * @param response - The current form responses
 * @returns Array of fields that should be visible
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
 * @param fields - All form fields
 * @param response - The current form responses
 * @returns Validation result with missing fields
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

/**
 * Detects circular dependencies in field definitions
 * @param fields - All form fields
 * @returns Array of field IDs involved in circular dependencies
 */
export function detectCircularDependencies(
  fields: Field[] | undefined
): string[] {
  if (!fields) return [];
  
  const visited: { [key: string]: boolean } = {};
  const recursionStack: { [key: string]: boolean } = {};
  const circularFields: string[] = [];

  function hasCycle(fieldId: string): boolean {
    if (recursionStack[fieldId]) {
      circularFields.push(fieldId);
      return true;
    }
    
    if (visited[fieldId]) {
      return false;
    }

    visited[fieldId] = true;
    recursionStack[fieldId] = true;

    const field = fields.filter(f => f.id === fieldId)[0];
    if (field && field.dependsOn) {
      for (let i = 0; i < field.dependsOn.length; i++) {
        const dep = field.dependsOn[i];
        if (hasCycle(dep.fieldId)) {
          return true;
        }
      }
    }

    recursionStack[fieldId] = false;
    return false;
  }

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!visited[field.id]) {
      hasCycle(field.id);
    }
  }

  // Remove duplicates
  const unique: string[] = [];
  for (let i = 0; i < circularFields.length; i++) {
    if (unique.indexOf(circularFields[i]) === -1) {
      unique.push(circularFields[i]);
    }
  }
  
  return unique;
}

/**
 * Gets the order in which fields should be displayed considering dependencies
 * Fields that are depended upon should appear before fields that depend on them
 * @param fields - All form fields
 * @returns Sorted array of fields in dependency order
 */
export function sortFieldsByDependencies(
  fields: Field[] | undefined
): Field[] {
  if (!fields) return [];
  
  const sorted: Field[] = [];
  const visited: { [key: string]: boolean } = {};
  
  function visit(field: Field) {
    if (visited[field.id]) return;
    
    visited[field.id] = true;
    
    // Visit all dependencies first
    if (field.dependsOn) {
      for (let i = 0; i < field.dependsOn.length; i++) {
        const dep = field.dependsOn[i];
        const depField = fields.filter(f => f.id === dep.fieldId)[0];
        if (depField) {
          visit(depField);
        }
      }
    }
    
    sorted.push(field);
  }
  
  // Visit all fields
  for (let i = 0; i < fields.length; i++) {
    visit(fields[i]);
  }
  
  return sorted;
}
