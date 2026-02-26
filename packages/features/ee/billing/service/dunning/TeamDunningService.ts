import { BaseDunningService, type IBaseDunningServiceDeps } from "./BaseDunningService";

export class TeamDunningService extends BaseDunningService {
  constructor(deps: IBaseDunningServiceDeps) {
    super(deps, "team");
  }
}
