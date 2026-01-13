export const FLAGS_DI_TOKENS = {
  FEATURES_REPOSITORY: Symbol("FeaturesRepository"),
  FEATURES_REPOSITORY_MODULE: Symbol("FeaturesRepositoryModule"),

  // Prisma repositories
  PRISMA_FEATURE_REPOSITORY: Symbol("PrismaFeatureRepository"),
  PRISMA_FEATURE_REPOSITORY_MODULE: Symbol("PrismaFeatureRepositoryModule"),
  PRISMA_TEAM_FEATURE_REPOSITORY: Symbol("PrismaTeamFeatureRepository"),
  PRISMA_TEAM_FEATURE_REPOSITORY_MODULE: Symbol("PrismaTeamFeatureRepositoryModule"),
  PRISMA_USER_FEATURE_REPOSITORY: Symbol("PrismaUserFeatureRepository"),
  PRISMA_USER_FEATURE_REPOSITORY_MODULE: Symbol("PrismaUserFeatureRepositoryModule"),

  // Redis repositories
  REDIS_FEATURE_REPOSITORY: Symbol("RedisFeatureRepository"),
  REDIS_FEATURE_REPOSITORY_MODULE: Symbol("RedisFeatureRepositoryModule"),
  REDIS_TEAM_FEATURE_REPOSITORY: Symbol("RedisTeamFeatureRepository"),
  REDIS_TEAM_FEATURE_REPOSITORY_MODULE: Symbol("RedisTeamFeatureRepositoryModule"),
  REDIS_USER_FEATURE_REPOSITORY: Symbol("RedisUserFeatureRepository"),
  REDIS_USER_FEATURE_REPOSITORY_MODULE: Symbol("RedisUserFeatureRepositoryModule"),

  // Service
  FEATURE_SERVICE: Symbol("FeatureService"),
  FEATURE_SERVICE_MODULE: Symbol("FeatureServiceModule"),
};
