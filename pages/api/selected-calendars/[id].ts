import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { SelectedCalendarResponse } from "@lib/types";
import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
} from "@lib/validations/selected-calendar";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /selected-calendars/{userId}_{integration}_{externalId}:
 *   get:
 *     summary: Get a selected-calendar by userID and teamID
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: userId of the selected calendar to get
 *      - in: path
 *        name: externalId
 *        schema:
 *          type: string
 *        required: true
 *        description: externalId of the selected calendar to get
 *      - in: path
 *        name: integration
 *        schema:
 *          type: string
 *        required: true
 *        description: integration of the selected calendar to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - selected-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: SelectedCalendar was not found
 *   patch:
 *     summary: Edit an existing selected calendar
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: selected-calendar
 *        description: The selected-calendar to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/SelectedCalendar'
 *        required: true
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: userId of the selected calendar to get
 *      - in: path
 *        name: externalId
 *        schema:
 *          type: string
 *        required: true
 *        description: externalId of the selected calendar to get
 *      - in: path
 *        name: integration
 *        schema:
 *          type: string
 *        required: true
 *        description: integration of the selected calendar to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - selected-calendars
 *     responses:
 *       201:
 *         description: OK, selected-calendar edited successfuly
 *         model: SelectedCalendar
 *       400:
 *        description: Bad request. SelectedCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing selected-calendar
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: userId of the selected calendar to get
 *      - in: path
 *        name: externalId
 *        schema:
 *          type: integer
 *        required: true
 *        description: externalId of the selected-calendar to get
 *      - in: path
 *        name: integration
 *        schema:
 *          type: string
 *        required: true
 *        description: integration of the selected calendar to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - selected-calendars
 *     responses:
 *       201:
 *         description: OK, selected-calendar removed successfuly
 *         model: SelectedCalendar
 *       400:
 *        description: Bad request. SelectedCalendar id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function selectedCalendarById(
  req: NextApiRequest,
  res: NextApiResponse<SelectedCalendarResponse>
) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdAsString.safeParse(query);
  const safeBody = schemaSelectedCalendarBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  // This is how we set the userId and externalId in the query for managing compoundId.
  const [paramUserId, integration, externalId] = safeQuery.data.id.split("_");
  const userId = req.userId;
  if (userId !== parseInt(paramUserId)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.selectedCalendar
          .findUnique({
            where: {
              userId_integration_externalId: {
                userId: userId,
                integration: integration,
                externalId: externalId,
              },
            },
          })
          .then((selectedCalendar) => schemaSelectedCalendarPublic.parse(selectedCalendar))
          .then((selected_calendar) => res.status(200).json({ selected_calendar }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `SelectedCalendar with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.selectedCalendar
          .update({
            where: {
              userId_integration_externalId: {
                userId: userId,
                integration: integration,
                externalId: externalId,
              },
            },
            data: safeBody.data,
          })
          .then((selectedCalendar) => schemaSelectedCalendarPublic.parse(selectedCalendar))
          .then((selected_calendar) => res.status(200).json({ selected_calendar }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `SelectedCalendar with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        await prisma.selectedCalendar
          .delete({
            where: {
              userId_integration_externalId: {
                userId: userId,
                integration: integration,
                externalId: externalId,
              },
            },
          })
          .then(() =>
            res.status(200).json({
              message: `SelectedCalendar with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `SelectedCalendar with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdString(selectedCalendarById));
