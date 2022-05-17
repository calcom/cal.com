import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { UserResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaUserEditBodyParams, schemaUserReadPublic } from "@lib/validations/user";

export async function userById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<UserResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  console.log(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  if (safeQuery.data.id !== userId) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        /**
         * @swagger
         * /users/{id}:
         *   get:
         *     summary: Find a user, returns your user if regular user.
         *     operationId: getUserById
         *     parameters:
         *       - in: path
         *         name: id
         *         example: 4
         *         schema:
         *           type: integer
         *         required: true
         *         description: ID of the user to get
         *     tags:
         *     - users
         *     responses:
         *       200:
         *         description: OK
         *       401:
         *        description: Authorization information is missing or invalid.
         *       404:
         *         description: User was not found
         */

        await prisma.user
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaUserReadPublic.parse(data))
          .then((user) => res.status(200).json({ user }))
          .catch((error: Error) =>
            res.status(404).json({ message: `User with id: ${safeQuery.data.id} not found`, error })
          );
        break;
      case "PATCH":
        /**
         * @swagger
         * /users/{id}:
         *   patch:
         *     summary: Edit an existing user
         *     operationId: editUserById
         *     requestBody:
         *       description: Edit an existing attendee related to one of your bookings
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               weekStart:
         *                 type: string
         *                 enum: [Monday, Sunday, Saturday]
         *                 example: Monday
         *               brandColor:
         *                 type: string
         *                 example: "#FF000F"
         *               darkBrandColor:
         *                 type: string
         *                 example: "#000000"
         *               timeZone:
         *                 type: string
         *                 example: Europe/London
         *     parameters:
         *      - in: path
         *        name: id
         *        example: 4
         *        schema:
         *          type: integer
         *        required: true
         *        description: ID of the user to edit
         *     tags:
         *     - users
         *     responses:
         *       201:
         *         description: OK, user edited successfuly
         *       400:
         *        description: Bad request. User body is invalid.
         *       401:
         *        description: Authorization information is missing or invalid.
         */

        const safeBody = schemaUserEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          res.status(400).json({ message: "Bad request", error: safeBody.error });

          return;
        }
        const userSchedules = await prisma.schedule.findMany({
          where: { userId },
        });
        const userSchedulesIds = userSchedules.map((schedule) => schedule.id);
        // @note: here we make sure user can only make as default his own scheudles
        if (
          safeBody?.data?.defaultScheduleId &&
          !userSchedulesIds.includes(Number(safeBody?.data?.defaultScheduleId))
        ) {
          res.status(400).json({
            message: "Bad request: Invalid default schedule id",
          });
          return;
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

      /**
       * @swagger
       * /users/{id}:
       *   delete:
       *     summary: Remove an existing user
       *     operationId: removeUserById
       *     parameters:
       *      - in: path
       *        name: id
       *        example: 1
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the user to delete
       *     tags:
       *     - users
       *     responses:
       *       201:
       *         description: OK, user removed successfuly
       *       400:
       *        description: Bad request. User id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */

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
