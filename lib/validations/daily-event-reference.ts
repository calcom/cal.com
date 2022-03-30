import { withValidation } from "next-validations";

import { _DailyEventReferenceModel as DailyEventReference } from "@calcom/prisma/zod";

export const schemaDailyEventReferenceBodyParams = DailyEventReference.omit({ id: true });

export const schemaDailyEventReferencePublic = DailyEventReference.omit({});

export const withValidDailyEventReference = withValidation({
  schema: schemaDailyEventReferenceBodyParams,
  type: "Zod",
  mode: "body",
});
