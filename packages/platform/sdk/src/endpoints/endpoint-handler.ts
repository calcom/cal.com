import type { CalSdk } from "../cal";

export abstract class EndpointHandler {
  constructor(private readonly key: string, private readonly calSdk: CalSdk) {}
}
