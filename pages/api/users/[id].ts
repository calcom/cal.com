import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { UserResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaUserEditBodyParams, schemaUserReadPublic } from "@lib/validations/user";

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Find a user by ID, returns your user if regular user.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - users
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: User was not found
 *   patch:
 *     summary: Edit an existing user
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: name
 *        description: The users full name
 *        schema:
 *         type: string
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the user to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user edited successfuly
 *         model: User
 *       400:
 *        description: Bad request. User body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing user
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the user to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user removed successfuly
 *         model: User
 *       400:
 *        description: Bad request. User id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function userById(req: NextApiRequest, res: NextApiResponse<any>) {
  const { method, query, body, userId } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  console.log(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  if (safeQuery.data.id !== userId) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.user
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaUserReadPublic.parse(data))
          .then((user) => res.status(200).json({ user }))
          .catch((error: Error) =>
            res.status(404).json({ message: `User with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      case "PATCH":
        const safeBody = schemaUserEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          res.status(400).json({ message: "Bad request", error: safeBody.error });
          throw new Error("Invalid request body");
        }
        const userSchedules = await prisma.schedule.findMany({
          where: { userId },
        });
        const userSchedulesIds = userSchedules.map((schedule) => schedule.id);
        // @note: here we make sure user can only make as default his own scheudles
        if (!userSchedulesIds.includes(Number(safeBody?.data?.defaultScheduleId))) {
          res.status(400).json({
            message: "Bad request",
            error: "Invalid default schedule id",
          });
          throw new Error("Invalid request body value: defaultScheduleId");
        }
        await prisma.user
          .update({
            where: { id: userId },
            data: safeBody.data,
          })
          .then((data) => schemaUserReadPublic.parse(data))
          .then((user) => res.status(200).json({ user }))
          .catch((error: Error) =>
            res.status(404).json({ message: `User with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      case "DELETE":
        await prisma.user
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({ message: `User with id: ${safeQuery.data.id} deleted successfully` })
          )
          .catch((error: Error) =>
            res.status(404).json({ message: `User with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(userById));
