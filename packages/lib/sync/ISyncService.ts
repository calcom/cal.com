import { DeploymentType } from "@prisma/admin-client";
import { User } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { default as webPrisma } from "@calcom/prisma";

export type WebUserInfoType = {
  email: string;
  name: string | null;
  id: number;
  username: string | null;
  plan: User["plan"];
};

export type ConsoleUserInfoType = {
  id: number;
  email: string;
  name: string | null;
  plan: DeploymentType;
  username: string | null;
};

export interface IUserCreation<T> {
  create(info: T): Promise<any>;
  update(info: T): Promise<any>;
  upsert?: never;
}

export interface IUserUpsertion<T> {
  create?: never;
  update?: never;
  upsert(info: T): Promise<any>;
}

export interface ISyncService {
  web: {
    user: IUserCreation<WebUserInfoType> | IUserUpsertion<WebUserInfoType>;
  };
  console: {
    user: IUserCreation<ConsoleUserInfoType> | IUserUpsertion<ConsoleUserInfoType>;
  };
}

export default class SyncServiceCore {
  protected serviceName: string;
  protected service: any;
  protected log: typeof logger;

  constructor(serviceName: string, service: any, log: typeof logger) {
    this.serviceName = serviceName;
    this.service = service;
    this.log = log;
  }

  async getUserLastBooking(user: { id: number }): Promise<{ createdAt: Date } | null> {
    return await webPrisma.booking.findFirst({
      where: { id: user.id },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export interface ISyncServices {
  new (): ISyncService;
}
