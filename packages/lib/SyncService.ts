import { Person } from "@calcom/types/Calendar";

export interface IContactParams {
  person: Person;
  [key: string]: any;
}

export interface IContact {
  create(data: IContactParams): Promise<any>;
  update(data: IContactParams): Promise<any>;
}

export default interface ISyncService {
  contact: IContact;
}
