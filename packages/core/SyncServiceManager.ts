import CloseCom from "@calcom/lib/CloseCom";
import ISyncService, { IContactParams } from "@calcom/lib/SyncService";

const CLOSECOM_API_KEY = process.env.CLOSECOM_API_KEY;

const getSyncServices = (): ISyncService[] => {
  return [new CloseCom(CLOSECOM_API_KEY)];
};

export const updateContact = (data: IContactParams) => {
  const syncServices = getSyncServices();

  return Promise.all(syncServices.map((instance) => instance.contact.update(data)));
};
