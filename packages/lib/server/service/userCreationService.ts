import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import logger from "@calcom/lib/logger";
import type { CreationSource, UserPermissionRole, IdentityProvider } from "@calcom/prisma/enums";

import slugify from "../../slugify";
import { UserRepository } from "../repository/user";

interface CreateUserInput {
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

const log = logger.getSubLogger({ prefix: ["[userCreationService]"] });

export class UserCreationService {
  static async createUser({ data }: { data: CreateUserInput }) {
    const { email, password, username } = data;

    const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController(email);

    const hashedPassword = password ? await hashPassword(password) : null;

    const user = await UserRepository.create({
      ...data,
      username: slugify(username),
      ...(hashedPassword && { hashedPassword }),
      organizationId: data?.organizationId ?? null,
      locked: shouldLockByDefault,
    });

    log.info(`Created user: ${user.id} with locked status of ${user.locked}`);

    const { locked, ...restUser } = user;

    return restUser;
  }
}
