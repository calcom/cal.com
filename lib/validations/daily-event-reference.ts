import { withValidation } from "next-validations";
import { z } from "zod";

import { _DailyEventReferenceModel as DailyEventReference } from "@calcom/prisma/zod";

export const schemaDailyEventReferenceBaseBodyParams = DailyEventReference.omit({ id: true });

const schemaDailyEventReferenceRequiredParams = z.object({
  email: z.string().email(),
});

export const schemaDailyEventReferenceBodyParams = schemaDailyEventReferenceBaseBodyParams.merge(
  schemaDailyEventReferenceRequiredParams
);

export const schemaDailyEventReferencePublic = DailyEventReference.omit({});

export const withValidDailyEventReference = withValidation({
  schema: schemaDailyEventReferenceBodyParams,
  type: "Zod",
  mode: "body",
});
