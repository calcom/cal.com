import ISyncService from "../SyncService";
import CloseComService from "./CloseComService";

const services: ISyncService[] = [new CloseComService()];

export default services;
