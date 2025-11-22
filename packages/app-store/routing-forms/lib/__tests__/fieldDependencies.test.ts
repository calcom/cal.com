// Note: vitest import may show as error in IDE but works correctly when tests run
// This is normal in Cal.com's monorepo setup
import { describe, it, expect } from "vitest";
import { 
  evaluateDependency, 
  shouldShowField, 
  getVisibleFields,
  validateVisibleFields,
  detectCircularDependencies,
  sortFieldsByDependencies
} from "../fieldDependencies";
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
    
    it("should return false for any_of when value not in array", () => {
      const dependency = {
        fieldId: "field1",
        operator: "any_of" as const,
        value: ["web", "print"]
      };
      
      const response: FormResponse = {
        field1: { label: "Source", value: "social" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(false);
    });
    
    it("should handle contains operator for strings", () => {
      const dependency = {
        fieldId: "field1",
        operator: "contains" as const,
        value: "cal"
      };
      
      const response: FormResponse = {
        field1: { label: "Domain", value: "cal.com" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(true);
    });
    
    it("should be case insensitive for contains operator", () => {
      const dependency = {
        fieldId: "field1",
        operator: "contains" as const,
        value: "CAL"
      };
      
      const response: FormResponse = {
        field1: { label: "Domain", value: "cal.com" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(true);
    });
    
    it("should handle not_equals operator", () => {
      const dependency = {
        fieldId: "field1",
        operator: "not_equals" as const,
        value: "web"
      };
      
      const response: FormResponse = {
        field1: { label: "Source", value: "print" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(true);
    });
    
    it("should handle none_of operator", () => {
      const dependency = {
        fieldId: "field1",
        operator: "none_of" as const,
        value: ["web", "print"]
      };
      
      const response: FormResponse = {
        field1: { label: "Source", value: "social" }
      };
      
      expect(evaluateDependency(dependency, response)).toBe(true);
    });
    
    it("should return false when field response is missing", () => {
      const dependency = {
        fieldId: "field1",
        operator: "equals" as const,
        value: "web"
      };
      
      const response: FormResponse = {};
      
      expect(evaluateDependency(dependency, response)).toBe(false);
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
    
    it("should handle AND logic with multiple dependencies (all met)", () => {
      const field = {
        id: "field3",
        label: "Follow-up",
        type: "text",
        dependsOn: [
          {
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          },
          {
            fieldId: "field2",
            operator: "equals" as const,
            value: "active"
          }
        ],
        dependencyLogic: "AND" as const
      } as Field;
      
      const response: FormResponse = {
        field1: { label: "Question 1", value: "yes" },
        field2: { label: "Question 2", value: "active" }
      };
      
      expect(shouldShowField(field, response)).toBe(true);
    });
    
    it("should handle AND logic with multiple dependencies (one not met)", () => {
      const field = {
        id: "field3",
        label: "Follow-up",
        type: "text",
        dependsOn: [
          {
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          },
          {
            fieldId: "field2",
            operator: "equals" as const,
            value: "active"
          }
        ],
        dependencyLogic: "AND" as const
      } as Field;
      
      const response: FormResponse = {
        field1: { label: "Question 1", value: "yes" },
        field2: { label: "Question 2", value: "inactive" }
      };
      
      expect(shouldShowField(field, response)).toBe(false);
    });
    
    it("should handle OR logic with multiple dependencies", () => {
      const field = {
        id: "field3",
        label: "Follow-up",
        type: "text",
        dependsOn: [
          {
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          },
          {
            fieldId: "field2",
            operator: "equals" as const,
            value: "active"
          }
        ],
        dependencyLogic: "OR" as const
      } as Field;
      
      const response: FormResponse = {
        field1: { label: "Question 1", value: "no" },
        field2: { label: "Question 2", value: "active" }
      };
      
      expect(shouldShowField(field, response)).toBe(true);
    });
  });
  
  describe("getVisibleFields", () => {
    it("should return all fields when no dependencies", () => {
      const fields: Field[] = [
        { id: "field1", label: "Field 1", type: "text" } as Field,
        { id: "field2", label: "Field 2", type: "text" } as Field
      ];
      
      const visible = getVisibleFields(fields, {});
      expect(visible.length).toBe(2);
    });
    
    it("should filter out deleted fields", () => {
      const fields: Field[] = [
        { id: "field1", label: "Field 1", type: "text" } as Field,
        { id: "field2", label: "Field 2", type: "text", deleted: true } as Field
      ];
      
      const visible = getVisibleFields(fields, {});
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe("field1");
    });
    
    it("should filter based on dependencies", () => {
      const fields: Field[] = [
        { id: "field1", label: "Source", type: "select" } as Field,
        { 
          id: "field2", 
          label: "Web Source", 
          type: "text",
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "web"
          }]
        } as Field,
        { 
          id: "field3", 
          label: "Social Media", 
          type: "select",
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "social"
          }]
        } as Field
      ];
      
      const response: FormResponse = {
        field1: { label: "Source", value: "web" }
      };
      
      const visible = getVisibleFields(fields, response);
      expect(visible.length).toBe(2);
      expect(visible.map(f => f.id)).toEqual(["field1", "field2"]);
    });
  });
  
  describe("validateVisibleFields", () => {
    it("should validate that required visible fields have values", () => {
      const fields: Field[] = [
        { id: "field1", label: "Name", type: "text", required: true } as Field,
        { id: "field2", label: "Email", type: "email", required: true } as Field
      ];
      
      const response: FormResponse = {
        field1: { label: "Name", value: "John" },
        field2: { label: "Email", value: "john@example.com" }
      };
      
      const result = validateVisibleFields(fields, response);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });
    
    it("should identify missing required fields", () => {
      const fields: Field[] = [
        { id: "field1", label: "Name", type: "text", required: true } as Field,
        { id: "field2", label: "Email", type: "email", required: true } as Field
      ];
      
      const response: FormResponse = {
        field1: { label: "Name", value: "John" }
      };
      
      const result = validateVisibleFields(fields, response);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(["Email"]);
    });
    
    it("should not validate hidden conditional fields", () => {
      const fields: Field[] = [
        { id: "field1", label: "Source", type: "select", required: true } as Field,
        { 
          id: "field2", 
          label: "Web Source", 
          type: "text",
          required: true,
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "web"
          }]
        } as Field
      ];
      
      const response: FormResponse = {
        field1: { label: "Source", value: "print" }
        // field2 is not filled because it's hidden
      };
      
      const result = validateVisibleFields(fields, response);
      expect(result.isValid).toBe(true);
    });
    
    it("should validate visible conditional fields", () => {
      const fields: Field[] = [
        { id: "field1", label: "Source", type: "select", required: true } as Field,
        { 
          id: "field2", 
          label: "Web Source", 
          type: "text",
          required: true,
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "web"
          }]
        } as Field
      ];
      
      const response: FormResponse = {
        field1: { label: "Source", value: "web" }
        // field2 is visible but not filled
      };
      
      const result = validateVisibleFields(fields, response);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(["Web Source"]);
    });
  });
  
  describe("detectCircularDependencies", () => {
    it("should return empty array when no circular dependencies", () => {
      const fields: Field[] = [
        { id: "field1", label: "Field 1", type: "text" } as Field,
        { 
          id: "field2", 
          label: "Field 2", 
          type: "text",
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          }]
        } as Field
      ];
      
      const circular = detectCircularDependencies(fields);
      expect(circular).toEqual([]);
    });
    
    it("should detect simple circular dependency", () => {
      const fields: Field[] = [
        { 
          id: "field1", 
          label: "Field 1", 
          type: "text",
          dependsOn: [{
            fieldId: "field2",
            operator: "equals" as const,
            value: "yes"
          }]
        } as Field,
        { 
          id: "field2", 
          label: "Field 2", 
          type: "text",
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          }]
        } as Field
      ];
      
      const circular = detectCircularDependencies(fields);
      expect(circular.length).toBeGreaterThan(0);
    });
  });
  
  describe("sortFieldsByDependencies", () => {
    it("should sort fields so dependencies come first", () => {
      const fields: Field[] = [
        { 
          id: "field2", 
          label: "Field 2", 
          type: "text",
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          }]
        } as Field,
        { id: "field1", label: "Field 1", type: "text" } as Field
      ];
      
      const sorted = sortFieldsByDependencies(fields);
      expect(sorted[0].id).toBe("field1");
      expect(sorted[1].id).toBe("field2");
    });
    
    it("should handle multiple levels of dependencies", () => {
      const fields: Field[] = [
        { 
          id: "field3", 
          label: "Field 3", 
          type: "text",
          dependsOn: [{
            fieldId: "field2",
            operator: "equals" as const,
            value: "yes"
          }]
        } as Field,
        { 
          id: "field2", 
          label: "Field 2", 
          type: "text",
          dependsOn: [{
            fieldId: "field1",
            operator: "equals" as const,
            value: "yes"
          }]
        } as Field,
        { id: "field1", label: "Field 1", type: "text" } as Field
      ];
      
      const sorted = sortFieldsByDependencies(fields);
      expect(sorted[0].id).toBe("field1");
      expect(sorted[1].id).toBe("field2");
      expect(sorted[2].id).toBe("field3");
    });
  });
});
