/**
 * Injection token for ITeamFeatureRepository.
 * Used to bridge the Cal.com DI container into NestJS.
 *
 * Defined in a separate file to avoid a circular import between
 * module and service files.
 */
export const TEAM_FEATURE_REPOSITORY = "TEAM_FEATURE_REPOSITORY";
