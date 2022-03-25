import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaUser, withValidUser } from "@lib/validations/user";
import { schemaQueryId, withValidQueryIdTransformParseInt } from "@lib/validations/queryIdTransformParseInt";

type ResponseData = {
  data?: User;
  message?: string;
  error?: unknown;
};

export async function editUser(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryId.safeParse(query);
  const safeBody = await schemaUser.safeParse(body);

  if (method === "PATCH") {
    if (safeQuery.success && safeBody.success) {
      await prisma.user.update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      }).then(user => {
        res.status(200).json({ data: user });
      }).catch(error => {
        res.status(404).json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error })
      });
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ message: "Only PATCH Method allowed for updating user-types"  });
  }
}

export default withValidQueryIdTransformParseInt(withValidUser(editUser));
