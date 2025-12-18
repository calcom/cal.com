import { FeaturesRepositoryCachingProxy } from "@/lib/repositories/features-repository-caching-proxy";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaFeaturesRepository,
    {
      provide: "IFeaturesRepository",
      useClass: FeaturesRepositoryCachingProxy,
    },
  ],
  exports: [PrismaFeaturesRepository, "IFeaturesRepository"],
})
export class FeaturesModule {}
