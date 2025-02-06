import { createHash } from "crypto";

import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import type { CreationSource } from "@calcom/prisma/enums";

import { UserRepository } from "../repository/user";

interface CreateUserInput {
  email: string;
  username: string;
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
}

export class UserCreationService {
  static async createUser(data: CreateUserInput) {
    const { email, password } = data;

    const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController(email);

    const hashedPassword =
      password ?? createHash("md5").update(`${email}${process.env.CALENDSO_ENCRYPTION_KEY}`).digest("hex");

    const user = await UserRepository.create({
      ...data,
      hashedPassword,
      organizationId: data?.organizationId ?? null,
      locked: shouldLockByDefault,
    });

    return user;
  }
}
