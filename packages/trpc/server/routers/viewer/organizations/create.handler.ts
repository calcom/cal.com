import { createHash } from "crypto";
import { lookup } from "dns";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails";
import { sendAdminOrganizationNotification } from "@calcom/emails";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { IS_TEAM_BILLING_ENABLED, RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
import { createDomain } from "@calcom/lib/domainManager/organization";
import { getTranslation } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

const getIPAddress = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lookup(url, (err, address) => {
      if (err) reject(err);
      resolve(address);
    });
  });
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, adminEmail, adminUsername, check } = input;

  const userCollisions = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
  });

  const hasAnOrgWithSameSlug = await prisma.team.findFirst({
    where: {
      slug: slug,
      parentId: null,
      metadata: {
        path: ["isOrganization"],
        equals: true,
      },
    },
  });

  // Allow creating an organization with same requestedSlug as a non-org Team's slug
  // It is needed so that later we can migrate the non-org Team(with the conflicting slug) to the newly created org
  // Publishing the organization would fail if the team with the same slug is not migrated first

  if (hasAnOrgWithSameSlug || RESERVED_SUBDOMAINS.includes(slug))
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });
  if (userCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "admin_email_taken" });

  const password = createHash("md5")
    .update(`${adminEmail}${process.env.CALENDSO_ENCRYPTION_KEY}`)
    .digest("hex");
  const hashedPassword = await hashPassword(password);

  const emailDomain = adminEmail.split("@")[1];

  const t = await getTranslation(ctx.user.locale ?? "en", "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  let isOrganizationConfigured = false;

  if (check === false) {
    isOrganizationConfigured = await createDomain(slug);

    if (!isOrganizationConfigured) {
      // Otherwise, we proceed to send an administrative email to admins regarding
      // the need to configure DNS registry to support the newly created org
      const instanceAdmins = await prisma.user.findMany({
        where: { role: UserPermissionRole.ADMIN },
        select: { email: true },
      });
      if (instanceAdmins.length) {
        await sendAdminOrganizationNotification({
          instanceAdmins,
          orgSlug: slug,
          ownerEmail: adminEmail,
          webappIPAddress: await getIPAddress(
            WEBAPP_URL.replace("https://", "")?.replace("http://", "").replace(/(:.*)/, "")
          ),
          t,
        });
      } else {
        console.warn("Organization created: subdomain not configured and couldn't notify adminnistrators");
      }
    }

    const createOwnerOrg = await prisma.user.create({
      data: {
        username: slugify(adminUsername),
        email: adminEmail,
        emailVerified: new Date(),
        password: hashedPassword,
        // Default schedule
        schedules: {
          create: {
            name: t("default_schedule_name"),
            availability: {
              createMany: {
                data: availability.map((schedule) => ({
                  days: schedule.days,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                })),
              },
            },
          },
        },
        organization: {
          create: {
            name,
            ...(!IS_TEAM_BILLING_ENABLED ? { slug } : {}),
            metadata: {
              ...(IS_TEAM_BILLING_ENABLED ? { requestedSlug: slug } : {}),
              isOrganization: true,
              isOrganizationVerified: true,
              isOrganizationConfigured,
              orgAutoAcceptEmail: emailDomain,
            },
          },
        },
      },
    });

    if (!createOwnerOrg.organizationId) throw Error("User not created");

    await prisma.membership.create({
      data: {
        userId: createOwnerOrg.id,
        role: MembershipRole.OWNER,
        accepted: true,
        teamId: createOwnerOrg.organizationId,
      },
    });

    return { user: { ...createOwnerOrg, password } };
  } else {
    const language = await getTranslation(input.language ?? "en", "common");

    const secret = createHash("md5")
      .update(adminEmail + process.env.CALENDSO_ENCRYPTION_KEY)
      .digest("hex");

    totp.options = { step: 900 };
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

export default createHandler;
