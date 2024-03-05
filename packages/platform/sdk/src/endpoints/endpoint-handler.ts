import type { AxiosRequestConfig } from "axios";
// eslint-disable-next-line no-restricted-imports
import merge from "lodash/merge";
import { assert } from "ts-essentials";

import type { CalSdk } from "../cal";

export abstract class EndpointHandler {
  constructor(private readonly key: string, private readonly calSdk: CalSdk) {}

  withForAtom(config?: AxiosRequestConfig<unknown>) {
    return merge(config, {
      params: {
        for: "atom",
      },
    });
  }

  protected assertAccessToken(methodName: string) {
    assert(
      this.calSdk._internalSecrets().isAccessTokenSet(),
      `Access token must be set to call the ${methodName} function.`
    );
  }
}
