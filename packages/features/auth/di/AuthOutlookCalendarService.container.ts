import { createContainer } from "@calcom/features/di/di";

import {
  type AuthOutlookCalendarService,
  moduleLoader as authOutlookCalendarServiceModuleLoader,
} from "./AuthOutlookCalendarService.module";

const authOutlookCalendarServiceContainer = createContainer();

export function getAuthOutlookCalendarService(): AuthOutlookCalendarService {
  authOutlookCalendarServiceModuleLoader.loadModule(authOutlookCalendarServiceContainer);
  return authOutlookCalendarServiceContainer.get<AuthOutlookCalendarService>(
    authOutlookCalendarServiceModuleLoader.token
  );
}
