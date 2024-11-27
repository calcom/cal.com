import { BlacklistType } from "@calcom/prisma/enums";

import type { IBlacklistRepository } from "./blacklist.repository.interface";

export class MockFeaturesRepository implements IBlacklistRepository {
  async getEmailInBlacklist(email: string) {
    if (email !== "blacklisted@example.com") return null;
    return {
      id: "1",
      type: BlacklistType.EMAIL,
      value: "blacklisted@example.com",
      description: "This is a blacklisted email",
      createdAt: new Date(),
      createdById: 1,
      updatedAt: new Date(),
      updatedById: 1,
    };
  }
}
