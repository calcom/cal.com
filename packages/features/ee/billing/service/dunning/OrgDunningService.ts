import { BaseDunningService, type IBaseDunningServiceDeps } from "./BaseDunningService";

export class OrgDunningService extends BaseDunningService {
  constructor(deps: IBaseDunningServiceDeps) {
    super(deps, "organization");
  }
}
