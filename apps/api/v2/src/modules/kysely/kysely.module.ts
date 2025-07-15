import { KyselyReadService } from "@/modules/kysely/kyselyReadService";
import { KyselyWriteService } from "@/modules/kysely/kyselyWriteService";
import { Module } from "@nestjs/common";

@Module({
  providers: [KyselyReadService, KyselyWriteService],
  exports: [KyselyReadService, KyselyWriteService],
})
export class KyselyModule {}
