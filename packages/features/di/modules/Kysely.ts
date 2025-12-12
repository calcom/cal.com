import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { kyselyRead, kyselyWrite } from "@calcom/kysely";

export const kyselyModule = createModule();
const readToken = DI_TOKENS.KYSELY_READ_DB;
const writeToken = DI_TOKENS.KYSELY_WRITE_DB;
const moduleToken = DI_TOKENS.KYSELY_MODULE;
kyselyModule.bind(readToken).toFactory(() => kyselyRead, "singleton");
kyselyModule.bind(writeToken).toFactory(() => kyselyWrite, "singleton");

export const moduleLoader = {
  readToken,
  writeToken,
  loadModule: (container: Container) => {
    container.load(moduleToken, kyselyModule);
  },
};
