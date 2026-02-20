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

export function templateNeedsMapping(template: WhatsAppTemplate | null): boolean {
  if (!template) return false;
  return extractTemplateVariables(template).length > 0;
}

export function resolveVariableValue(mapping: string, bookingData: any): string {
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
