import { createHash } from "crypto";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import {
  IS_CALCOM,
  IS_TEAM_BILLING_ENABLED,
  RESERVED_SUBDOMAINS,
  IS_PRODUCTION,
} from "@calcom/lib/constants";
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
  if (data.error?.code === "forbidden")
    throw new TRPCError({ code: "CONFLICT", message: "domain_taken_team" });

  // Domain is already being used by a different project
  if (data.error?.code === "domain_taken")
    throw new TRPCError({ code: "CONFLICT", message: "domain_taken_project" });

  return true;
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, adminEmail, adminUsername, check } = input;

  const userCollisions = await prisma.user.findUnique({
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

  if (slugCollisions || RESERVED_SUBDOMAINS.includes(slug))
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });
  if (userCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "admin_email_taken" });

  const password = createHash("md5")
    .update(`${adminEmail}${process.env.CALENDSO_ENCRYPTION_KEY}`)
    .digest("hex");
  const hashedPassword = await hashPassword(password);

  const emailDomain = adminEmail.split("@")[1];

  const t = await getTranslation(ctx.user.locale ?? "en", "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  if (check === false) {
    if (IS_CALCOM) await vercelCreateDomain(slug);

    const createOwnerOrg = await prisma.user.create({
      data: {
        username: adminUsername,
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
            ...(!IS_TEAM_BILLING_ENABLED && { slug }),
            metadata: {
              ...(IS_TEAM_BILLING_ENABLED && { requestedSlug: slug }),
              isOrganization: true,
              isOrganizationVerified: false,
              orgAutoAcceptEmail: emailDomain,
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
    if (!IS_PRODUCTION) return { checked: true };
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
