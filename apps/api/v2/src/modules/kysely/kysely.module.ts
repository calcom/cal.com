import { KyselyReadService } from "@/modules/kysely/kysely-read.service";
import { KyselyWriteService } from "@/modules/kysely/kysely-write.service";
import { Module } from "@nestjs/common";

@Module({
  providers: [KyselyReadService, KyselyWriteService],
  exports: [KyselyReadService, KyselyWriteService],
})
export class KyselyModule {}
