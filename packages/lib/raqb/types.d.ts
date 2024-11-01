import type { z } from "zod";

import { zodAttributesQueryValue } from "./zod";

export type AttributesQueryValue = z.infer<typeof zodAttributesQueryValue>;
type AdditionalSelectOptionsResponse = Record<
  // Field ID
  string,
  {
    value: number | string | string[];
    label: string;
  }
>;

export type AdditionalSelectOptions = {
  fields: {
    id: string;
    label: string;
    type: string;
    options?: {
      id: string | null;
      label: string;
    }[];
  }[];
  response: AdditionalSelectOptionsResponse;
};
