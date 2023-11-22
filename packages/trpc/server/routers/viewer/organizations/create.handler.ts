import { createHash } from "crypto";
import { lookup } from "dns";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails";
import { sendAdminOrganizationNotification } from "@calcom/emails";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { IS_TEAM_BILLING_ENABLED, RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
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

const vercelCreateDomain = async (domain: string) => {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      body: JSON.stringify({ name: `${domain}.${subdomainSuffix()}` }),
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN_VERCEL}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );

  const data = await response.json();

  // Domain is already owned by another team but you can request delegation to access it
  if (data.error?.code === "forbidden") return false;

  // Domain is already being used by a different project
  if (data.error?.code === "domain_taken") return false;

  return true;
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, adminEmail, adminUsername, check } = input;

  const userCollisions = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
  });

  // An org doesn't have a parentId. A team that isn't part of an org also doesn't have a parentId.
  // So, an org can't have the same slug as a non-org team.
  // There is a unique index on [slug, parentId] in Team because we don't add the slug to the team always. We only add metadata.requestedSlug in some cases. So, DB won't prevent creation of such an organization.
  const hasANonOrgTeamOrOrgWithSameSlug = await prisma.team.findFirst({
    where: {
      slug: slug,
      parentId: null,
    },
  });

  if (hasANonOrgTeamOrOrgWithSameSlug || RESERVED_SUBDOMAINS.includes(slug))
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
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    if (process.env.VERCEL) {
      // We only want to proceed to register the subdomain for the org in Vercel
      // within a Vercel context
      isOrganizationConfigured = await vercelCreateDomain(slug);
    } else {
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
              isOrganizationVerified: false,
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
