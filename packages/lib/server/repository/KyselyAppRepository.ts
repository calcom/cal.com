import type { Kysely } from "kysely";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import type { KyselyDatabase } from "@calcom/kysely/types";
import type { Prisma } from "@calcom/prisma/client";

import type { AppDto, IAppRepository } from "./IAppRepository";

export class KyselyAppRepository implements IAppRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async seedApp(dirName: string, keys?: Prisma.InputJsonValue): Promise<void> {
    const appMetadata = appStoreMetadata[dirName as keyof typeof appStoreMetadata];

    if (!appMetadata) {
      throw new Error(`App ${dirName} not found`);
    }

    await this.dbWrite
      .insertInto("App")
      .values({
        slug: appMetadata.slug,
        categories: appMetadata.categories,
        dirName: dirName,
        keys: keys ?? null,
        enabled: true,
      })
      .execute();
  }

  async findAppStore(): Promise<AppDto[]> {
    const results = await this.dbRead.selectFrom("App").select("slug").execute();

    return results.map((row) => ({
      slug: row.slug,
    }));
  }
}
