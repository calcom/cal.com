import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaEventTypeCreateBodyParams, schemaEventTypeReadPublic } from "~/lib/validations/event-type";

import checkTeamEventEditPermission from "./_utils/checkTeamEventEditPermission";

/**
 * @swagger
 * /event-types:
 *   post:
 *     summary: Creates a new event type
 *     operationId: addEventType
 *     requestBody:
 *       description: Create a new event-type related to your user or team
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - length
 *               - metadata
 *             properties:
 *               length:
 *                 type: number
 *                 example: 30
 *               metadata:
 *                 type: object
 *                 example: {"smartContractAddress": "0x1234567890123456789012345678901234567890"}
 *               title:
 *                 type: string
 *                 example: My Event
 *               slug:
 *                 type: string
 *                 example: my-event
 *
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/event-types
 *     responses:
 *       201:
 *         description: OK, event type created
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const body = schemaEventTypeCreateBodyParams.parse(req.body);
  let args: Prisma.EventTypeCreateArgs = {
    data: { ...body, userId, users: { connect: { id: userId } } },
  };

  await checkPermissions(req);

  if (isAdmin && body.userId) args = { data: { ...body, users: { connect: { id: body.userId } } } };

  await checkTeamEventEditPermission(req, body);

  const data = await prisma.eventType.create(args);

  return {
    event_type: schemaEventTypeReadPublic.parse(data),
    message: "Event type created successfully",
  };
}

async function checkPermissions(req: NextApiRequest) {
  const { isAdmin } = req;
  const body = schemaEventTypeCreateBodyParams.parse(req.body);
  /* Non-admin users can only create event types for themselves */
  if (!isAdmin && body.userId)
    throw new HttpError({
      statusCode: 401,
      message: "ADMIN required for `userId`",
    });
  /* Admin users are required to pass in a userId */
  if (isAdmin && !body.userId) throw new HttpError({ statusCode: 400, message: "`userId` required" });
}

export default defaultResponder(postHandler);
