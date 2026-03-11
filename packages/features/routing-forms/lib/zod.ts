import { z } from "zod";

export type FieldOption = {
  label: string;
  id: string | null;
  price?: string;
};

export type TNonRouterField = {
  id: string;
  label: string;
  identifier?: string;
  placeholder?: string;
  type: string;
  /** @deprecated in favour of `options` */
  selectText?: string;
  required?: boolean;
  deleted?: boolean;
  options?: FieldOption[];
  // New fields from booking questions
  defaultValue?: string;
  hideWhenJustOneOption?: boolean;
  maxLength?: number;
  minLength?: number;
  regex?: string;
  emailDomainAutocomplete?: string;
  autocomplete?: string;
  phone?: string;
  variant?: string;
  countries?: string[];
  internal?: boolean;
  slug?: string;
  names?: string[];
  additionalNames?: string[];
  // Pricing support
  price?: string;
  currency?: string;
};

// Note: zodNonRouterField is NOT annotated with z.ZodType because it uses .extend() below
// which requires the full ZodObject type to be preserved
export const zodNonRouterField = z.object({
  id: z.string(),
  label: z.string(),
  identifier: z.string().optional(),
  placeholder: z.string().optional(),
  type: z.string(),
  /**
   * @deprecated in favour of `options`
   */
  selectText: z.string().optional(),
  required: z.boolean().optional(),
  deleted: z.boolean().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        // To keep backwards compatibility with the options generated from legacy selectText, we allow saving null as id
        // It helps in differentiating whether the routing logic should consider the option.label as value or option.id as value.
        // This is important for legacy routes which has option.label saved in conditions and it must keep matching with the value of the option
        id: z.string().or(z.null()),
        price: z.string().optional(),
      })
    )
    .optional(),
  // New fields from booking questions
  defaultValue: z.string().optional(),
  hideWhenJustOneOption: z.boolean().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  regex: z.string().optional(),
  emailDomainAutocomplete: z.string().optional(),
  autocomplete: z.string().optional(),
  phone: z.string().optional(),
  variant: z.string().optional(),
  countries: z.array(z.string()).optional(),
  internal: z.boolean().optional(),
  slug: z.string().optional(),
  names: z.array(z.string()).optional(),
  additionalNames: z.array(z.string()).optional(),
  // Pricing support
  price: z.string().optional(),
  currency: z.string().optional(),
});

// This is different from FormResponse in types.d.ts in that it has label optional. We don't seem to be using label at this point, so we might want to use this only while saving the response when Routing Form is submitted
// Record key is formFieldId
export const routingFormResponseInDbSchema = z.record(
  z.object({
    label: z.string().optional(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })
);
