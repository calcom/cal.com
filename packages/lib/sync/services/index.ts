import { ISyncServices } from "../ISyncService";
import CloseComService from "./CloseComService";
import SendgridService from "./SendgridService";

const services: ISyncServices[] = [CloseComService, SendgridService];

export default services;
