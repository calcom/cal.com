import { createContainer } from "@calcom/features/di/di";

import {
  type AbuseScoringRepository,
  moduleLoader as abuseScoringRepositoryModule,
} from "./AbuseScoringRepository.module";

const abuseScoringRepositoryContainer = createContainer();

export function getAbuseScoringRepository(): AbuseScoringRepository {
  abuseScoringRepositoryModule.loadModule(abuseScoringRepositoryContainer);

  return abuseScoringRepositoryContainer.get<AbuseScoringRepository>(abuseScoringRepositoryModule.token);
}
