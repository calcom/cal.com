import type { DB } from "@calcom/kysely/types";
import type { OnModuleDestroy } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeduplicateJoinsPlugin, Kysely, ParseJSONResultsPlugin, PostgresDialect } from "kysely";
import { Pool } from "pg";

@Injectable()
export class KyselyReadService implements OnModuleDestroy {
  private logger = new Logger("KyselyReadService");

  public kysely: Kysely<DB>;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.readUrl", { infer: true });
    const pool = new Pool({ connectionString: dbUrl });

    // 3. Create the Dialect, passing the configured pool instance
    const dialect = new PostgresDialect({
      pool: pool, // Use the pool instance created above
    });
    this.kysely = new Kysely<DB>({
      dialect,
      plugins: [new ParseJSONResultsPlugin(), new DeduplicateJoinsPlugin()],
    });
  }

  async onModuleDestroy() {
    try {
      await this.kysely.destroy();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
