import { UserCreationService } from "@calcom/features/users/services/userCreationService";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CreationSource } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";
import { schemaUserCreateBodyParams } from "~/lib/validations/user";

/**
 * @swagger
 * /users:
 *   post:
 *     operationId: addUser
 *     summary: Creates a new user
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     requestBody:
 *       description: Create a new user
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - email
 *              - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email that belongs to the user being edited
 *               username:
 *                 type: string
 *                 description: Username for the user being created
 *               brandColor:
 *                 description: The new user's brand color
 *                 type: string
 *               darkBrandColor:
 *                 description: The new user's brand color for dark mode
 *                 type: string
 *               hideBranding:
 *                 description: Remove branding from the user's calendar page
 *                 type: boolean
 *               weekStart:
 *                 description: Start of the week. Acceptable values are one of [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY]
 *                 type: string
 *               timeZone:
 *                 description: The new user's time zone. Eg- 'EUROPE/PARIS'
 *                 type: string
 *               theme:
 *                 description: Default theme for the new user. Acceptable values are one of [DARK, LIGHT]
 *                 type: string
 *               timeFormat:
 *                 description: The new user's time format. Acceptable values are one of [TWELVE, TWENTY_FOUR]
 *                 type: string
 *               locale:
 *                 description: The new user's locale. Acceptable values are one of [EN, FR, IT, RU, ES, DE, PT, RO, NL, PT_BR, ES_419, KO, JA, PL, AR, IW, ZH_CH, ZH_TW, CS, SR, SV, VI]
 *                 type: string
 *               avatar:
 *                 description: The user's avatar, in base64 format
 *                 type: string
 *           examples:
 *              user:
 *                summary: An example of USER
 *                value:
 *                  email: 'email@example.com'
 *                  username: 'johndoe'
 *                  weekStart: 'MONDAY'
 *                  brandColor: '#555555'
 *                  darkBrandColor: '#111111'
 *                  timeZone: 'EUROPE/PARIS'
 *                  theme: 'LIGHT'
 *                  timeFormat: 'TWELVE'
 *                  locale: 'FR'
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user created
 *       400:
 *        description: Bad request. user body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { isSystemWideAdmin } = req;
  // If user is not ADMIN, return unauthorized.
  if (!isSystemWideAdmin) throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  const data = await schemaUserCreateBodyParams.parseAsync(req.body);
  const user = await UserCreationService.createUser({
    data: { ...data, creationSource: CreationSource.API_V1 },
  });
  req.statusCode = 201;
  return { user };
}

export default defaultResponder(postHandler);
