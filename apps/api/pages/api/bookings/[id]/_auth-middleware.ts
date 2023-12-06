import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, prisma, isAdmin, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const userBookingJoin = await prisma.user.findUnique({
    where: {
      id: userId,
      teams: {
        some: {
          team: {
            members: {
              some: {
                user: {
                  bookings: {
                    some: {
                      id: id,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!isAdmin && !userBookingJoin) {
    throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  }
}

export default authMiddleware;
