import { MembershipRole } from "@prisma/client";

import logger from "@calcom/lib/logger";

import { ConsoleUserInfoType, TeamInfoType, WebUserInfoType } from "./ISyncService";
import services from "./services";
import CloseComService from "./services/CloseComService";

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
    log.warn("createConsoleUser:noUser", { user });
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
    log.warn("createWebUser:noUser", { user });
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
    log.warn("updateWebUser:noUser", { user });
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
    log.warn("deleteWebUser:noUser", { user });
  }
};

export const closeComUpsertTeamUser = async (
  team: TeamInfoType,
  user: WebUserInfoType | null | undefined,
  role: MembershipRole
) => {
  if (user && team && role) {
    log.debug("closeComUpsertTeamUser", { team, user, role });
    try {
      const closeComService = new CloseComService();
      await closeComService.web.team.upsert(team, user, role);
    } catch (e) {
      log.warn("closeComUpsertTeamUser", e);
    }
  } else {
    log.warn("closeComUpsertTeamUser:noTeamOrUserOrRole", { team, user, role });
  }
};

export const closeComDeleteTeam = async (team: TeamInfoType) => {
  if (team) {
    log.debug("closeComDeleteTeamUser", { team });
    try {
      const closeComService = new CloseComService();
      await closeComService.web.team.delete(team);
    } catch (e) {
      log.warn("closeComDeleteTeamUser", e);
    }
  } else {
    log.warn("closeComDeleteTeamUser:noTeam");
  }
};

export const closeComDeleteTeamMembership = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("closeComDeleteTeamMembership", { user });
    try {
      const closeComService = new CloseComService();
      await closeComService.web.membership.delete(user);
    } catch (e) {
      log.warn("closeComDeleteTeamMembership", e);
    }
  } else {
    log.warn("closeComDeleteTeamMembership:noUser");
  }
};
