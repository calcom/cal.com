import { createHash } from "crypto";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails";
import { IS_ORGANIZATION_BILLING_ENABLED } from "@calcom/lib/constants";
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

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { slug, name, logo, adminEmail, adminUsername, check } = input;

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

  if (check === false) {
    const createOwnerOrg = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        emailVerified: new Date(),
        organization: {
          create: {
            name,
            logo,
            ...(!IS_ORGANIZATION_BILLING_ENABLED && { slug }),
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

    return { user: createOwnerOrg };
  } else {
    const secret = createHash("md5")
      .update(adminEmail + process.env.CALENDSO_ENCRYPTION_KEY)
      .digest("hex");

    totp.options = { step: 90 };
    const code = totp.generate(secret);

    await sendOrganizationEmailVerification(adminEmail, code);
  }

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);

  return { checked: true };
};
