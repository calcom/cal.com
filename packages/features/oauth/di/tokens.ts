export const OAUTH_DI_TOKENS: {
  readonly OAUTH_CLIENT_REPOSITORY: symbol;
  readonly OAUTH_CLIENT_REPOSITORY_MODULE: symbol;
  readonly ACCESS_CODE_REPOSITORY: symbol;
  readonly ACCESS_CODE_REPOSITORY_MODULE: symbol;
  readonly REFRESH_TOKEN_REPOSITORY: symbol;
  readonly REFRESH_TOKEN_REPOSITORY_MODULE: symbol;
  readonly OAUTH_SERVICE: symbol;
  readonly OAUTH_SERVICE_MODULE: symbol;
} = {
  OAUTH_CLIENT_REPOSITORY: Symbol("OAuthClientRepository"),
  OAUTH_CLIENT_REPOSITORY_MODULE: Symbol("OAuthClientRepositoryModule"),
  ACCESS_CODE_REPOSITORY: Symbol("AccessCodeRepository"),
  ACCESS_CODE_REPOSITORY_MODULE: Symbol("AccessCodeRepositoryModule"),
  REFRESH_TOKEN_REPOSITORY: Symbol("RefreshTokenRepository"),
  REFRESH_TOKEN_REPOSITORY_MODULE: Symbol("RefreshTokenRepositoryModule"),
  OAUTH_SERVICE: Symbol("OAuthService"),
  OAUTH_SERVICE_MODULE: Symbol("OAuthServiceModule"),
};
