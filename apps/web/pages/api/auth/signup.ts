import type { NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import {
  createUser,
  findExistingUser,
  ensurePostMethod,
  handlePremiumUsernameFlow,
  parseSignupData,
  sendVerificationEmail,
  syncServicesCreateUser,
  throwIfSignupIsDisabled,
} from "@calcom/feature-auth/lib/signup/signupUtils";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { IS_CALCOM } from "@calcom/lib/constants";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { HttpError } from "@calcom/lib/http-error";
import type { RequestWithUsernameStatus } from "@calcom/lib/server/username";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { validateUsernameInTeam } from "@calcom/lib/validateUsername";
import { IdentityProvider } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export default async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  try {
    ensurePostMethod(req);
    throwIfSignupIsDisabled();
    const { email, password, language, token, username } = parseSignupData(req.body);
    await findExistingUser(username, email);
    const hashedPassword = await hashPassword(password);
    const premiumUsernameMetadata = await handlePremiumUsernameFlow({
      email,
      username,
      premiumUsernameStatusCode: req.usernameStatus.statusCode,
    });

    if (!token) {
      // Create the user
      const user = await createUser({
        username,
        email,
        hashedPassword,
        metadata: premiumUsernameMetadata,
      });
      await sendVerificationEmail({
        email,
        language: language || (await getLocaleFromRequest(req)),
        username: username || "",
      });
      await syncServicesCreateUser(user);
    }
    {
      const foundToken = await prisma.verificationToken.findFirst({
        where: {
          token,
        },
        select: {
          id: true,
          expires: true,
          teamId: true,
        },
      });
      if (!foundToken) {
        return res.status(401).json({ message: "Invalid Token" });
      }

      if (dayjs(foundToken?.expires).isBefore(dayjs())) {
        return res.status(401).json({ message: "Token expired" });
      }
      if (foundToken?.teamId) {
        const teamUserValidation = await validateUsernameInTeam(username, email, foundToken?.teamId);
        if (!teamUserValidation.isValid) {
          return res.status(409).json({ message: "Username or email is already taken" });
        }

        const team = await prisma.team.findUnique({
          where: {
            id: foundToken.teamId,
          },
        });

        if (team) {
          const teamMetadata = teamMetadataSchema.parse(team?.metadata);

          const user = await prisma.user.upsert({
            where: { email },
            update: {
              username,
              password: hashedPassword,
              emailVerified: new Date(Date.now()),
              identityProvider: IdentityProvider.CAL,
            },
            create: {
              username,
              email: email,
              password: hashedPassword,
              identityProvider: IdentityProvider.CAL,
            },
          });

          if (teamMetadata?.isOrganization) {
            await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                organizationId: team.id,
              },
            });
          }

          const membership = await prisma.membership.update({
            where: {
              userId_teamId: { userId: user.id, teamId: team.id },
            },
            data: {
              accepted: true,
            },
          });
          closeComUpsertTeamUser(team, user, membership.role);

          // Accept any child team invites for orgs.
          if (team.parentId) {
            // Join ORG
            await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                organizationId: team.parentId,
              },
            });

            /** We do a membership update twice so we can join the ORG invite if the user is invited to a team witin a ORG. */
            await prisma.membership.updateMany({
              where: {
                userId: user.id,
                team: {
                  id: team.parentId,
                },
                accepted: false,
              },
              data: {
                accepted: true,
              },
            });

            // Join any other invites
            await prisma.membership.updateMany({
              where: {
                userId: user.id,
                team: {
                  parentId: team.parentId,
                },
                accepted: false,
              },
              data: {
                accepted: true,
              },
            });
          }

          // Cleanup token after use
          await prisma.verificationToken.delete({
            where: {
              id: foundToken.id,
            },
          });
        }
      }
    }

    if (IS_CALCOM && premiumUsernameMetadata) {
      if (premiumUsernameMetadata.checkoutSessionId) {
        return res.status(402).json({
          message: "Created user but missing payment",
          checkoutSessionId: premiumUsernameMetadata.checkoutSessionId,
        });
      }
      return res
        .status(201)
        .json({ message: "Created user", stripeCustomerId: premiumUsernameMetadata.stripeCustomerId });
    }

    return res.status(201).json({ message: "Created user" });
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }

  // if (IS_CALCOM) {
  //   // return await hostedHandler(req, res);
  // } else {
  //   return await selfHostedHandler(req, res);
  // }
}
