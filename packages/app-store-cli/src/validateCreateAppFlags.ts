import { VALID_CATEGORY_VALUES } from "./constants";

interface ValidateCreateAppFlagsInput {
  template: string;
  category: string;
  externalLinkUrl?: string;
  validTemplateValues: string[];
}

export function validateCreateAppFlags({
  template,
  category,
  externalLinkUrl,
  validTemplateValues,
}: ValidateCreateAppFlagsInput): string | null {
  if (!template) {
    return `--template is required in non-interactive mode. Available templates: ${validTemplateValues.join(", ")}`;
  }

  if (!validTemplateValues.includes(template)) {
    return `Invalid template: ${template}. Available templates: ${validTemplateValues.join(", ")}`;
  }

  if (!(VALID_CATEGORY_VALUES as readonly string[]).includes(category)) {
    return `Invalid category: ${category}. Available categories: ${VALID_CATEGORY_VALUES.join(", ")}`;
  }

  if (template === "link-as-an-app" && !externalLinkUrl) {
    return "--external-link-url is required when using the link-as-an-app template.";
  }

  return null;
}
