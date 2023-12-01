import logger from "@calcom/lib/logger";
import type { MembershipRole } from "@calcom/prisma/enums";

import { safeStringify } from "../safeStringify";
import type { ConsoleUserInfoType, TeamInfoType, WebUserInfoType } from "./ISyncService";
import services from "./services";
import CloseComService from "./services/CloseComService";

const log = logger.getSubLogger({ prefix: [`[[SyncServiceManager] `] });

export const createConsoleUser = async (user: ConsoleUserInfoType | null | undefined) => {
  if (user) {
    log.debug("createConsoleUser", safeStringify({ user }));
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.ready()) {
            if (service.console.user.upsert) {
              await service.console.user.upsert(user);
            } else {
              await service.console.user.create(user);
            }
          }
        })
      );
    } catch (e) {
      log.warn("createConsoleUser", safeStringify({ error: e }));
    }
  } else {
    log.warn("createConsoleUser:noUser", safeStringify({ user }));
  }
};

export const createWebUser = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("createWebUser", safeStringify({ user }));
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.ready()) {
            if (service.web.user.upsert) {
              await service.web.user.upsert(user);
            } else {
              await service.web.user.create(user);
            }
          }
        })
      );
    } catch (e) {
      log.warn("createWebUser", safeStringify({ error: e }));
    }
  } else {
    log.warn("createWebUser:noUser", safeStringify({ user }));
  }
};

export const updateWebUser = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("updateWebUser", safeStringify({ user }));
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.ready()) {
            if (service.web.user.upsert) {
              await service.web.user.upsert(user);
            } else {
              await service.web.user.update(user);
            }
          }
        })
      );
    } catch (e) {
      log.warn("updateWebUser", safeStringify({ error: e }));
    }
  } else {
    log.warn("updateWebUser:noUser", safeStringify({ user }));
  }
};

export const deleteWebUser = async (user: WebUserInfoType | null | undefined) => {
  if (user) {
    log.debug("deleteWebUser", { user });
    try {
      Promise.all(
        services.map(async (serviceClass) => {
          const service = new serviceClass();
          if (service.ready()) {
            await service.web.user.delete(user);
          }
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
      if (closeComService.ready()) {
        await closeComService.web.team.create(team, user, role);
      }
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
      if (closeComService.ready()) {
        await closeComService.web.team.delete(team);
      }
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
      if (closeComService.ready()) {
        await closeComService.web.membership.delete(user);
      }
    } catch (e) {
      log.warn("closeComDeleteTeamMembership", e);
    }
  } else {
    log.warn("closeComDeleteTeamMembership:noUser");
  }
};

export const closeComUpdateTeam = async (prevTeam: TeamInfoType, updatedTeam: TeamInfoType) => {
  if (prevTeam && updatedTeam) {
    try {
      const closeComService = new CloseComService();
      if (closeComService.ready()) {
        await closeComService.web.team.update(prevTeam, updatedTeam);
      }
    } catch (e) {
      log.warn("closeComUpdateTeam", e);
    }
  } else {
    log.warn("closeComUpdateTeam:noPrevTeamOrUpdatedTeam");
  }
};
