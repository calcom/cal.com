import ISyncService, { IContactParams } from "@calcom/lib/sync/SyncService";

import services from "./services";

const getSyncServices = (): ISyncService[] => {
  return services;
};

export const createContact = (data: IContactParams) => {
  const syncServices = getSyncServices();

  return Promise.all(syncServices.map((instance) => instance.contact.create(data)));
};
