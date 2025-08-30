import type { ISyncServices } from "../ISyncService";
import SendgridService from "./SendgridService";

const services: ISyncServices[] = [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SendgridService as any,
];

export default services;
