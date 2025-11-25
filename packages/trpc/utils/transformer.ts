import { parse, stringify } from "devalue";

import type { TRPCCombinedDataTransformer } from "@trpc/server";

export const transformer: TRPCCombinedDataTransformer = {
  input: {
    serialize: stringify,
    deserialize: parse,
  },
  output: {
    serialize: stringify,
    deserialize: parse,
  },
};
