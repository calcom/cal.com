import { BookingEmailAndSmsTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader, type Container } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { NotificationTaskerPreferenceProxy } from "@calcom/features/notifications/tasker/NotificationTaskerPreferenceProxy";
import { moduleLoader as notificationPreferenceServiceModule } from "@calcom/features/notifications/di/modules/NotificationPreferenceService";
import { NOTIFICATION_DI_TOKENS } from "@calcom/features/notifications/di/tokens";
import type { NotificationPreferenceService } from "@calcom/features/notifications/services/NotificationPreferenceService";

import { moduleLoader as BookingEmailAndSmsSyncTasker } from "./BookingEmailAndSmsSyncTasker.module";
import { moduleLoader as BookingEmailAndSmsTriggerTasker } from "./BookingEmailAndSmsTriggerDevTasker.module";
import { BOOKING_EMAIL_SMS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_TASKER;
const moduleToken = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_TASKER_MODULE;

const realTaskerToken = Symbol("BookingEmailAndSmsTaskerReal");

const realTaskerLoadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token: realTaskerToken,
  classs: BookingEmailAndSmsTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: BookingEmailAndSmsTriggerTasker,
    syncTasker: BookingEmailAndSmsSyncTasker,
  },
});

thisModule.bind(token).toFactory((container) => {
  realTaskerLoadModule(container);
  notificationPreferenceServiceModule.loadModule(container);

  const realTasker = container.get<BookingEmailAndSmsTasker>(realTaskerToken);

  try {
    const notificationPreferenceService = container.get<NotificationPreferenceService>(
      NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE
    );
    return new NotificationTaskerPreferenceProxy({
      realTasker,
      notificationPreferenceService,
    });
  } catch {
    return realTasker;
  }
}, "singleton");

const loadModule = (container: Container) => {
  container.load(moduleToken, thisModule);
  realTaskerLoadModule(container);
  notificationPreferenceServiceModule.loadModule(container);
};

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
