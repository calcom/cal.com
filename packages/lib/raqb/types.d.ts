import type { z } from "zod";

import type { raqbChildSchema, raqbQueryValueSchema, zodAttributesQueryValue } from "./zod";

export type RaqbChild = z.infer<typeof raqbChildSchema>;
export type RaqbQueryValue = z.infer<typeof raqbQueryValueSchema>;
export type AttributesQueryValue = z.infer<typeof zodAttributesQueryValue>;

type dynamicFieldValueOperandsResponse = Record<
  // Field ID
  string,
  {
    value: number | string | string[];
    label: string;
  }
>;

/**
 * Holds the fields that build up the 'Value of field' select options.
 * It also holds the response which is the value of the 'Value of field' select options.
 */
export type dynamicFieldValueOperands = {
  fields: {
    id: string;
    label: string;
    type: string;
    options?: {
      id: string | null;
      label: string;
    }[];
  }[];
  response: dynamicFieldValueOperandsResponse;
};
