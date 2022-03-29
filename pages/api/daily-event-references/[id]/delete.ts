import prisma from "@calcom/prisma";

import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";
import { withMiddleware } from "@lib/helpers/withMiddleware";


type ResponseData = {
  message?: string;
  error?: unknown;
};

export async function deleteDailyEventReference(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (safe.success) {
    const deletedDailyEventReference = await prisma.dailyEventReference
      .delete({ where: { id: safe.data.id } })
    // We only remove the dailyEventReference type from the database if there's an existing resource.
    if (deletedDailyEventReference) res.status(200).json({ message: `dailyEventReference with id: ${safe.data.id} deleted successfully` });
    // This catches the error thrown by prisma.dailyEventReference.delete() if the resource is not found.
    else res.status(400).json({ message: `Resource with id:${safe.data.id} was not found`});
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only DELETE Method allowed" });
}

// export default withValidQueryIdTransformParseInt(deleteDailyEventReference);
export default withMiddleware("deleteOnly")(
  withValidQueryIdTransformParseInt(
    deleteDailyEventReference
  )
);
