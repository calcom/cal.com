import { createContainer } from "@calcom/features/di/di";

import {
  type AuthGoogleCalendarService,
  moduleLoader as authGoogleCalendarServiceModuleLoader,
} from "./AuthGoogleCalendarService.module";

const authGoogleCalendarServiceContainer = createContainer();

export function getAuthGoogleCalendarService(): AuthGoogleCalendarService {
  authGoogleCalendarServiceModuleLoader.loadModule(authGoogleCalendarServiceContainer);
  return authGoogleCalendarServiceContainer.get<AuthGoogleCalendarService>(
    authGoogleCalendarServiceModuleLoader.token
  );
}
