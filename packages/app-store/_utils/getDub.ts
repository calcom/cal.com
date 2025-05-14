import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { DUB, DubClass } from "@calcom/types/DubService";

import appStore from "..";

const log = logger.getSubLogger({ prefix: ["DubManager"] });

interface DubApp {
  lib: {
    DubService: DubClass;
  };
}

const isDubService = (x: unknown): x is DubApp =>
  !!x && typeof x === "object" && "lib" in x && typeof x.lib === "object" && !!x.lib && "DubService" in x.lib;

export const getDub = async ({ credential }: { credential: CredentialPayload }): Promise<DUB | null> => {
  if (!credential || !credential.key) return null;

  const as = appStore;
  const dubAppImportFn = appStore["dubco" as keyof typeof appStore];

  if (!dubAppImportFn) {
    log.warn(`dub app not implemented`);
    return null;
  }

  const dubApp = await dubAppImportFn();

  if (!isDubService(dubApp)) {
    log.warn(`dub is not implemented`);
    return null;
  }

  const DubService = dubApp.lib.DubService;
  log.info("Got dubApp", DubService);

  return new DubService(credential);
};
