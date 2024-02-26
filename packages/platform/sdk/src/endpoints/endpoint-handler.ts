import type { CalSdk } from "../cal";
import { ApiVersion } from "../types";

export abstract class EndpointHandler {
  constructor(
    private readonly key: string,
    private readonly calSdk: CalSdk,
    private readonly apiVersion: ApiVersion = ApiVersion.NEUTRAL
  ) {}

  protected createReqUrl(endpoint: string): string {
    return `${this.apiVersion}/${this.key}/${endpoint}`;
  }
}
