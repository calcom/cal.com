import { z } from "zod";

const expandEnum = z.enum(["team"]);

export const schemaQuerySingleOrMultipleExpand = z
  .union([
    expandEnum, // Allow a single value from the enum
    z.array(expandEnum).refine((arr) => new Set(arr).size === arr.length, {
      message: "Array values must be unique",
    }), // Allow an array of enum values, with uniqueness constraint
  ])
  .optional();
