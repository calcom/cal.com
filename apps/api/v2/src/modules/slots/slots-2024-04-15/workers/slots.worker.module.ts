// apps/api/v2/src/modules/slots/slots-2024-04-15/workers/slots-worker.module.ts
// Needed if ConfigService is used anywhere
import appConfig from "@/config/app";
import { AvailableSlotsModule } from "@/lib/modules/available-slots.module";
import { PrismaWorkerModule } from "@/modules/prisma/prisma-worker.module";
import { Module, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SentryModule } from "@sentry/nestjs/setup";

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaWorkerModule,
    AvailableSlotsModule,
  ],
  providers: [Logger],
})
export class SlotsWorkerModule {}
