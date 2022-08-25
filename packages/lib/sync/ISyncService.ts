// import { DeploymentType } from "@prisma/admin-client";
import { User } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { default as webPrisma } from "@calcom/prisma";

export type UserInfo = {
  email: string;
  name: string | null;
  id: number;
  username: string | null;
  createdDate: Date;
};

export type TeamInfoType = {
  name: string | undefined | null;
};

export type WebUserInfoType = UserInfo & {
  plan: User["plan"];
};

export type ConsoleUserInfoType = UserInfo & {
  plan: "CLOUD" | "SELFHOSTED"; // DeploymentType;
};

export interface IUserDeletion<T> {
  delete(info: T): Promise<any>;
}

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
    user: (IUserCreation<WebUserInfoType> | IUserUpsertion<WebUserInfoType>) & IUserDeletion<WebUserInfoType>;
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

  async getUserLastBooking(user: { email: string }): Promise<{ booking: { createdAt: Date } | null } | null> {
    return await webPrisma.attendee.findFirst({
      where: {
        email: user.email,
      },
      select: {
        booking: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        booking: {
          createdAt: "desc",
        },
      },
    });
  }
}

export interface ISyncServices {
  new (): ISyncService;
}
