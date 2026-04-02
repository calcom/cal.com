import { sendChangeOfEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { HttpError } from "@calcom/lib/http-error";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { schemaQueryUserId } from "~/lib/validations/shared/queryUserId";
import { schemaUserEditBodyParams, schemaUserReadPublic } from "~/lib/validations/user";

/**
 * @swagger
 * /users/{userId}:
 *   patch:
 *     summary: Edit an existing user
 *     operationId: editUserById
 *     parameters:
 *       - in: path
 *         name: userId
 *         example: 4
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user to edit
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     requestBody:
 *       description: Edit an existing attendee related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email that belongs to the user being edited
 *               username:
 *                 type: string
 *                 description: Username for the user being edited
 *               brandColor:
 *                 description: The user's brand color
 *                 type: string
 *               darkBrandColor:
 *                 description: The user's brand color for dark mode
 *                 type: string
 *               weekStart:
 *                 description: Start of the week. Acceptable values are one of [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY]
 *                 type: string
 *               timeZone:
 *                 description: The user's time zone
 *                 type: string
 *               hideBranding:
 *                 description: Remove branding from the user's calendar page
 *                 type: boolean
 *               theme:
 *                 description: Default theme for the user. Acceptable values are one of [DARK, LIGHT]
 *                 type: string
 *               timeFormat:
 *                 description: The user's time format. Acceptable values are one of [TWELVE, TWENTY_FOUR]
 *                 type: string
 *               locale:
 *                 description: The user's locale. Acceptable values are one of [EN, FR, IT, RU, ES, DE, PT, RO, NL, PT_BR, ES_419, KO, JA, PL, AR, IW, ZH_CH, ZH_TW, CS, SR, SV, VI]
 *                 type: string
 *               avatar:
 *                 description: The user's avatar, in base64 format
 *                 type: string
 *           examples:
 *              user:
 *                summary: An example of USER
 *                value:
 *                  email: email@example.com
 *                  username: johndoe
 *                  weekStart: MONDAY
 *                  brandColor: #555555
 *                  darkBrandColor: #111111
 *                  timeZone: EUROPE/PARIS
 *                  theme: LIGHT
 *                  timeFormat: TWELVE
 *                  locale: FR
 *     tags:
 *       - users
 *     responses:
 *       200:
 *         description: OK, user edited successfully
 *       400:
 *         description: Bad request. User body is invalid.
 *       401:
 *         description: Authorization information is missing or invalid.
 *       403:
 *         description: Insufficient permissions to access resource.
 */
export async function patchHandler(req: NextApiRequest) {
  const { isSystemWideAdmin } = req;
  const query = schemaQueryUserId.parse(req.query);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isSystemWideAdmin && query.userId !== req.userId)
    throw new HttpError({ statusCode: 403, message: "Forbidden" });

  const { avatar, ...body }: { avatar?: string | undefined } & Prisma.UserUpdateInput =
    await schemaUserEditBodyParams.parseAsync(req.body);
  // disable role or branding changes unless admin.
  if (!isSystemWideAdmin) {
    if (body.role) body.role = undefined;
    if (body.hideBranding) body.hideBranding = undefined;
  }

  const userSchedules = await prisma.schedule.findMany({
    where: { userId: query.userId },
  });
  const userSchedulesIds = userSchedules.map((schedule) => schedule.id);
  // @note: here we make sure user can only make as default his own scheudles
  if (body.defaultScheduleId && !userSchedulesIds.includes(Number(body.defaultScheduleId))) {
    throw new HttpError({
      statusCode: 400,
      message: "Bad request: Invalid default schedule id",
    });
  }

  if (avatar) {
    body.avatarUrl = await uploadAvatar({
      userId: query.userId,
      avatar: await (await import("@calcom/lib/server/resizeBase64Image")).resizeBase64Image(avatar),
    });
  }

  const userRepository = new UserRepository(prisma);
  const currentUser = await userRepository.findById({ id: query.userId });

  if (!currentUser) {
    throw new HttpError({ statusCode: 404, message: "User not found" });
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const emailVerification = await featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

  const hasEmailBeenChanged = typeof body.email === "string" && currentUser.email !== body.email;
  const newEmail = typeof body.email === "string" ? body.email : undefined;

  const prismaData: Prisma.UserUpdateInput = { ...body };

  if (hasEmailBeenChanged && newEmail) {
    const secondaryEmail = await userRepository.findSecondaryEmailByUserIdAndEmail({
      userId: query.userId,
      email: newEmail,
    });

    if (emailVerification) {
      if (secondaryEmail && secondaryEmail.emailVerified) {
        const data = await userRepository.swapPrimaryEmailWithSecondaryEmail({
          userId: query.userId,
          secondaryEmailId: secondaryEmail.id,
          oldPrimaryEmail: currentUser.email,
          oldPrimaryEmailVerified: currentUser.emailVerified,
          newPrimaryEmail: newEmail,
          userUpdateData: prismaData,
        });

        const user = schemaUserReadPublic.parse(data);
        return { user };
      } else {
        prismaData.metadata = {
          ...(currentUser.metadata as Prisma.JsonObject),
          ...(typeof prismaData.metadata === "object" && prismaData.metadata ? prismaData.metadata : {}),
          emailChangeWaitingForVerification: newEmail.toLowerCase(),
        };

        delete prismaData.email;
      }
    }
  }

  const data = await prisma.user.update({
    where: { id: query.userId },
    data: prismaData,
  });

  const shouldSendEmailVerification =
    hasEmailBeenChanged && emailVerification && newEmail && !prismaData.email;

  if (shouldSendEmailVerification) {
    await sendChangeOfEmailVerification({
      user: {
        username: data.username ?? "Nameless User",
        emailFrom: currentUser.email,
        emailTo: newEmail,
      },
    });
  }

  const user = schemaUserReadPublic.parse(data);
  return { user };
}

export default defaultResponder(patchHandler);
