import type { AxiosRequestConfig } from "axios";
// eslint-disable-next-line no-restricted-imports
import merge from "lodash/merge";
import { assert } from "ts-essentials";

import type { CalSdk } from "../cal";

export abstract class EndpointHandler {
  protected constructor(private readonly key: string, private readonly calSdk: CalSdk) {}

  withForAtomParam(forAtom: boolean, config?: AxiosRequestConfig<unknown>) {
    if (!forAtom) return config;

    return merge(config, {
      params: {
        for: "atom",
      },
    });
  }

  protected assertAccessToken(methodName: string) {
    assert(
      this.calSdk.secrets().isAccessTokenSet(),
      `Access token must be set to call the ${this.key}/${methodName} function.`
    );
  }

  protected assertClientSecret(methodName: string) {
    assert(
      !!this.calSdk.secrets().getClientSecret(),
      `Client secret must be set to use the ${this.key}/${methodName} function.`
    );
  }
}
