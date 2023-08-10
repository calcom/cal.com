import type { ISyncServices } from "../ISyncService";
import SendgridService from "./SendgridService";

const services: ISyncServices[] = [
  //CloseComService, This service gets a special treatment after deciding it shouldn't get the same treatment as Sendgrid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SendgridService as any,
];

export default services;
