import { createContainer } from "@calcom/features/di/di";

import {
  type AbuseRulesRepository,
  moduleLoader as abuseRulesRepositoryModule,
} from "./AbuseRulesRepository.module";

const abuseRulesRepositoryContainer = createContainer();

export function getAbuseRulesRepository(): AbuseRulesRepository {
  abuseRulesRepositoryModule.loadModule(abuseRulesRepositoryContainer);

  return abuseRulesRepositoryContainer.get<AbuseRulesRepository>(abuseRulesRepositoryModule.token);
}
