import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { getTranslation } from "@calcom/i18n/server";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { CreationSource, IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";

export interface CreateUserInput {
  email: string;
  username: string | null;
  name?: string | null;
  password?: string;
  brandColor?: string;
  darkBrandColor?: string;
  hideBranding?: boolean;
  weekStart?: string;
  timeZone?: string;
  theme?: string | null;
  timeFormat?: number;
  locale?: string;
  avatar?: string;
  organizationId?: number | null;
  creationSource: CreationSource;
  role?: UserPermissionRole;
  emailVerified?: Date;
  identityProvider?: IdentityProvider;
  identityProviderId?: string | null;
  metadata?: Prisma.InputJsonValue;
  invitedTo?: number;
  isPlatformManaged?: boolean;
  verified?: boolean;
  /** When provided, skips the watchlist check and uses this value directly */
  locked?: boolean;
  /** Handler runs abuse scoring and passes the result here */
  abuseScore?: {
    score: number;
    abuseData: Prisma.InputJsonValue;
  };
}

export interface UpsertUserInput {
  email: string;
  createData: CreateUserInput;
  updateData: Partial<Omit<CreateUserInput, "email" | "creationSource">>;
}

export interface IUserCreationServiceDeps {
  userRepository: UserRepository;
}

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const log = logger.getSubLogger({ prefix: ["[UserCreationService]"] });

/**
 * Strips service-only fields (password, locked, abuseScore) from CreateUserInput
 * so the rest can be safely passed to the repository.
 */
function toRepoData(data: CreateUserInput) {
  const { password: _password, locked: _locked, abuseScore, ...repoFields } = data;
  return { repoFields, abuseScore };
}

async function buildDefaultSchedule() {
  const t = await getTranslation("en", "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  return {
    name: t("default_schedule_name"),
    availability: availability.map((schedule) => ({
      days: schedule.days,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    })),
  };
}

function buildProfile(username: string, organizationId: number) {
  return {
    username,
    organizationId,
    uid: ProfileRepository.generateProfileUid(),
  };
}

export class UserCreationService {
  constructor(private deps: IUserCreationServiceDeps) {}

  async createUser({ data }: { data: CreateUserInput }) {
    const { email, password, username } = data;

    const locked =
      data.locked ??
      (await checkIfEmailIsBlockedInWatchlistController({
        email,
        organizationId: data.organizationId ?? undefined,
        span: sentrySpan,
      }));

    const hashedPassword = password ? await hashPassword(password) : null;
    const { repoFields, abuseScore } = toRepoData(data);

    const user = await this.deps.userRepository.create({
      ...repoFields,
      username: username ? slugify(username) : null,
      ...(hashedPassword && { hashedPassword }),
      organizationId: data.organizationId ?? null,
      locked,
      ...(abuseScore && { abuseScore }),
    });

    log.info(`Created user: ${user.id} with locked status of ${user.locked}`);

    const { locked: _locked, ...restUser } = user;

    return restUser;
  }

  async upsertUser({ email, createData, updateData }: UpsertUserInput) {
    const hashedPassword = createData.password ? await hashPassword(createData.password) : null;
    const { repoFields: createRepoFields } = toRepoData(createData);
    const { password: _p, locked: _l, abuseScore: _a, ...updateRepoFields } = updateData;

    const defaultSchedule = await buildDefaultSchedule();
    const organizationId = createData.organizationId ?? null;
    const username = createData.username ? slugify(createData.username) : null;

    return this.deps.userRepository.upsert(
      { email },
      {
        ...createRepoFields,
        username,
        email,
        ...(hashedPassword && { hashedPassword }),
        organizationId,
        locked: createData.locked ?? false,
        defaultSchedule,
        ...(organizationId && username ? { profile: buildProfile(username, organizationId) } : {}),
      },
      {
        ...updateRepoFields,
        ...(updateData.username && { username: slugify(updateData.username) }),
        ...(hashedPassword && { hashedPassword }),
      }
    );
  }

  async createUserInTransaction(txClient: PrismaTransactionClient, { data }: { data: CreateUserInput }) {
    const hashedPassword = data.password ? await hashPassword(data.password) : null;
    const { repoFields } = toRepoData(data);

    const organizationId = data.organizationId ?? null;
    const username = data.username ? slugify(data.username) : null;
    const defaultSchedule = data.isPlatformManaged ? undefined : await buildDefaultSchedule();

    return this.deps.userRepository.createInTransaction(txClient, {
      ...repoFields,
      username,
      ...(hashedPassword && { hashedPassword }),
      organizationId,
      locked: data.locked ?? false,
      ...(defaultSchedule && { defaultSchedule }),
      ...(organizationId && username ? { profile: buildProfile(username, organizationId) } : {}),
    });
  }

  async createManyUsers({ data, skipDuplicates }: { data: CreateUserInput[]; skipDuplicates?: boolean }) {
    const processedData = data.map((d) => {
      const { repoFields } = toRepoData(d);
      return {
        ...repoFields,
        username: d.username ? slugify(d.username) : null,
      };
    });

    return this.deps.userRepository.createMany(processedData, { skipDuplicates });
  }
}
