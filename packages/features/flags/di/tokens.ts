export const FLAGS_DI_TOKENS: {
  FEATURES_REPOSITORY: symbol;
  FEATURES_REPOSITORY_MODULE: symbol;
  FEATURE_REPOSITORY: symbol;
  FEATURE_REPOSITORY_MODULE: symbol;
  TEAM_FEATURE_REPOSITORY: symbol;
  TEAM_FEATURE_REPOSITORY_MODULE: symbol;
  USER_FEATURE_REPOSITORY: symbol;
  USER_FEATURE_REPOSITORY_MODULE: symbol;
} = {
  FEATURES_REPOSITORY: Symbol("FeaturesRepository"),
  FEATURES_REPOSITORY_MODULE: Symbol("FeaturesRepositoryModule"),

  FEATURE_REPOSITORY: Symbol("FeatureRepository"),
  FEATURE_REPOSITORY_MODULE: Symbol("FeatureRepositoryModule"),

  TEAM_FEATURE_REPOSITORY: Symbol("TeamFeatureRepository"),
  TEAM_FEATURE_REPOSITORY_MODULE: Symbol("TeamFeatureRepositoryModule"),

  USER_FEATURE_REPOSITORY: Symbol("UserFeatureRepository"),
  USER_FEATURE_REPOSITORY_MODULE: Symbol("UserFeatureRepositoryModule"),
};
