import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PrismaReadService,
      useFactory: (config: ConfigService) => {
        const service = new PrismaReadService();
        service.setOptions({
          readUrl: config.get<string>("db.readUrl", { infer: true }),
          maxReadConnections: parseInt(config.get<number>("db.readPoolMax", { infer: true })),
          e2e: config.get<boolean>("e2e", { infer: true }) ?? false,
          type: "main",
        });
        return service;
      },
      inject: [ConfigService],
    },
    {
      provide: PrismaWriteService,
      useFactory: (config: ConfigService) => {
        const service = new PrismaWriteService();
        service.setOptions({
          writeUrl: config.get<string>("db.writeUrl", { infer: true }),
          maxWriteConnections: parseInt(config.get<number>("db.writePoolMax", { infer: true })),
          e2e: config.get<boolean>("e2e", { infer: true }) ?? false,
          type: "main",
        });
        return service;
      },
      inject: [ConfigService],
    },
  ],
  exports: [PrismaReadService, PrismaWriteService],
})
export class PrismaModule {}
