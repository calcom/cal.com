import type { MembershipService } from "@calcom/features/membership/services/MembershipService";
import { moduleLoader as membershipServiceModuleLoader } from "@calcom/features/users/di/MembershipService.module";
import { createContainer } from "../di";

const container = createContainer();

export function getMembershipService(): MembershipService {
  membershipServiceModuleLoader.loadModule(container);
  return container.get<MembershipService>(membershipServiceModuleLoader.token);
}
