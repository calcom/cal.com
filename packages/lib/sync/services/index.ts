import ISyncService from "../ISyncService";
import CloseComService from "./CloseComService";

// import SendgridService from "./SendgridService"

const services: ISyncService[] = [
  new CloseComService(),
  // new SendgridServide()
];

export default services;
