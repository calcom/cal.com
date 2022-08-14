import { DeploymentType } from "@prisma/admin-client";
import { User } from "@prisma/client";

export type WebUserInfoType = {
  email: string;
  name: string | null;
  id: number;
  username: string | null;
  plan: User["plan"];
};

export type ConsoleUserInfoType = {
  email: string;
  name: string;
  plan: DeploymentType;
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

export default interface ISyncService {
  web: {
    user: IUserCreation<WebUserInfoType> | IUserUpsertion<WebUserInfoType>;
  };
  console: {
    user: IUserCreation<ConsoleUserInfoType> | IUserUpsertion<ConsoleUserInfoType>;
  };
}
