import type { z } from "zod";
import type { zodFieldView, zodField, zodRouterField, zodRouterFieldView } from "../zod";
export default function isRouterLinkedField(field: z.infer<typeof zodFieldView> | z.infer<typeof zodField>): field is z.infer<typeof zodRouterField> | z.infer<typeof zodRouterFieldView>;
//# sourceMappingURL=isRouterLinkedField.d.ts.map