import type { z } from "zod";
import type { zodField, zodFieldView, zodRouterField, zodRouterFieldView } from "../zod";

/**
 * It has been seen that the field had routerId but not routerField, which could be considered an invalid state. We need to analyze why rotuerId is still set in that case and infact should have been cleanedup.
 */
export default function isRouterLinkedField(
  field: z.infer<typeof zodFieldView> | z.infer<typeof zodField>
): field is z.infer<typeof zodRouterField> | z.infer<typeof zodRouterFieldView> {
  if ("routerId" in field) {
    return true;
  }
  return false;
}
