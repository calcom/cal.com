import { User } from "@prisma/client";

import logger from "@calcom/lib/logger";

import services from "./services";

const log = logger.getChildLogger({ prefix: [`[[sync] `] });

export const createConsoleUser = async ({ name, email }: { name: string; email: string }) => {
  try {
    Promise.all(
      services.map(async (serviceClass) => {
        const service = new serviceClass();
        if (service.console.user.upsert) {
          await service.console.user.upsert({
            name,
            email,
            plan: "SELFHOSTED",
          });
        } else {
          await service.console.user.create({
            name,
            email,
            plan: "SELFHOSTED",
          });
        }
      })
    );
  } catch (e) {
    log.warn(`Error in SyncServicemanager (createConsoleUser): ${e}`);
  }
};

export const createWebUser = async (user: User) => {
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
    log.warn(`Error in SyncServicemanager (createWebUser): ${e}`);
  }
};

export const updateWebUser = async (user: User) => {
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
    log.warn(`Error in SyncServicemanager (updateWebUser): ${e}`);
  }
};
