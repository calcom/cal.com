import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

export const DI_SYMBOLS = {
  // Services
  // AuthenticationService: Symbol.for("IAuthenticationService"),

  // Repositories
  FeaturesRepository: Symbol.for("IFeaturesRepository"),
};

export interface DI_RETURN_TYPES {
  // Services
  // AuthenticationService: IAuthenticationService;

  // Repositories
  FeaturesRepository: IFeaturesRepository;
}
