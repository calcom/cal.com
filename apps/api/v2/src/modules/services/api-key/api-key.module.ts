import { ApiKeyService } from "@/modules/services/api-key/api-key.service";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
