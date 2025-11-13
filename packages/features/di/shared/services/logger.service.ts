import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { Logger } from "tslog";
import { SHARED_TOKENS } from "../shared.tokens";
import { IS_PRODUCTION } from "@calcom/lib/constants";

const thisModule = createModule();
const token = SHARED_TOKENS.LOGGER;
const moduleToken = SHARED_TOKENS.LOGGER_MODULE;
class LoggerService extends Logger<unknown> {
  constructor() {
    super({
      minLevel: 0,
      maskValuesOfKeys: ["password", "passwordConfirmation", "credentials", "credential"],
      prettyLogTimeZone: IS_PRODUCTION ? "UTC" : "local",
      prettyErrorStackTemplate: "  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}", // default
      prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}", // default
      prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}:{{ms}} [{{logLevelName}}] ", // default with exclusion of `{{filePathWithLine}}`
      stylePrettyLogs: !IS_PRODUCTION,
      prettyLogStyles: {
        name: "yellow",
        dateIsoStr: "blue",
      },
      type: IS_PRODUCTION ? "json" : "pretty",
    });
  }
}
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: LoggerService,
  depsMap: {},
});

export const moduleLoader = {
  token,
  loadModule,
};

