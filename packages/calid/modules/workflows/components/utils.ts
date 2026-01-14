// utils/whatsapp-template-utils.ts

/**
 * Utility functions for WhatsApp template variable extraction and mapping
 */

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
    body_text_named_params?: Array<{
      param_name: string;
      example: string;
    }>;
  };
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  parameter_format: "POSITIONAL" | "NAMED";
  components: TemplateComponent[];
}

interface ExtractedVariable {
  component: "header" | "body";
  variable: string;
  displayName: string;
  example?: string;
}

export interface VariableMapping {
  [component: string]: {
    [variable: string]: string;
  };
}

/**
 * Extracts variables from a WhatsApp template
 */
export function extractTemplateVariables(template: WhatsAppTemplate): ExtractedVariable[] {
  const variables: ExtractedVariable[] = [];

  template.components.forEach((component) => {
    // Skip buttons and non-text components
    if (component.type === "BUTTONS") return;
    if (component.type === "HEADER" && component.format !== "TEXT") return;
    if (!component.text) return;

    const componentType = component.type.toLowerCase() as "header" | "body";

    if (template.parameter_format === "NAMED") {
      // Extract named variables from example
      const namedParams = component.example?.body_text_named_params || [];
      namedParams.forEach((param) => {
        variables.push({
          component: componentType,
          variable: param.param_name,
          displayName: param.param_name,
          example: param.example,
        });
      });
    } else {
      // Extract positional variables ({{1}}, {{2}}, etc.)
      const matches = component.text.matchAll(/\{\{(\d+)\}\}/g);
      const seen = new Set<string>();

      for (const match of matches) {
        const position = match[1];
        if (!seen.has(position)) {
          seen.add(position);
          variables.push({
            component: componentType,
            variable: position,
            displayName: `Variable ${position}`,
          });
        }
      }
    }
  });

  return variables;
}

/**
 * Checks if a template has variables that need mapping
 */
export function templateNeedsMapping(template: WhatsAppTemplate | null): boolean {
  if (!template) return false;
  return extractTemplateVariables(template).length > 0;
}

/**
 * Validates that all template variables have been mapped
 */
// export function isVariableMappingComplete(
//   template: WhatsAppTemplate | null,
//   mapping: VariableMapping
// ): boolean {
//   if (!template) return false;

//   const variables = extractTemplateVariables(template);

//   return variables.every((variable) => {
//     const value = mapping[variable.component]?.[variable.variable];
//     return value && value.trim() !== "";
//   });
// }

/**
 * Gets the value for a variable from booking data at runtime
 * This would be used in your backend when sending the message
 */
export function resolveVariableValue(mapping: string, bookingData: any): string {
  // Handle custom values
  if (mapping.startsWith("custom:")) {
    return mapping.replace("custom:", "");
  }

  // Handle nested object paths (e.g., 'participant.name', 'booking.eventType.title')
  const parts = mapping.split(".");
  let value = bookingData;

  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = value[part];
    } else {
      return ""; // Path not found
    }
  }

  return String(value || "");
}

/**
 * Builds the parameters array for WhatsApp API from mapping
 * This converts your stored mapping into the format WhatsApp expects
 */
// export function buildWhatsAppParameters(
//   template: WhatsAppTemplate,
//   mapping: VariableMapping,
//   bookingData: any
// ): any[] {
//   const components: any[] = [];

//   template.components.forEach((component) => {
//     if (component.type === "BUTTONS") return;

//     const componentType = component.type.toLowerCase();
//     const componentMapping = mapping[componentType];

//     if (!componentMapping || Object.keys(componentMapping).length === 0) {
//       return;
//     }

//     const parameters: any[] = [];

//     if (template.parameter_format === "NAMED") {
//       // Named parameters
//       Object.entries(componentMapping).forEach(([varName, mappingPath]) => {
//         parameters.push({
//           type: "text",
//           text: resolveVariableValue(mappingPath, bookingData),
//         });
//       });
//     } else {
//       // Positional parameters - sort by position number
//       const sorted = Object.entries(componentMapping).sort(([a], [b]) => parseInt(a) - parseInt(b));

//       sorted.forEach(([_, mappingPath]) => {
//         parameters.push({
//           type: "text",
//           text: resolveVariableValue(mappingPath, bookingData),
//         });
//       });
//     }

//     if (parameters.length > 0) {
//       components.push({
//         type: component.type,
//         parameters,
//       });
//     }
//   });

//   return components;
// }

/**
 * Initialize empty mapping structure for a template
 */
export function initializeMapping(template: WhatsAppTemplate): VariableMapping {
  const mapping: VariableMapping = {};
  const variables = extractTemplateVariables(template);

  variables.forEach((variable) => {
    if (!mapping[variable.component]) {
      mapping[variable.component] = {};
    }
    mapping[variable.component][variable.variable] = "";
  });

  return mapping;
}

/**
 * Merge existing mapping with template requirements
 * Useful when switching templates or updating
 */
export function mergeMapping(template: WhatsAppTemplate, existingMapping: VariableMapping): VariableMapping {
  const newMapping = initializeMapping(template);

  // Preserve existing values where variable names match
  Object.keys(newMapping).forEach((component) => {
    Object.keys(newMapping[component]).forEach((variable) => {
      if (existingMapping[component]?.[variable]) {
        newMapping[component][variable] = existingMapping[component][variable];
      }
    });
  });

  return newMapping;
}
