import type { CalSdk } from "../../cal";
import { EndpointHandler } from "../endpoint-handler";

export class Bookings extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("bookings", sdk);
  }
}
