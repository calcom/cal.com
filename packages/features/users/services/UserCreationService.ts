import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";
import type { CreationSource, IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";

export interface CreateUserInput {
  email: string;
  username: string;
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
}

export interface IUserCreationServiceDeps {
  userRepository: UserRepository;
}

const log = logger.getSubLogger({ prefix: ["[UserCreationService]"] });

export class UserCreationService {
  constructor(private deps: IUserCreationServiceDeps) {}

  async createUser({ data }: { data: CreateUserInput }) {
    const { email, password, username } = data;

    const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController({
      email,
      organizationId: data.organizationId ?? undefined,
      span: sentrySpan,
    });

    const hashedPassword = password ? await hashPassword(password) : null;

    const user = await this.deps.userRepository.create({
      ...data,
      username: slugify(username),
      ...(hashedPassword && { hashedPassword }),
      organizationId: data?.organizationId ?? null,
      locked: shouldLockByDefault,
    });

    log.info(`Created user: ${user.id} with locked status of ${user.locked}`);

    const { locked: _locked, ...restUser } = user;

    return restUser;
  }
}
