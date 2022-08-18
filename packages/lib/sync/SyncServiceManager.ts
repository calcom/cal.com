import logger from "@calcom/lib/logger";

import { ConsoleUserInfoType, WebUserInfoType } from "./ISyncService";
import services from "./services";

const log = logger.getChildLogger({ prefix: [`[[SyncServiceManager] `] });

export const createConsoleUser = async (user: ConsoleUserInfoType | null | undefined) => {
  if (user) {
    log.debug("createConsoleUser", { user });
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.console.user.upsert) {
            await service.console.user.upsert(user);
          } else {
            await service.console.user.create(user);
          }
        })
      );
    } catch (e) {
      log.warn("createConsoleUser", e);
    }
  } else {
    log.warn("createConsoleUser:noUser");
  }
};

export const createWebUser = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("createWebUser", { user });
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.web.user.upsert) {
            await service.web.user.upsert(user);
          } else {
            await service.web.user.create(user);
          }
        })
      );
    } catch (e) {
      log.warn("createWebUser", e);
    }
  } else {
    log.warn("createWebUser:noUser");
  }
};

export const updateWebUser = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("updateWebUser", { user });
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.web.user.upsert) {
            await service.web.user.upsert(user);
          } else {
            await service.web.user.update(user);
          }
        })
      );
    } catch (e) {
      log.warn("updateWebUser", e);
    }
  } else {
    log.warn("updateWebUser:noUser");
  }
};

export const deleteWebUser = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("deleteWebUser", { user });
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          await service.web.user.delete(user);
        })
      );
    } catch (e) {
      log.warn("deleteWebUser", e);
    }
  } else {
    log.warn("deleteWebUser:noUser");
  }
};
