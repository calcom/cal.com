import type { CalSdk } from "../../cal";
import { ApiVersion } from "../../types";
import { EndpointHandler } from "../endpoint-handler";

export class Bookings extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("bookings", sdk, ApiVersion.V2);
  }
}
