import type { NextApiResponse } from "next";

import {
  createUser,
  findExistingUser,
  ensurePostMethod,
  handlePremiumUsernameFlow,
  parseSignupData,
  sendVerificationEmail,
  syncServicesCreateUser,
  throwIfSignupIsDisabled,
  createStripeCustomer,
} from "@calcom/feature-auth/lib/signup/signupUtils";
import {
  checkIfTokenExistsAndValid,
  acceptAllInvitesWithTeamId,
  findTeam,
  upsertUsersPasswordAndVerify,
  joinOrgAndAcceptChildInivtes,
  cleanUpInviteToken,
} from "@calcom/feature-auth/lib/signup/teamInviteUtils";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { IS_CALCOM } from "@calcom/lib/constants";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { HttpError } from "@calcom/lib/http-error";
import type { RequestWithUsernameStatus } from "@calcom/lib/server/username";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { validateUsernameInTeam } from "@calcom/lib/validateUsername";

export default async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  try {
    ensurePostMethod(req);
    throwIfSignupIsDisabled();
    const { email, password, language, token, username } = parseSignupData(req.body);
    await findExistingUser(username, email);
    const hashedPassword = await hashPassword(password);

    const customer = await createStripeCustomer({
      email,
      username,
    });

    const premiumUsernameMetadata = await handlePremiumUsernameFlow({
      customer,
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
    } else {
      const foundToken = await checkIfTokenExistsAndValid(token);
      if (foundToken?.teamId) {
        const teamUserValidation = await validateUsernameInTeam(username, email, foundToken?.teamId);
        if (!teamUserValidation.isValid) {
          return res.status(409).json({ message: "Username or email is already taken" });
        }

        const team = await findTeam(foundToken.teamId);

        if (team) {
          const teamMetadata = team.metadata;
          const user = await upsertUsersPasswordAndVerify(email, username, hashedPassword);
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
          const membership = await acceptAllInvitesWithTeamId(user.id, team.id);
          closeComUpsertTeamUser(team, user, membership.role);
          if (team.parentId) {
            await joinOrgAndAcceptChildInivtes(user.id, team.parentId);
          }
          await cleanUpInviteToken(foundToken.id);
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
    console.log(e);
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
