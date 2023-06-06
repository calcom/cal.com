import { createHash } from "crypto";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ input }: CreateOptions) => {
  const { slug, name, adminEmail, adminUsername, check } = input;

  const userCollisions = await prisma.user.findFirst({
    where: {
      email: adminEmail,
    },
  });

  const slugCollisions = await prisma.team.findFirst({
    where: {
      slug: slug,
      metadata: {
        path: ["isOrganization"],
        equals: true,
      },
    },
  });

  if (slugCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });
  if (userCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "admin_email_taken" });

  const password = createHash("md5")
    .update(`${adminEmail}${process.env.CALENDSO_ENCRYPTION_KEY}`)
    .digest("hex");
  const hashedPassword = await hashPassword(password);

  if (check === false) {
    const createOwnerOrg = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        emailVerified: new Date(),
        password: hashedPassword,
        organization: {
          create: {
            name,
            ...(!IS_TEAM_BILLING_ENABLED && { slug }),
            metadata: {
              requestedSlug: slug,
              isOrganization: true,
            },
          },
        },
      },
    });

    await prisma.membership.create({
      data: {
        userId: createOwnerOrg.id,
        role: MembershipRole.OWNER,
        accepted: true,
        teamId: createOwnerOrg.organizationId!,
      },
    });

    return { user: { ...createOwnerOrg, password } };
  } else {
    const language = await getTranslation(input.language ?? "en", "common");

    const secret = createHash("md5")
      .update(adminEmail + process.env.CALENDSO_ENCRYPTION_KEY)
      .digest("hex");

    totp.options = { step: 90 };
    const code = totp.generate(secret);

    await sendOrganizationEmailVerification({
      user: {
        email: adminEmail,
      },
      code,
      language,
    });
  }

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);

  return { checked: true };
};
